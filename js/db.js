/* =================================================================
   Ademincol RRHH — Capa de Base de Datos (Supabase Cloud)
   ================================================================= */
(function (window) {
  'use strict';

  // Configuración de Supabase
  var SUPABASE_URL = 'https://rxvfzskzoiauuiljyxmf.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_A7lb8WJgdvVeJF8onfqSbA_aMjbdW2W';

  var supabaseClient = null;

  function getClient() {
    if (!supabaseClient) {
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error('La librería Supabase no se ha cargado correctamente desde el CDN.');
      }
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return supabaseClient;
  }

  // Supabase devuelve como máximo 1000 filas por consulta: se lee por páginas.
  var PAGE_SIZE = 1000;
  async function selectAll(table, orderCol, ascending) {
    var client = getClient();
    var all = [];
    for (var from = 0; ; from += PAGE_SIZE) {
      var q = client.from(table).select('*').range(from, from + PAGE_SIZE - 1);
      if (orderCol) q = q.order(orderCol, { ascending: ascending });
      var res = await q;
      if (res.error) throw res.error;
      var rows = res.data || [];
      all = all.concat(rows);
      if (rows.length < PAGE_SIZE) break;
    }
    return all;
  }

  // Traducción entre el formato del historial en la app (camelCase)
  // y las columnas de la tabla "historial" en Supabase (snake_case).
  // Ver supabase/historial.sql para crear las columnas que falten.
  function historyToRow(e) {
    return {
      ts: e.ts,
      accion: e.action,
      employee_id: e.employeeId == null ? null : String(e.employeeId),
      employee_nombre: e.employeeNombre == null ? null : e.employeeNombre,
      campo: e.field == null ? null : e.field,
      valor_anterior: e.oldV == null ? null : String(e.oldV),
      valor_nuevo: e.newV == null ? null : String(e.newV)
    };
  }

  function historyFromRow(r) {
    return {
      hid: r.hid,
      ts: r.ts,
      action: r.accion,
      employeeId: r.employee_id,
      employeeNombre: r.employee_nombre,
      field: r.campo,
      oldV: r.valor_anterior,
      newV: r.valor_nuevo
    };
  }

  var DB = {
    open: function () {
      try {
        var client = getClient();
        return Promise.resolve(client);
      } catch (err) {
        return Promise.reject(err);
      }
    },

    getAllEmployees: function () {
      return selectAll('empleados', 'id', true);
    },

    putEmployee: async function (rec) {
      var client = getClient();
      var res = await client.from('empleados').upsert(rec);
      if (res.error) throw res.error;
      return res.data;
    },

    putEmployees: async function (recs) {
      var client = getClient();
      if (!recs || !recs.length) return [];
      
      // Enviar en lotes de 100 para evitar límites de tamaño en peticiones HTTP
      var BATCH_SIZE = 100;
      for (var i = 0; i < recs.length; i += BATCH_SIZE) {
        var chunk = recs.slice(i, i + BATCH_SIZE);
        var res = await client.from('empleados').upsert(chunk);
        if (res.error) throw res.error;
      }
      return recs;
    },

    deleteEmployee: async function (id) {
      var client = getClient();
      var res = await client.from('empleados').delete().eq('id', id);
      if (res.error) throw res.error;
      return res.data;
    },

    clearEmployees: async function () {
      var client = getClient();
      var res = await client.from('empleados').delete().not('id', 'is', null);
      if (res.error) throw res.error;
      return res.data;
    },

    getAllHistory: async function () {
      var rows = await selectAll('historial', 'ts', false);
      return rows.map(historyFromRow);
    },

    addHistory: async function (entry) {
      var client = getClient();
      var res = await client.from('historial').insert(historyToRow(entry));
      if (res.error) throw res.error;
      return res.data;
    },

    addHistoryMany: async function (entries) {
      var client = getClient();
      if (!entries || !entries.length) return [];
      
      var BATCH_SIZE = 100;
      for (var i = 0; i < entries.length; i += BATCH_SIZE) {
        var chunk = entries.slice(i, i + BATCH_SIZE).map(historyToRow);
        var res = await client.from('historial').insert(chunk);
        if (res.error) throw res.error;
      }
      return entries;
    },

    clearHistory: async function () {
      var client = getClient();
      // La clave primaria de la tabla historial es "hid", no "id".
      var res = await client.from('historial').delete().not('hid', 'is', null);
      if (res.error) throw res.error;
      return res.data;
    },

    getMeta: async function (key) {
      return undefined;
    },

    setMeta: async function (key, value) {
      return Promise.resolve();
    }
  };

  window.Ademincol = window.Ademincol || {};
  window.Ademincol.DB = DB;

})(window);
