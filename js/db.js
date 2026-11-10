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

  var DB = {
    open: function () {
      try {
        var client = getClient();
        return Promise.resolve(client);
      } catch (err) {
        return Promise.reject(err);
      }
    },

    getAllEmployees: async function () {
      var client = getClient();
      var res = await client.from('empleados').select('*');
      if (res.error) throw res.error;
      return res.data || [];
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
      var client = getClient();
      var res = await client.from('historial').select('*').order('ts', { ascending: false });
      if (res.error) throw res.error;
      return res.data || [];
    },

    addHistory: async function (entry) {
      var client = getClient();
      var res = await client.from('historial').insert(entry);
      if (res.error) throw res.error;
      return res.data;
    },

    addHistoryMany: async function (entries) {
      var client = getClient();
      if (!entries || !entries.length) return [];
      
      var BATCH_SIZE = 100;
      for (var i = 0; i < entries.length; i += BATCH_SIZE) {
        var chunk = entries.slice(i, i + BATCH_SIZE);
        var res = await client.from('historial').insert(chunk);
        if (res.error) throw res.error;
      }
      return entries;
    },

    clearHistory: async function () {
      var client = getClient();
      var res = await client.from('historial').delete().not('id', 'is', null);
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
