/* =================================================================
   Ademincol RRHH — Estado de la Aplicación (Store reactivo)
   ================================================================= */
(function (window) {
  'use strict';

  var C = window.Ademincol;
  var FILTER_FIELDS = C.FILTER_FIELDS;

  var state = {
    employees: [],
    history: [],
    filters: { empresa: '', estado: '', area: '', categoria: '', ciudad: '', tipo_contrato: '' },
    search: '',
    view: 'dashboard',
    page: 1,
    pageSize: 25,
    sortField: 'nombre',
    sortOrder: 'asc'
  };

  var listeners = [];

  function notify(what) {
    listeners.forEach(function (fn) {
      try {
        fn(state, what);
      } catch (err) {
        console.error('Error in store listener:', err);
      }
    });
  }

  var Store = {
    get: function () {
      return state;
    },

    subscribe: function (fn) {
      listeners.push(fn);
      return function unsubscribe() {
        listeners = listeners.filter(function (l) { return l !== fn; });
      };
    },

    setEmployees: function (list) {
      state.employees = Array.isArray(list) ? list : [];
      notify('employees');
    },

    upsertEmployee: function (rec) {
      var i = state.employees.findIndex(function (e) { return e.id === rec.id; });
      if (i >= 0) {
        state.employees[i] = rec;
      } else {
        state.employees.push(rec);
      }
      notify('employees');
    },

    // Inserta/actualiza muchos registros y notifica UNA sola vez
    // (evita re-renderizar dashboard, filtros y tabla por cada registro).
    upsertMany: function (recs) {
      if (!recs || !recs.length) return;
      var index = new Map();
      state.employees.forEach(function (e, i) { index.set(String(e.id), i); });
      recs.forEach(function (rec) {
        var i = index.get(String(rec.id));
        if (i !== undefined) {
          state.employees[i] = rec;
        } else {
          index.set(String(rec.id), state.employees.length);
          state.employees.push(rec);
        }
      });
      notify('employees');
    },

    addHistoryManyLocal: function (entries) {
      if (!entries || !entries.length) return;
      state.history = entries.slice().reverse().concat(state.history);
      notify('history');
    },

    removeEmployee: function (id) {
      state.employees = state.employees.filter(function (e) { return e.id !== id; });
      notify('employees');
    },

    setHistory: function (list) {
      state.history = Array.isArray(list) ? list : [];
      notify('history');
    },

    addHistoryLocal: function (entry) {
      state.history.unshift(entry);
      notify('history');
    },

    setFilters: function (patch) {
      Object.assign(state.filters, patch);
      state.page = 1;
      notify('filters');
    },

    resetFilters: function () {
      FILTER_FIELDS.forEach(function (f) { state.filters[f] = ''; });
      state.search = '';
      state.page = 1;
      notify('filters');
    },

    setSearch: function (q) {
      state.search = q;
      state.page = 1;
      notify('filters');
    },

    setView: function (v) {
      state.view = v;
      notify('view');
    },

    setSort: function (field) {
      if (state.sortField === field) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = field;
        state.sortOrder = 'asc';
      }
      state.page = 1;
      notify('sort');
    },

    setPage: function (page) {
      state.page = Math.max(1, parseInt(page, 10) || 1);
      notify('page');
    },

    setPageSize: function (size) {
      state.pageSize = parseInt(size, 10) || 0;
      state.page = 1;
      notify('page');
    },

    getById: function (id) {
      return state.employees.find(function (e) { return String(e.id) === String(id); });
    },

    getFiltered: function () {
      var f = state.filters;
      var q = (state.search || '').trim().toLowerCase();

      var list = state.employees.filter(function (r) {
        for (var i = 0; i < FILTER_FIELDS.length; i++) {
          var k = FILTER_FIELDS[i];
          if (f[k] && (r[k] || 'Sin especificar') !== f[k]) return false;
        }
        if (q) {
          var matchName = String(r.nombre || '').toLowerCase().indexOf(q) !== -1;
          var matchCargo = String(r.cargo || '').toLowerCase().indexOf(q) !== -1;
          var matchCedula = String(r.cedula || '').toLowerCase().indexOf(q) !== -1;
          if (!matchName && !matchCargo && !matchCedula) return false;
        }
        return true;
      });

      // Ordenamiento
      var sField = state.sortField;
      var sOrder = state.sortOrder === 'desc' ? -1 : 1;

      if (sField) {
        list.sort(function (a, b) {
          var valA = String(a[sField] || '').trim();
          var valB = String(b[sField] || '').trim();
          return valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' }) * sOrder;
        });
      }

      return list;
    },

    getPaged: function () {
      var filtered = this.getFiltered();
      var total = filtered.length;
      var pageSize = state.pageSize;

      if (!pageSize || pageSize <= 0) {
        return {
          total: total,
          page: 1,
          pageSize: 0,
          totalPages: 1,
          items: filtered
        };
      }

      var totalPages = Math.max(1, Math.ceil(total / pageSize));
      var currentPage = Math.min(Math.max(1, state.page), totalPages);
      var start = (currentPage - 1) * pageSize;
      var items = filtered.slice(start, start + pageSize);

      return {
        total: total,
        page: currentPage,
        pageSize: pageSize,
        totalPages: totalPages,
        items: items
      };
    }
  };

  window.Ademincol = window.Ademincol || {};
  window.Ademincol.Store = Store;

})(window);

