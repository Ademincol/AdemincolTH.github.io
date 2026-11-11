/* =================================================================
   Ademincol RRHH — Autenticación (Supabase Auth)
   -----------------------------------------------------------------
   - Inicio de sesión con correo y contraseña.
   - Recuperación de contraseña por correo (y enlaces de invitación).
   - Rol del usuario (editor / lector) desde la función SQL rol_actual().
   La seguridad real la aplican las políticas RLS en Supabase
   (ver supabase/auth.sql); ocultar botones aquí es solo comodidad.
   ================================================================= */
(function (window) {
  'use strict';

  var C = window.Ademincol;
  var DB = C.DB;

  // Se lee ANTES de crear el cliente: supabase-js limpia el hash de la URL
  // al procesar los enlaces de recuperación / invitación.
  var initialHash = window.location.hash || '';
  var arrivedFromSetPasswordLink = /type=(recovery|invite)/.test(initialHash);

  var listeners = [];
  var current = { session: null, user: null, role: null };

  function emit(event) {
    listeners.forEach(function (fn) {
      try { fn(event, current); } catch (err) { console.error('Error en listener de Auth:', err); }
    });
  }

  function translateError(err) {
    var msg = (err && err.message) || String(err || '');
    if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
    if (/Email not confirmed/i.test(msg)) return 'El correo aún no está confirmado. Revisa tu bandeja de entrada.';
    if (/rate limit|too many/i.test(msg)) return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
    if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 8 caracteres.';
    if (/same.*password|different from the old/i.test(msg)) return 'La nueva contraseña debe ser distinta de la anterior.';
    if (/Failed to fetch|NetworkError/i.test(msg)) return 'No hay conexión con el servidor. Revisa tu internet.';
    return msg;
  }

  async function loadRole() {
    var res = await DB.client().rpc('rol_actual');
    if (res.error) throw res.error;
    return res.data || null; // 'editor' | 'lector' | null (no autorizado)
  }

  async function applySession(session, event) {
    current.session = session || null;
    current.user = session ? session.user : null;
    current.role = null;
    if (session) {
      try {
        current.role = await loadRole();
      } catch (err) {
        console.error('No se pudo obtener el rol:', err);
        current.role = null;
      }
    }
    emit(event);
  }

  var Auth = {
    /** Registra un listener: fn(evento, {session, user, role}). */
    onChange: function (fn) { listeners.push(fn); },

    get: function () { return current; },

    isEditor: function () { return current.role === 'editor'; },

    /**
     * Inicia el módulo. Emite 'SET_PASSWORD' si el usuario llegó desde un enlace
     * de recuperación/invitación, 'SIGNED_IN' si ya hay sesión, o 'SIGNED_OUT'.
     */
    init: async function () {
      var client = DB.client();
      var pendingSetPassword = arrivedFromSetPasswordLink;

      client.auth.onAuthStateChange(function (event, session) {
        // Los callbacks de supabase-js no deben esperar otras llamadas de Supabase:
        // se difiere el trabajo para evitar bloqueos internos.
        setTimeout(function () {
          if (event === 'PASSWORD_RECOVERY') {
            pendingSetPassword = true;
            current.session = session; current.user = session && session.user;
            emit('SET_PASSWORD');
          } else if (event === 'SIGNED_OUT') {
            applySession(null, 'SIGNED_OUT');
          } else if (event === 'SIGNED_IN' && !pendingSetPassword && !current.session) {
            applySession(session, 'SIGNED_IN');
          }
          // TOKEN_REFRESHED / USER_UPDATED / INITIAL_SESSION: no requieren cambios en la UI.
        }, 0);
      });

      var res = await client.auth.getSession();
      var session = res.data && res.data.session;
      if (pendingSetPassword && session) {
        current.session = session; current.user = session.user;
        emit('SET_PASSWORD');
        return;
      }
      await applySession(session, session ? 'SIGNED_IN' : 'SIGNED_OUT');
    },

    signIn: async function (email, password) {
      var res = await DB.client().auth.signInWithPassword({ email: email.trim(), password: password });
      if (res.error) throw new Error(translateError(res.error));
      await applySession(res.data.session, 'SIGNED_IN');
    },

    signOut: async function () {
      try { await DB.client().auth.signOut(); } catch (err) { console.error(err); }
      await applySession(null, 'SIGNED_OUT');
    },

    sendPasswordReset: async function (email) {
      var redirectTo = window.location.origin + window.location.pathname;
      var res = await DB.client().auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo });
      if (res.error) throw new Error(translateError(res.error));
    },

    /** Define la nueva contraseña (tras un enlace de recuperación o invitación). */
    setPassword: async function (password) {
      var res = await DB.client().auth.updateUser({ password: password });
      if (res.error) throw new Error(translateError(res.error));
      // Limpia el hash de la URL y entra a la app con la sesión ya activa.
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      var s = await DB.client().auth.getSession();
      await applySession(s.data && s.data.session, 'SIGNED_IN');
    }
  };

  window.Ademincol = window.Ademincol || {};
  window.Ademincol.Auth = Auth;

})(window);
