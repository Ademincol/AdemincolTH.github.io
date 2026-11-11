-- =================================================================
-- Ademincol RRHH — Seguridad: usuarios autorizados, roles y RLS
-- Ejecutar en Supabase: SQL Editor → New query → Run.
-- Ejecutar DESPUÉS de supabase/historial.sql.
-- Es seguro ejecutarlo varias veces.
--
-- Roles:
--   editor → ver, crear, editar, eliminar e importar
--   lector → solo ver y exportar
-- Quien no esté en usuarios_autorizados no puede ver nada,
-- aunque tenga cuenta en Supabase Auth.
-- =================================================================

-- 1) Lista de usuarios autorizados ---------------------------------
create table if not exists public.usuarios_autorizados (
  email      text primary key check (email = lower(email)),
  rol        text not null check (rol in ('editor', 'lector')),
  nombre     text,
  creado_en  timestamptz not null default now()
);

-- Solo se administra desde el panel de Supabase (sin políticas = nadie
-- puede leerla ni modificarla desde la app).
alter table public.usuarios_autorizados enable row level security;
revoke all on public.usuarios_autorizados from anon, authenticated;

-- 2) Rol del usuario actual -------------------------------------------
-- security definer: puede leer usuarios_autorizados aunque la tabla
-- no tenga políticas. Devuelve 'editor', 'lector' o null.
create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.rol
    from public.usuarios_autorizados u
   where u.email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

revoke all on function public.rol_actual() from public, anon;
grant execute on function public.rol_actual() to authenticated;

-- 3) Activar RLS y quitar cualquier política anterior ----------------
-- Las políticas se suman (OR): una política vieja tipo "permitir todo"
-- anularía las nuevas, por eso se eliminan todas primero.
alter table public.empleados enable row level security;
alter table public.historial enable row level security;

do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public' and tablename in ('empleados', 'historial')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Sin acceso anónimo en absoluto.
revoke all on public.empleados, public.historial from anon;
grant select, insert, update, delete on public.empleados, public.historial to authenticated;

-- 4) Políticas: empleados ----------------------------------------------
create policy empleados_select on public.empleados
  for select to authenticated
  using (public.rol_actual() in ('editor', 'lector'));

create policy empleados_insert on public.empleados
  for insert to authenticated
  with check (public.rol_actual() = 'editor');

create policy empleados_update on public.empleados
  for update to authenticated
  using (public.rol_actual() = 'editor')
  with check (public.rol_actual() = 'editor');

create policy empleados_delete on public.empleados
  for delete to authenticated
  using (public.rol_actual() = 'editor');

-- 5) Políticas: historial ----------------------------------------------
create policy historial_select on public.historial
  for select to authenticated
  using (public.rol_actual() in ('editor', 'lector'));

create policy historial_insert on public.historial
  for insert to authenticated
  with check (public.rol_actual() = 'editor');

create policy historial_delete on public.historial
  for delete to authenticated
  using (public.rol_actual() = 'editor');
-- (Sin política de UPDATE: el historial no se modifica.)

-- 6) Registrar quién hizo cada cambio (automático) ----------------------
alter table public.historial
  add column if not exists usuario text default (auth.jwt() ->> 'email');

-- Recargar el esquema de la API.
notify pgrst, 'reload schema';

-- =================================================================
-- 7) AUTORIZAR USUARIOS  ← edita y ejecuta esta parte
--    Primero crea la cuenta en Authentication → Users → Add user.
--    Luego agrega su correo aquí (en minúsculas).
-- =================================================================
-- insert into public.usuarios_autorizados (email, rol, nombre) values
--   ('tu.correo@ademincol.com.co', 'editor', 'Tu nombre'),
--   ('consulta@ademincol.com.co',  'lector', 'Usuario de consulta')
-- on conflict (email) do update set rol = excluded.rol, nombre = excluded.nombre;

-- Ver usuarios autorizados:
-- select * from public.usuarios_autorizados order by email;

-- Quitar acceso a alguien:
-- delete from public.usuarios_autorizados where email = 'correo@ademincol.com.co';
