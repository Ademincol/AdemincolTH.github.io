/* =================================================================
   Ademincol RRHH — Aplicación Principal y Controlador UI
   ================================================================= */
(function (window) {
  'use strict';

  var C = window.Ademincol;
  var Utils = C.Utils;
  var GROUPS = C.GROUPS;
  var FIELDS = C.FIELDS;
  var FIELD_BY_KEY = C.FIELD_BY_KEY;
  var CATALOG_FIELDS = C.CATALOG_FIELDS;
  var FILTER_FIELDS = C.FILTER_FIELDS;
  var FILTER_LABELS = C.FILTER_LABELS;
  var emptyRecord = C.emptyRecord;
  var Validate = C.Validate;
  var DB = C.DB;
  var Store = C.Store;
  var Charts = C.Charts;
  var Importer = C.Importer;
  var Exporter = C.Exporter;

  /* ---------------- Toasts ---------------- */
  function toast(msg, type) {
    var c = document.getElementById('toast-container');
    if (!c) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function () { el.remove(); }, 4200);
  }

  // El historial es secundario: si falla, se avisa pero no se interrumpe la operación.
  function historyError(err) {
    console.error('No se pudo guardar el historial:', err);
    toast('El cambio se guardó, pero el historial no: ' + (err && err.message ? err.message : err), 'error');
  }

  /* ---------------- Modal Helpers ---------------- */
  var Modal = {
    open: function (title, bodyHtml, footButtons) {
      var titleEl = document.getElementById('modal-title');
      var bodyEl = document.getElementById('modal-body');
      var footEl = document.getElementById('modal-foot');
      var overlay = document.getElementById('modal-overlay');

      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.innerHTML = bodyHtml;
      if (footEl) {
        footEl.innerHTML = '';
        (footButtons || []).forEach(function (b) {
          var btn = document.createElement('button');
          btn.className = 'btn ' + (b.cls || '');
          btn.textContent = b.label;
          if (b.requires) btn.dataset.requires = b.requires;
          btn.addEventListener('click', b.onClick);
          footEl.appendChild(btn);
        });
      }
      if (overlay) overlay.hidden = false;
    },
    close: function () {
      var overlay = document.getElementById('modal-overlay');
      if (overlay) overlay.hidden = true;
    }
  };

  /* ---------------- Gráficos del dashboard ---------------- */
  function renderCharts(rows) {
    Charts.renderChart('chart-empresa', rows, 'empresa');
    Charts.renderChart('chart-sexo', rows, 'sexo');
    Charts.renderChart('chart-area', rows, 'area');
    Charts.renderChart('chart-tipo', rows, 'tipo_contrato');
    Charts.renderChart('chart-cargo', rows, 'cargo', 10);
  }

  /* ---------------- Gestor de Tema (Claro / Oscuro) ---------------- */
  var Theme = {
    init: function () {
      var saved = localStorage.getItem('ademincol_theme');
      if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
      }
      this.updateBtn();
    },
    toggle: function () {
      var current = document.documentElement.getAttribute('data-theme');
      var isDark = current === 'dark' || (!current && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ademincol_theme', next);
      this.updateBtn();
      renderCharts(Store.get().employees);
    },
    updateBtn: function () {
      var btn = document.getElementById('btn-theme-toggle');
      if (!btn) return;
      var current = document.documentElement.getAttribute('data-theme');
      var isDark = current === 'dark' || (!current && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      btn.innerHTML = isDark ? '☀️ <span class="btn-text">Claro</span>' : '🌙 <span class="btn-text">Oscuro</span>';
      btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
  };

  /* ================================================================
     UI
     ================================================================ */
  var UI = {};

  UI.navigate = function (view) {
    Store.setView(view);
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === view);
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.dataset.view === view);
    });
    var titles = {
      dashboard: 'Dashboard',
      personal: 'Personal',
      busqueda: 'Búsqueda global',
      importar: 'Importar Excel',
      exportar: 'Exportar Excel',
      historial: 'Historial',
      configuracion: 'Configuración'
    };
    var titleEl = document.getElementById('view-title');
    if (titleEl) titleEl.textContent = titles[view] || view;

    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    if (view === 'importar') UI.renderImportStep(1);
    if (view === 'historial') UI.renderHistory(true);
    if (view === 'configuracion') UI.renderCatalogs();
    if (view === 'exportar') UI.updateExportFilteredStatus();
  };

  /* ---- Dashboard ---- */
  UI.renderDashboard = function () {
    var rows = Store.get().employees;
    var total = rows.length;
    var activos = rows.filter(function (r) { return r.estado === 'ACTIVO'; }).length;
    var retirados = rows.filter(function (r) { return r.estado === 'RETIRADO'; }).length;

    var totalEl = document.getElementById('kpi-total');
    var activosEl = document.getElementById('kpi-activos');
    var retiradosEl = document.getElementById('kpi-retirados');
    var pctActEl = document.getElementById('kpi-pct-activos');
    var pctRetEl = document.getElementById('kpi-pct-retirados');
    var totalSub = document.getElementById('kpi-total-sub');
    var headline = document.getElementById('dash-headline');

    if (totalEl) totalEl.textContent = Utils.fmtInt(total);
    if (activosEl) activosEl.textContent = Utils.fmtInt(activos);
    if (retiradosEl) retiradosEl.textContent = Utils.fmtInt(retirados);
    if (pctActEl) pctActEl.textContent = total ? Utils.fmtPct(activos / total * 100) + '% del total' : '—';
    if (pctRetEl) pctRetEl.textContent = total ? Utils.fmtPct(retirados / total * 100) + '% del total' : '—';
    if (totalSub) totalSub.textContent = 'Base completa · ' + Utils.fmtDateTime(Utils.nowIso()).split(',')[0];
    if (headline) {
      headline.textContent = total
        ? ('Ademincol cuenta con ' + Utils.fmtInt(total) + ' personas registradas: ' + Utils.fmtInt(activos) + ' activas y ' + Utils.fmtInt(retirados) + ' retiradas.')
        : 'Aún no hay empleados registrados. Importa un Excel o crea el primer registro desde Personal.';
    }

    renderCharts(rows);
  };

  /* ---- Personal (Filtros, Tabla, Ordenamiento y Paginación) ---- */
  function distinctValues(field) {
    var set = new Set();
    Store.get().employees.forEach(function (r) { set.add(Utils.nz(r[field])); });
    return Array.from(set).sort(function (a, b) { return a.localeCompare(b, 'es'); });
  }

  function populateFilterSelect(id, field, allLabel) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.replaceChildren.apply(sel, [new Option(allLabel, '')].concat(distinctValues(field).map(function (v) {
      return new Option(v, v);
    })));
    sel.value = Store.get().filters[field] || '';
  }

  UI.renderPersonalFilters = function () {
    populateFilterSelect('p-empresa', 'empresa', 'Todas las empresas');
    populateFilterSelect('p-estado', 'estado', 'Todos los estados');
    populateFilterSelect('p-area', 'area', 'Todas las áreas');
    populateFilterSelect('p-categoria', 'categoria', 'Todas las categorías');
    populateFilterSelect('p-ciudad', 'ciudad', 'Todas las ciudades');
    populateFilterSelect('p-tipo', 'tipo_contrato', 'Todos los tipos de contrato');

    var f = Store.get().filters;
    var active = FILTER_FIELDS.filter(function (k) { return f[k]; }).map(function (k) {
      return FILTER_LABELS[k] + ': ' + f[k];
    });
    var activeNote = document.getElementById('personal-active-filters');
    if (activeNote) {
      activeNote.textContent = active.length ? ('Filtrando por ' + active.join(' · ')) : '';
    }
  };

  UI.renderPersonalTable = function () {
    var paged = Store.getPaged();
    var tbody = document.getElementById('personal-tbody');
    var countMeta = document.getElementById('personal-count');
    var paginationBar = document.getElementById('personal-pagination');

    // Actualizar encabezados con indicadores de ordenamiento
    var state = Store.get();
    document.querySelectorAll('table.data-table thead th.sortable').forEach(function (th) {
      var field = th.dataset.sort;
      var icon = th.querySelector('.sort-icon');
      if (field === state.sortField) {
        th.classList.toggle('sorted-asc', state.sortOrder === 'asc');
        th.classList.toggle('sorted-desc', state.sortOrder === 'desc');
        if (icon) icon.textContent = state.sortOrder === 'asc' ? '▲' : '▼';
      } else {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (icon) icon.textContent = '⇅';
      }
    });

    if (!tbody) return;

    if (!paged.items.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No hay registros que coincidan con la búsqueda o los filtros.</td></tr>';
    } else {
      tbody.innerHTML = paged.items.map(function (r) {
        return '<tr data-id="' + r.id + '">' +
          '<td>' + Utils.escapeHtml(r.nombre || '') + '</td>' +
          '<td>' + Utils.escapeHtml(Utils.nz(r.empresa)) + '</td>' +
          '<td><span class="badge ' + (r.estado === 'ACTIVO' ? 'ok' : 'bad') + '"><span class="dot ' + (r.estado === 'ACTIVO' ? 'ok' : 'bad') + '"></span>' + Utils.escapeHtml(r.estado || '') + '</span></td>' +
          '<td>' + Utils.escapeHtml(Utils.nz(r.cargo)) + '</td>' +
          '<td>' + Utils.escapeHtml(Utils.nz(r.area)) + '</td>' +
          '<td>' + Utils.escapeHtml(Utils.nz(r.ciudad)) + '</td>' +
          '<td>' + Utils.escapeHtml(Utils.nz(r.tipo_contrato)) + '</td>' +
          '<td class="cell-actions">' +
          '<div class="action-btn-group">' +
          '<button class="btn btn-sm btn-action-view" data-act="view" title="Ver perfil">Ver</button>' +
          '<button class="btn btn-sm btn-action-edit" data-act="edit" data-requires="editor" title="Editar empleado">Editar</button>' +
          '<button class="btn btn-sm btn-action-del" data-act="del" data-requires="editor" title="Eliminar empleado">Eliminar</button>' +
          '</div>' +
          '</td></tr>';
      }).join('');
    }

    if (countMeta) {
      countMeta.textContent = 'Encontrados ' + Utils.fmtInt(paged.total) + ' de ' + Utils.fmtInt(state.employees.length) + ' personas.';
    }

    // Renderizar barra de paginación
    if (paginationBar) {
      if (paged.total === 0) {
        paginationBar.innerHTML = '';
        return;
      }

      var fromIdx = paged.pageSize > 0 ? (paged.page - 1) * paged.pageSize + 1 : 1;
      var toIdx = paged.pageSize > 0 ? Math.min(paged.page * paged.pageSize, paged.total) : paged.total;

      paginationBar.innerHTML =
        '<div class="pagination-info">' +
          'Mostrando <b>' + Utils.fmtInt(fromIdx) + '</b> - <b>' + Utils.fmtInt(toIdx) + '</b> de <b>' + Utils.fmtInt(paged.total) + '</b> registros (Pág. ' + paged.page + ' de ' + paged.totalPages + ')' +
        '</div>' +
        '<div class="pagination-controls">' +
          '<label for="p-page-size" style="margin:0; font-size:.8rem;">Filas:</label>' +
          '<select id="p-page-size">' +
            '<option value="15"' + (paged.pageSize === 15 ? ' selected' : '') + '>15</option>' +
            '<option value="25"' + (paged.pageSize === 25 ? ' selected' : '') + '>25</option>' +
            '<option value="50"' + (paged.pageSize === 50 ? ' selected' : '') + '>50</option>' +
            '<option value="100"' + (paged.pageSize === 100 ? ' selected' : '') + '>100</option>' +
            '<option value="0"' + (paged.pageSize === 0 ? ' selected' : '') + '>Todas</option>' +
          '</select>' +
          '<button class="btn btn-sm" id="pg-first"' + (paged.page <= 1 ? ' disabled' : '') + ' title="Primera página">«</button>' +
          '<button class="btn btn-sm" id="pg-prev"' + (paged.page <= 1 ? ' disabled' : '') + ' title="Página anterior">‹ Anterior</button>' +
          '<button class="btn btn-sm" id="pg-next"' + (paged.page >= paged.totalPages ? ' disabled' : '') + ' title="Página siguiente">Siguiente ›</button>' +
          '<button class="btn btn-sm" id="pg-last"' + (paged.page >= paged.totalPages ? ' disabled' : '') + ' title="Última página">»</button>' +
        '</div>';

      document.getElementById('p-page-size').addEventListener('change', function () {
        Store.setPageSize(this.value);
      });
      document.getElementById('pg-first').addEventListener('click', function () {
        Store.setPage(1);
      });
      document.getElementById('pg-prev').addEventListener('click', function () {
        Store.setPage(paged.page - 1);
      });
      document.getElementById('pg-next').addEventListener('click', function () {
        Store.setPage(paged.page + 1);
      });
      document.getElementById('pg-last').addEventListener('click', function () {
        Store.setPage(paged.totalPages);
      });
    }
  };

  /* ---- Perfil y Edición ---- */
  function detailGroups(r) {
    return GROUPS.map(function (g) {
      return {
        h: g.label,
        fields: FIELDS.filter(function (f) { return f.group === g.key; }).map(function (f) {
          return [f.label, Utils.nz(r[f.key])];
        })
      };
    });
  }

  UI.openProfile = function (id) {
    var r = Store.getById(id);
    if (!r) return;
    var html = '<div class="profile-head">' +
      '<div><div class="profile-name">' + Utils.escapeHtml(r.nombre || '(sin nombre)') + '</div>' +
      '<div class="profile-sub"><span class="badge ' + (r.estado === 'ACTIVO' ? 'ok' : 'bad') + '">' + Utils.escapeHtml(r.estado || '') + '</span> · ' + Utils.escapeHtml(Utils.nz(r.cargo)) + ' · ' + Utils.escapeHtml(Utils.nz(r.area)) + '</div></div></div>';

    detailGroups(r).forEach(function (grp) {
      html += '<div class="form-group"><h4>' + grp.h + '</h4><div class="detail-grid"><div class="detail-group"><dl>' +
        grp.fields.map(function (f) {
          return '<div><dt>' + Utils.escapeHtml(f[0]) + '</dt><dd>' + Utils.escapeHtml(f[1]) + '</dd></div>';
        }).join('') +
        '</dl></div></div></div>';
    });

    Modal.open('Ficha de empleado', html, [
      { label: 'Cerrar', cls: 'btn-ghost', onClick: Modal.close },
      { label: 'Editar', cls: 'btn-primary', requires: 'editor', onClick: function () { Modal.close(); UI.openEditForm(id); } }
    ]);
  };

  function fieldInputHtml(f, value) {
    var id = 'f-' + f.key;
    var v = Utils.escapeHtml(value == null ? '' : value);
    if (f.kind === 'select') {
      return '<select id="' + id + '" data-field="' + f.key + '">' + f.options.map(function (o) {
        return '<option value="' + o + '"' + (o === value ? ' selected' : '') + '>' + o + '</option>';
      }).join('') + '</select>';
    }
    if (f.kind === 'textarea') {
      return '<textarea id="' + id + '" data-field="' + f.key + '">' + v + '</textarea>';
    }
    if (f.kind === 'catalog') {
      var listId = 'dl-' + f.key;
      return '<input id="' + id + '" data-field="' + f.key + '" type="text" value="' + v + '" list="' + listId + '">' +
        '<datalist id="' + listId + '">' + distinctValues(f.key).map(function (o) {
          return '<option value="' + Utils.escapeHtml(o) + '">';
        }).join('') + '</datalist>';
    }
    return '<input id="' + id + '" data-field="' + f.key + '" type="text" value="' + v + '">';
  }

  UI.openEditForm = function (id) {
    var isNew = !id;
    var rec = isNew ? emptyRecord() : Object.assign({}, Store.getById(id));
    var html = '<div id="form-notice"></div><div class="form-groups">' +
      GROUPS.map(function (g) {
        return '<div class="form-group"><h4>' + g.label + '</h4><div class="form-grid">' +
          FIELDS.filter(function (f) { return f.group === g.key; }).map(function (f) {
            return '<div class="field"><label for="f-' + f.key + '">' + f.label + (f.required ? ' *' : '') + '</label>' +
              fieldInputHtml(f, rec[f.key]) + '<div class="field-err" id="err-' + f.key + '" hidden></div></div>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';

    Modal.open(isNew ? 'Nuevo empleado' : 'Editar empleado', html, [
      { label: 'Cancelar', cls: 'btn-ghost', onClick: Modal.close },
      {
        label: isNew ? 'Crear empleado' : 'Guardar cambios',
        cls: 'btn-primary',
        onClick: function () {
          var updated = Object.assign({}, rec);
          FIELDS.forEach(function (f) {
            var el = document.getElementById('f-' + f.key);
            if (el) updated[f.key] = el.value;
          });
          UI.saveEmployee(updated, isNew, rec);
        }
      }
    ]);
  };

  UI.saveEmployee = function (updated, isNew, previous) {
    var v = Validate.validateRecord(updated);
    document.querySelectorAll('.field-err').forEach(function (e) { e.hidden = true; e.textContent = ''; });
    var notice = document.getElementById('form-notice');

    if (!v.valid) {
      Object.keys(v.errors).forEach(function (k) {
        var el = document.getElementById('err-' + k);
        if (el) { el.hidden = false; el.textContent = v.errors[k]; }
      });
      if (notice) notice.innerHTML = '<div class="notice bad">Corrige los campos marcados antes de guardar.</div>';
      return;
    }

    var warnKeys = Object.keys(v.warnings);
    if (warnKeys.length && notice && !notice.dataset.confirmed) {
      notice.innerHTML = '<div class="notice warn">' + warnKeys.map(function (k) { return v.warnings[k]; }).join(' ') + ' Puedes guardar de todas formas.</div>';
    }

    var now = Utils.nowIso();
    if (isNew) {
      DB.putEmployee(updated).then(function () {
        Store.upsertEmployee(updated);
        var h = { ts: now, action: 'create', employeeId: updated.id, employeeNombre: updated.nombre, field: null, oldV: null, newV: null };
        DB.addHistory(h).catch(historyError);
        Store.addHistoryLocal(h);
        toast('Empleado creado correctamente.', 'success');
        Modal.close();
      });
    } else {
      var changes = [];
      FIELDS.forEach(function (f) {
        var oldV = previous[f.key] || '', newV = updated[f.key] || '';
        if (String(oldV) !== String(newV)) {
          changes.push({ field: f.key, label: f.label, oldV: oldV, newV: newV });
        }
      });
      DB.putEmployee(updated).then(function () {
        Store.upsertEmployee(updated);
        var entries = changes.map(function (c) {
          return { ts: now, action: 'update', employeeId: updated.id, employeeNombre: updated.nombre, field: c.label, oldV: c.oldV, newV: c.newV };
        });
        if (entries.length) {
          DB.addHistoryMany(entries).catch(historyError);
          Store.addHistoryManyLocal(entries);
        }
        toast(changes.length ? ('Cambios guardados (' + changes.length + ' campo' + (changes.length === 1 ? '' : 's') + ').') : 'Sin cambios para guardar.', 'success');
        Modal.close();
      });
    }
  };

  UI.confirmDelete = function (id) {
    var r = Store.getById(id);
    if (!r) return;
    Modal.open('Eliminar empleado', '<div class="notice bad">¿Eliminar a <b>' + Utils.escapeHtml(r.nombre || '') + '</b>? Esta acción no se puede deshacer, pero quedará registrada en el historial.</div>', [
      { label: 'Cancelar', cls: 'btn-ghost', onClick: Modal.close },
      {
        label: 'Eliminar', cls: 'btn-danger', onClick: function () {
          DB.deleteEmployee(id).then(function () {
            Store.removeEmployee(id);
            var h = { ts: Utils.nowIso(), action: 'delete', employeeId: id, employeeNombre: r.nombre, field: null, oldV: null, newV: null };
            DB.addHistory(h).catch(historyError);
            Store.addHistoryLocal(h);
            toast('Empleado eliminado.', 'success');
            Modal.close();
          });
        }
      }
    ]);
  };

  /* ---- Búsqueda Global ---- */
  UI.renderGlobalSearch = function (q) {
    var el = document.getElementById('global-search-results');
    if (!el) return;
    q = (q || '').trim().toLowerCase();
    if (q.length < 2) {
      el.innerHTML = '<p class="section-desc">Escribe al menos 2 caracteres para buscar.</p>';
      return;
    }
    var fields = ['nombre', 'cedula', 'cargo', 'telefono', 'correo_personal', 'correo_corporativo'];
    var matches = Store.get().employees.filter(function (r) {
      return fields.some(function (f) { return String(r[f] || '').toLowerCase().indexOf(q) !== -1; });
    }).slice(0, 40);

    if (!matches.length) {
      el.innerHTML = '<p class="section-desc">Sin resultados encontrados.</p>';
      return;
    }

    el.innerHTML = matches.map(function (r) {
      return '<div class="panel global-search-item">' +
        '<div class="global-search-content">' +
          '<span class="global-search-name">' + Utils.escapeHtml(r.nombre || '') + '</span>' +
          '<span class="badge ' + (r.estado === 'ACTIVO' ? 'ok' : 'bad') + '"><span class="dot ' + (r.estado === 'ACTIVO' ? 'ok' : 'bad') + '"></span>' + Utils.escapeHtml(r.estado || '') + '</span>' +
          '<span style="color:var(--ink-muted); font-size:.84rem;">· ' + Utils.escapeHtml(Utils.nz(r.cargo)) + (r.empresa ? ' · ' + Utils.escapeHtml(r.empresa) : '') + (r.cedula ? ' · C.C. ' + Utils.escapeHtml(r.cedula) : '') + '</span>' +
        '</div>' +
        '<button class="btn btn-sm btn-primary global-search-btn" data-id="' + r.id + '">Ver ficha</button>' +
      '</div>';
    }).join('');

    el.querySelectorAll('button[data-id]').forEach(function (b) {
      b.addEventListener('click', function () { UI.openProfile(this.dataset.id); });
    });
  };

  /* ---- Historial ---- */
  var HISTORY_PAGE = 60, historyShown = HISTORY_PAGE;
  UI.renderHistory = function (reset) {
    if (reset) historyShown = HISTORY_PAGE;
    var searchEl = document.getElementById('h-search');
    var q = (searchEl ? searchEl.value : '').trim().toLowerCase();
    var all = Store.get().history.filter(function (h) {
      return !q || String(h.employeeNombre || '').toLowerCase().indexOf(q) !== -1;
    });
    var tbody = document.getElementById('history-tbody');
    var slice = all.slice(0, historyShown);
    var actionLabel = {
      create: 'Creación',
      update: 'Edición',
      delete: 'Eliminación',
      import_create: 'Importado (nuevo)',
      import_update: 'Importado (editado)',
      catalog_rename: 'Catálogo renombrado',
      backup_restore: 'Restauración copia'
    };

    if (!tbody) return;

    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Sin movimientos registrados todavía.</td></tr>';
    } else {
      tbody.innerHTML = slice.map(function (h) {
        return '<tr><td>' + Utils.fmtDateTime(h.ts) + '</td><td>' + Utils.escapeHtml(h.employeeNombre || '') + '</td>' +
          '<td><span class="badge muted">' + (actionLabel[h.action] || h.action) + '</span></td>' +
          '<td>' + Utils.escapeHtml(h.field || '—') + '</td><td>' + Utils.escapeHtml(h.oldV == null || h.oldV === '' ? '—' : h.oldV) + '</td>' +
          '<td>' + Utils.escapeHtml(h.newV == null || h.newV === '' ? '—' : h.newV) + '</td></tr>';
      }).join('');
    }

    var moreBtn = document.getElementById('btn-history-more');
    if (moreBtn) moreBtn.style.display = all.length > historyShown ? 'inline-flex' : 'none';
  };

  /* ---- Catálogos y Configuración ---- */
  UI.renderCatalogs = function () {
    var grid = document.getElementById('catalogs-grid');
    if (!grid) return;
    grid.innerHTML = CATALOG_FIELDS.map(function (fk) {
      var f = FIELD_BY_KEY[fk];
      var counts = Charts.countBy(Store.get().employees, fk);
      return '<div class="panel chart-card catalog-card" data-catalog="' + fk + '"><h3>' + f.label + '</h3>' +
        counts.map(function (c) {
          return '<div class="catalog-value-row"><span class="cnt">' + Utils.fmtInt(c.value) + '</span><span style="flex:1;">' + Utils.escapeHtml(c.label) + '</span>' +
            '<button class="btn btn-sm btn-ghost" data-requires="editor" data-rename="' + Utils.escapeHtml(c.label) + '">Renombrar</button></div>';
        }).join('') + '</div>';
    }).join('');

    grid.querySelectorAll('[data-rename]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = this.closest('[data-catalog]');
        var field = card.dataset.catalog;
        var oldVal = this.dataset.rename;
        UI.openRenameCatalog(field, oldVal);
      });
    });
  };

  UI.openRenameCatalog = function (field, oldVal) {
    var label = FIELD_BY_KEY[field].label;
    var html = '<div class="field"><label for="rename-input">Nuevo valor para "' + Utils.escapeHtml(oldVal) + '" en ' + label + '</label>' +
      '<input id="rename-input" type="text" value="' + Utils.escapeHtml(oldVal === 'Sin especificar' ? '' : oldVal) + '"></div>' +
      '<p class="section-desc" style="margin-top:8px;">Esto actualizará el campo "' + label + '" en todos los registros que actualmente tengan "' + Utils.escapeHtml(oldVal) + '".</p>';

    Modal.open('Renombrar valor de catálogo', html, [
      { label: 'Cancelar', cls: 'btn-ghost', onClick: Modal.close },
      {
        label: 'Aplicar a todos los registros',
        cls: 'btn-primary',
        onClick: function () {
          var newVal = document.getElementById('rename-input').value.trim();
          if (!newVal) { toast('Escribe un valor válido.', 'error'); return; }
          var affected = Store.get().employees.filter(function (r) { return Utils.nz(r[field]) === oldVal; });
          if (!affected.length) { Modal.close(); return; }
          var updates = affected.map(function (r) { var u = Object.assign({}, r); u[field] = newVal; return u; });
          var now = Utils.nowIso();
          var entries = affected.map(function (r) {
            return { ts: now, action: 'catalog_rename', employeeId: r.id, employeeNombre: r.nombre, field: label, oldV: oldVal, newV: newVal };
          });
          DB.putEmployees(updates).then(function () {
            Store.upsertMany(updates);
            DB.addHistoryMany(entries).catch(historyError);
            Store.addHistoryManyLocal(entries);
            toast('Se actualizaron ' + updates.length + ' registro(s).', 'success');
            UI.renderCatalogs();
            Modal.close();
          }).catch(function (err) {
            toast('Error al renombrar: ' + (err.message || err), 'error');
          });
        }
      }
    ]);
  };

  /* ---- Módulo de Exportación y Selector de Columnas ---- */
  UI.initExportColumns = function () {
    var container = document.getElementById('export-columns-container');
    if (!container) return;

    var customLabels = Ademincol.CUSTOM_LABELS || {};
    var initialKeys = ['nombre', 'cedula', 'empresa', 'estado', 'cargo', 'area', 'ciudad', 'tipo_contrato'];
    var remainingFields = FIELDS.filter(function (f) {
      return initialKeys.indexOf(f.key) === -1;
    });

    var exportFields = [
      { key: 'nombre', label: customLabels.nombre || 'Apellidos y Nombre' },
      { key: 'cedula', label: customLabels.cedula || 'Cédula' },
      { key: 'empresa', label: customLabels.empresa || 'Empresa' },
      { key: 'estado', label: customLabels.estado || 'Estado del trabajador' },
      { key: 'cargo', label: customLabels.cargo || 'Cargo' },
      { key: 'area', label: customLabels.area || 'Área' },
      { key: 'ciudad', label: customLabels.ciudad || 'Ciudad' },
      { key: 'tipo_contrato', label: customLabels.tipo_contrato || 'Tipo de contrato' }
    ];

    remainingFields.forEach(function (f) {
      exportFields.push({
        key: f.key,
        label: customLabels[f.key] || f.label
      });
    });

    container.innerHTML = exportFields.map(function (f) {
      return '<label class="col-checkbox-item" title="' + Utils.escapeHtml(f.label) + '">' +
        '<input type="checkbox" value="' + f.key + '" checked>' +
        '<span class="col-checkbox-label">' + Utils.escapeHtml(f.label) + '</span>' +
      '</label>';
    }).join('');

    function updateColsCount() {
      var allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
      var checked = container.querySelectorAll('input[type="checkbox"]:checked');
      var badge = document.getElementById('export-cols-count');
      if (badge) {
        badge.textContent = '(' + checked.length + ' de ' + allCheckboxes.length + ' seleccionadas)';
      }
    }

    container.addEventListener('change', updateColsCount);

    var btnAll = document.getElementById('btn-cols-all');
    if (btnAll) {
      btnAll.addEventListener('click', function () {
        container.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          cb.checked = true;
        });
        updateColsCount();
      });
    }

    var btnNone = document.getElementById('btn-cols-none');
    if (btnNone) {
      btnNone.addEventListener('click', function () {
        container.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          cb.checked = false;
        });
        updateColsCount();
      });
    }

    var btnBasic = document.getElementById('btn-cols-basic');
    if (btnBasic) {
      var basicKeys = ['nombre', 'cedula', 'empresa', 'estado', 'cargo', 'area', 'ciudad', 'tipo_contrato', 'telefono', 'correo_corporativo'];
      btnBasic.addEventListener('click', function () {
        container.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          cb.checked = basicKeys.indexOf(cb.value) !== -1;
        });
        updateColsCount();
      });
    }

    updateColsCount();
  };

  UI.updateExportFilteredStatus = function () {
    var statusEl = document.getElementById('export-filtered-status');
    var descEl = document.getElementById('export-filtered-desc');
    var rows = Store.getFiltered();
    var total = Store.get().employees.length;

    var activeFilters = [];
    var state = Store.get();
    if (state.search) activeFilters.push('Búsqueda: "' + state.search + '"');
    FILTER_FIELDS.forEach(function (k) {
      if (state.filters[k]) activeFilters.push(FILTER_LABELS[k] + ': ' + state.filters[k]);
    });

    if (descEl) {
      if (activeFilters.length > 0) {
        descEl.textContent = 'Filtros activos de Personal: ' + activeFilters.join(' · ');
      } else {
        descEl.textContent = 'Sin filtros activos en Personal: se exportará la totalidad de registros con las columnas seleccionadas.';
      }
    }

    if (statusEl) {
      statusEl.textContent = Utils.fmtInt(rows.length) + ' de ' + Utils.fmtInt(total) + ' registros coinciden para exportar.';
    }
  };

  /* ---- Copias de Seguridad (Backup y Restore) ---- */
  UI.backupDownload = function () {
    var employees = Store.get().employees;
    var history = Store.get().history;
    Exporter.exportBackupJSON(employees, history);
    toast('Copia de seguridad generada y descargada.', 'success');
  };

  UI.backupRestore = function (file) {
    Exporter.readBackupJSON(file).then(function (res) {
      Modal.open('Restaurar copia de seguridad',
        '<div class="notice warn">Se han detectado <b>' + Utils.fmtInt(res.employees.length) + '</b> registros de empleados y <b>' + Utils.fmtInt(res.history.length) + '</b> movimientos en la copia.<br><br>¿Deseas <b>reemplazar</b> la base de datos actual con este respaldo?</div>',
        [
          { label: 'Cancelar', cls: 'btn-ghost', onClick: Modal.close },
          {
            label: 'Sí, restaurar datos',
            cls: 'btn-danger',
            onClick: function () {
              DB.clearEmployees().then(function () {
                return DB.putEmployees(res.employees);
              }).then(function () {
                if (res.history && res.history.length) {
                  return DB.clearHistory().then(function () {
                    return DB.addHistoryMany(res.history);
                  });
                }
              }).then(function () {
                Store.setEmployees(res.employees);
                Store.setHistory(res.history);
                toast('Base de datos restaurada correctamente.', 'success');
                Modal.close();
                UI.navigate('dashboard');
              }).catch(function (err) {
                toast('Error restaurando la copia: ' + err.message, 'error');
              });
            }
          }
        ]
      );
    }).catch(function (err) {
      toast(err.message, 'error');
    });
  };

  /* ---- Asistente de Importación Excel ---- */
  var importState = { file: null, headers: [], rows: [], mapping: {}, preview: null };
  UI.renderImportStep = function (step) {
    document.querySelectorAll('#import-steps li').forEach(function (li) {
      var n = +li.dataset.step;
      li.classList.toggle('active', n === step);
      li.classList.toggle('done', n < step);
    });
    var body = document.getElementById('import-step-body');
    if (!body) return;

    if (step === 1) {
      body.innerHTML = '<div class="field" style="max-width:420px;"><label for="import-file">Archivo Excel (.xlsx) o CSV</label>' +
        '<input type="file" id="import-file" accept=".xlsx,.xls,.csv"></div>' +
        '<div id="import-file-info" style="margin-top:10px;"></div>' +
        '<div style="margin-top:16px;"><button class="btn btn-primary" id="import-next-1" disabled>Continuar</button></div>';

      document.getElementById('import-file').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        Importer.parseFile(file).then(function (res) {
          importState.file = file;
          importState.headers = res.headers;
          importState.rows = res.rows;
          importState.mapping = Importer.suggestMapping(res.headers);
          document.getElementById('import-file-info').innerHTML = '<div class="notice ok">Se detectaron ' + Utils.fmtInt(res.rows.length) + ' filas y ' + res.headers.length + ' columnas en "' + Utils.escapeHtml(file.name) + '".</div>';
          document.getElementById('import-next-1').disabled = false;
        }).catch(function (err) {
          document.getElementById('import-file-info').innerHTML = '<div class="notice bad">No se pudo leer el archivo: ' + Utils.escapeHtml(err.message || err) + '</div>';
        });
      });
      document.getElementById('import-next-1').addEventListener('click', function () { UI.renderImportStep(2); });
    } else if (step === 2) {
      body.innerHTML = '<p class="section-desc">Verifica que cada campo quede asociado a la columna correcta del archivo. Los campos marcados con * son obligatorios.</p>' +
        '<div id="map-rows">' + FIELDS.map(function (f) {
          return '<div class="map-row"><div>' + f.label + (f.required ? ' <span class="req">*</span>' : '') + '</div>' +
            '<select data-map="' + f.key + '"><option value="">— No importar —</option>' +
            importState.headers.map(function (h) {
              return '<option value="' + Utils.escapeHtml(h) + '"' + (importState.mapping[f.key] === h ? ' selected' : '') + '>' + Utils.escapeHtml(h) + '</option>';
            }).join('') +
            '</select><span></span></div>';
        }).join('') + '</div>' +
        '<div style="margin-top:16px; display:flex; gap:8px;"><button class="btn" id="import-back-2">Atrás</button><button class="btn btn-primary" id="import-next-2">Analizar y continuar</button></div>';

      body.querySelectorAll('[data-map]').forEach(function (sel) {
        sel.addEventListener('change', function () { importState.mapping[this.dataset.map] = this.value; });
      });
      document.getElementById('import-back-2').addEventListener('click', function () { UI.renderImportStep(1); });
      document.getElementById('import-next-2').addEventListener('click', function () {
        if (!importState.mapping.nombre || !importState.mapping.empresa || !importState.mapping.estado) {
          toast('Mapea al menos Nombre, Empresa y Estado antes de continuar.', 'error');
          return;
        }
        importState.preview = Importer.buildPreview(importState.rows, importState.mapping, Store.get().employees);
        UI.renderImportStep(3);
      });
    } else if (step === 3) {
      var p = importState.preview;
      body.innerHTML = '<div class="preview-counts">' +
        '<span class="badge ok">' + p.toCreate.length + ' nuevos</span>' +
        '<span class="badge muted">' + p.toUpdate.length + ' modificados</span>' +
        '<span class="badge warn">' + p.duplicates.length + ' duplicados en archivo</span>' +
        '<span class="badge bad">' + p.errors.length + ' con errores</span>' +
        '</div>' +
        '<div class="preview-section"><h4>Nuevos registros (' + p.toCreate.length + ')</h4><div class="diff-list">' +
        (p.toCreate.length ? p.toCreate.slice(0, 30).map(function (r) {
          return '<div>+ <b>' + Utils.escapeHtml(r.nombre) + '</b> — ' + Utils.escapeHtml(r.empresa) + ' · ' + Utils.escapeHtml(r.estado) + '</div>';
        }).join('') : '<div>No hay registros nuevos.</div>') +
        (p.toCreate.length > 30 ? '<div>… y ' + (p.toCreate.length - 30) + ' más.</div>' : '') + '</div></div>' +
        '<div class="preview-section"><h4>Modificados (' + p.toUpdate.length + ')</h4><div class="diff-list">' +
        (p.toUpdate.length ? p.toUpdate.slice(0, 20).map(function (u) {
          return '<div><b>' + Utils.escapeHtml(u.nombre) + '</b>: ' + u.changes.slice(0, 4).map(function (c) {
            return c.label + ' "' + Utils.escapeHtml(c.oldV) + '" → "' + Utils.escapeHtml(c.newV) + '"';
          }).join(', ') + (u.changes.length > 4 ? ' …' : '') + '</div>';
        }).join('') : '<div>No hay registros modificados.</div>') +
        (p.toUpdate.length > 20 ? '<div>… y ' + (p.toUpdate.length - 20) + ' más.</div>' : '') + '</div></div>' +
        (p.duplicates.length ? '<div class="preview-section"><h4>Duplicados dentro del archivo (' + p.duplicates.length + ')</h4><div class="diff-list">' + p.duplicates.map(function (d) {
          return '<div>Fila ' + d.row + ': ' + Utils.escapeHtml(d.nombre) + ' — ' + d.reason + '</div>';
        }).join('') + '</div></div>' : '') +
        (p.errors.length ? '<div class="preview-section"><h4>Con errores, no se importarán (' + p.errors.length + ')</h4><div class="diff-list">' + p.errors.map(function (d) {
          return '<div>Fila ' + d.row + (d.nombre ? ': ' + Utils.escapeHtml(d.nombre) : '') + ' — ' + Utils.escapeHtml(d.reason) + '</div>';
        }).join('') + '</div></div>' : '') +
        '<div style="margin-top:16px; display:flex; gap:8px;"><button class="btn" id="import-back-3">Atrás</button><button class="btn btn-primary" id="import-next-3"' + ((p.toCreate.length + p.toUpdate.length) ? '' : ' disabled') + '>Confirmar importación</button></div>';

      document.getElementById('import-back-3').addEventListener('click', function () { UI.renderImportStep(2); });
      document.getElementById('import-next-3').addEventListener('click', function () { UI.confirmImport(); });
    } else if (step === 4) {
      body.innerHTML = '<div class="notice ok">Importación aplicada correctamente.</div>' +
        '<div style="margin-top:14px;"><button class="btn btn-primary" id="import-goto-personal">Ir a Personal</button> <button class="btn" id="import-again">Importar otro archivo</button></div>';

      document.getElementById('import-goto-personal').addEventListener('click', function () { UI.navigate('personal'); });
      document.getElementById('import-again').addEventListener('click', function () {
        importState = { file: null, headers: [], rows: [], mapping: {}, preview: null };
        UI.renderImportStep(1);
      });
    }
  };

  UI.confirmImport = function () {
    // Desactivar el botón mientras se procesa la importación
    var btn = document.getElementById('import-next-3');
    if (btn) btn.disabled = true;
    var p = importState.preview, now = Utils.nowIso();
    var newRecords = p.toCreate.slice();
    var updateRecords = p.toUpdate.map(function (u) { return u.merged; });
    var allToSave = newRecords.concat(updateRecords);
    var historyEntries = [];

    newRecords.forEach(function (r) { historyEntries.push({ ts: now, action: 'import_create', employeeId: r.id, employeeNombre: r.nombre, field: null, oldV: null, newV: null }); });
    p.toUpdate.forEach(function (u) {
      u.changes.forEach(function (c) { historyEntries.push({ ts: now, action: 'import_update', employeeId: u.id, employeeNombre: u.nombre, field: c.label, oldV: c.oldV, newV: c.newV }); });
    });

    if (btn) btn.textContent = 'Guardando…';

    DB.putEmployees(allToSave)
      .then(function () {
        // Una sola actualización del Store (antes: un re-render completo por registro).
        Store.upsertMany(allToSave);
        // El historial no debe bloquear la importación: los empleados ya se guardaron.
        var histPromise = historyEntries.length ? DB.addHistoryMany(historyEntries) : Promise.resolve();
        return histPromise.then(function () {
          Store.addHistoryManyLocal(historyEntries);
        }, function (err) {
          console.error('No se pudo guardar el historial de la importación:', err);
          toast('Los empleados se guardaron, pero el historial no: ' + (err.message || err), 'error');
        });
      })
      .then(function () {
        toast('Importación completada: ' + newRecords.length + ' nuevos, ' + updateRecords.length + ' actualizados.', 'success');
        UI.renderImportStep(4);
      })
      .catch(function (err) {
        console.error('Error al confirmar importación:', err);
        toast('Error al confirmar importación: ' + (err.message || err), 'error');
      })
      .finally(function () {
        // Reactivar el botón (si sigue en pantalla)
        if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = 'Confirmar importación'; }
      });
  };

  /* ================================================================
     Inicialización de Eventos y Arranque
     ================================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    Theme.init();

    // Botón de alternancia de tema
    var themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        Theme.toggle();
      });
    }

    // Botón de menú hamburguesa (Móvil)
    var sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
    var sidebar = document.getElementById('sidebar');
    if (sidebarToggleBtn && sidebar) {
      sidebarToggleBtn.addEventListener('click', function () {
        sidebar.classList.toggle('open');
      });
    }

    // Navegación principal
    var mainNav = document.getElementById('main-nav');
    if (mainNav) {
      mainNav.addEventListener('click', function (e) {
        var btn = e.target.closest('.nav-item');
        if (btn && btn.dataset.view) UI.navigate(btn.dataset.view);
      });
    }

    // Modal cerrar y Escape
    var modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', Modal.close);
    var modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function (e) {
        if (e.target === this) Modal.close();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalOverlay && !modalOverlay.hidden) Modal.close();
    });

    // Filtros de Personal
    ['empresa', 'estado', 'area', 'categoria', 'ciudad', 'tipo_contrato'].forEach(function (f) {
      var elId = 'p-' + (f === 'tipo_contrato' ? 'tipo' : f);
      var el = document.getElementById(elId);
      if (el) {
        el.addEventListener('change', function () {
          var patch = {}; patch[f] = this.value; Store.setFilters(patch);
        });
      }
    });

    var pSearch = document.getElementById('p-search');
    if (pSearch) {
      pSearch.addEventListener('input', Utils.debounce(function () {
        Store.setSearch(this.value);
      }, 150));
    }

    var resetFiltersBtn = document.getElementById('btn-reset-filters');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', function () {
        Store.resetFilters();
        if (pSearch) pSearch.value = '';
        UI.renderPersonalFilters();
      });
    }

    // Ordenamiento por columnas al hacer clic en <th>
    document.querySelectorAll('table.data-table thead th.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var field = this.dataset.sort;
        if (field) Store.setSort(field);
      });
    });

    // Delegación de eventos en tabla de Personal
    var pTbody = document.getElementById('personal-tbody');
    if (pTbody) {
      pTbody.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var tr = e.target.closest('tr[data-id]');
        if (!tr) return;
        var id = tr.dataset.id;
        if (btn.dataset.act === 'view') UI.openProfile(id);
        if (btn.dataset.act === 'edit') UI.openEditForm(id);
        if (btn.dataset.act === 'del') UI.confirmDelete(id);
      });
    }

    // Botón + Nuevo empleado
    var newEmpBtn = document.getElementById('btn-new-employee');
    if (newEmpBtn) {
      newEmpBtn.addEventListener('click', function () { UI.openEditForm(null); });
    }

    // Búsqueda global
    var gSearch = document.getElementById('g-search');
    if (gSearch) {
      gSearch.addEventListener('input', Utils.debounce(function () {
        UI.renderGlobalSearch(this.value);
      }, 150));
    }

    // Historial
    var hSearch = document.getElementById('h-search');
    if (hSearch) {
      hSearch.addEventListener('input', Utils.debounce(function () {
        UI.renderHistory(true);
      }, 150));
    }
    var hMoreBtn = document.getElementById('btn-history-more');
    if (hMoreBtn) {
      hMoreBtn.addEventListener('click', function () {
        historyShown += HISTORY_PAGE;
        UI.renderHistory(false);
      });
    }
    var clearHistBtn = document.getElementById('btn-clear-history');
    if (clearHistBtn) {
      clearHistBtn.addEventListener('click', function () {
        Modal.open('Vaciar historial', '<div class="notice warn">Esto borra permanentemente el historial de cambios registrado hasta ahora. Los datos de los empleados no se modifican.</div>', [
          { label: 'Cancelar', cls: 'btn-ghost', onClick: Modal.close },
          {
            label: 'Vaciar historial', cls: 'btn-danger', onClick: function () {
              DB.clearHistory().then(function () {
                Store.setHistory([]);
                UI.renderHistory(true);
                toast('Historial vaciado.', 'success');
                Modal.close();
              });
            }
          }
        ]);
      });
    }

    // Copias de seguridad (Backup / Restore)
    var btnBackupDownload = document.getElementById('btn-backup-download');
    if (btnBackupDownload) {
      btnBackupDownload.addEventListener('click', UI.backupDownload);
    }
    var btnBackupRestore = document.getElementById('btn-backup-restore-trigger');
    var backupFileInput = document.getElementById('backup-file-input');
    if (btnBackupRestore && backupFileInput) {
      btnBackupRestore.addEventListener('click', function () {
        backupFileInput.click();
      });
      backupFileInput.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (file) {
          UI.backupRestore(file);
          backupFileInput.value = '';
        }
      });
    }

    // Exportar Excel
    UI.initExportColumns();
    UI.updateExportFilteredStatus();

    var btnExportAll = document.getElementById('btn-export-all');
    if (btnExportAll) {
      btnExportAll.addEventListener('click', function () {
        Exporter.exportToExcel(Store.get().employees, 'ademincol_personal_' + Date.now() + '.xlsx');
        toast('Archivo exportado.', 'success');
      });
    }
    var btnExportFiltered = document.getElementById('btn-export-filtered');
    if (btnExportFiltered) {
      btnExportFiltered.addEventListener('click', function () {
        var checkedBoxes = document.querySelectorAll('#export-columns-container input[type="checkbox"]:checked');
        var selectedKeys = Array.from(checkedBoxes).map(function (cb) { return cb.value; });
        if (!selectedKeys.length) {
          toast('Por favor selecciona al menos una columna para exportar.', 'error');
          return;
        }
        var rows = Store.getFiltered();
        if (!rows.length) {
          toast('No hay registros que coincidan con los filtros actuales.', 'error');
          return;
        }
        Exporter.exportToExcel(rows, 'ademincol_personal_filtrado_' + Date.now() + '.xlsx', selectedKeys);
        toast('Archivo exportado (' + rows.length + ' registros, ' + selectedKeys.length + ' columnas).', 'success');
      });
    }

    // Suscripción a cambios del Store
    Store.subscribe(function (state, what) {
      if (what === 'employees' || what === 'filters' || what === 'sort' || what === 'page') {
        if (what === 'employees' || what === 'filters') {
          UI.renderPersonalFilters();
          UI.updateExportFilteredStatus();
        }
        UI.renderPersonalTable();
      }
      if (what === 'employees') {
        UI.renderDashboard();
      }
      if (state.view === 'configuracion' && what === 'employees') {
        UI.renderCatalogs();
      }
      var footEl = document.getElementById('sidebar-foot');
      if (footEl) {
        footEl.textContent = Utils.fmtInt(state.employees.length) + ' empleados · ' + Utils.fmtInt(state.history.length) + ' movimientos';
      }
    });

    /* ---- Arranque (Boot) ---- */
    AuthUI.bind();
    Auth.onChange(AuthUI.handle);
    Auth.init().catch(function (err) {
      console.error(err);
      AuthUI.showForm('login');
      AuthUI.msg('auth-login-msg', 'No se pudo verificar la sesión: ' + (err && err.message ? err.message : err));
    });

  });

  /* ================================================================
     Autenticación: pantallas de acceso y carga de datos
     ================================================================ */
  var Auth = C.Auth;
  var dataLoaded = false;

  // Carga los datos desde Supabase (solo con sesión autorizada).
  // Los datos viven solo en Supabase; si la tabla está vacía, se cargan desde "Importar Excel".
  function loadData() {
    if (dataLoaded) return Promise.resolve();
    dataLoaded = true;
    var foot = document.getElementById('sidebar-foot');
    if (foot) foot.textContent = 'Cargando datos…';
    return Promise.all([DB.getAllEmployees(), DB.getAllHistory()]).then(function (res) {
      Store.setHistory(res[1]);
      // setEmployees notifica al Store, que ya dibuja dashboard, filtros y tabla.
      Store.setEmployees(res[0]);
      UI.navigate('dashboard');
    }).catch(function (err) {
      dataLoaded = false;
      console.error(err);
      toast('Error cargando los datos: ' + (err && err.message ? err.message : err), 'error');
    });
  }

  function clearData() {
    dataLoaded = false;
    Store.setEmployees([]);
    Store.setHistory([]);
    Modal.close();
  }

  var AuthUI = {
    forms: {
      login: 'auth-login-form',
      reset: 'auth-reset-form',
      setpass: 'auth-setpass-form',
      denied: 'auth-denied'
    },

    showForm: function (name) {
      var loading = document.getElementById('auth-loading');
      if (loading) loading.hidden = true;
      Object.keys(AuthUI.forms).forEach(function (k) {
        var el = document.getElementById(AuthUI.forms[k]);
        if (el) el.hidden = (k !== name);
      });
      var focusId = { login: 'auth-email', reset: 'auth-reset-email', setpass: 'auth-new-pass' }[name];
      if (focusId) setTimeout(function () { var f = document.getElementById(focusId); if (f) f.focus(); }, 0);
    },

    showAuthScreen: function (formName) {
      document.getElementById('app').hidden = true;
      document.getElementById('auth-screen').hidden = false;
      AuthUI.showForm(formName);
    },

    showApp: function (state) {
      document.getElementById('auth-screen').hidden = true;
      document.getElementById('app').hidden = false;
      document.body.classList.toggle('role-lector', state.role !== 'editor');
      document.body.classList.toggle('role-editor', state.role === 'editor');
      var chip = document.getElementById('user-chip');
      if (chip) {
        var email = (state.user && state.user.email) || '';
        chip.title = email;
        chip.innerHTML = Utils.escapeHtml(email) + '<span class="role">' + (state.role === 'editor' ? 'Editor' : 'Lectura') + '</span>';
      }
      // Un lector que estaba en una vista de edición vuelve al dashboard.
      if (state.role !== 'editor' && Store.get().view === 'importar') UI.navigate('dashboard');
    },

    msg: function (id, text, ok) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = text || '';
      el.classList.toggle('ok', !!ok);
    },

    busy: function (form, isBusy, label) {
      var btn = form.querySelector('.auth-submit');
      if (!btn) return;
      if (!btn.dataset.label) btn.dataset.label = btn.textContent;
      btn.disabled = isBusy;
      btn.textContent = isBusy ? label : btn.dataset.label;
    },

    // Reacciona a los cambios de sesión emitidos por js/auth.js
    handle: function (event, state) {
      if (event === 'SET_PASSWORD') {
        AuthUI.showAuthScreen('setpass');
        return;
      }
      if (!state.session) {
        clearData();
        AuthUI.showAuthScreen('login');
        return;
      }
      if (!state.role) {
        clearData();
        var e = document.getElementById('auth-denied-email');
        if (e) e.textContent = (state.user && state.user.email) || '';
        AuthUI.showAuthScreen('denied');
        return;
      }
      AuthUI.showApp(state);
      loadData();
    },

    bind: function () {
      var loginForm = document.getElementById('auth-login-form');
      var resetForm = document.getElementById('auth-reset-form');
      var setpassForm = document.getElementById('auth-setpass-form');

      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('auth-email').value;
        var pass = document.getElementById('auth-password').value;
        if (!email || !pass) { AuthUI.msg('auth-login-msg', 'Escribe tu correo y tu contraseña.'); return; }
        AuthUI.msg('auth-login-msg', '');
        AuthUI.busy(loginForm, true, 'Entrando…');
        Auth.signIn(email, pass).then(function () {
          document.getElementById('auth-password').value = '';
        }).catch(function (err) {
          AuthUI.msg('auth-login-msg', err.message);
        }).finally(function () {
          AuthUI.busy(loginForm, false);
        });
      });

      document.getElementById('auth-show-reset').addEventListener('click', function () {
        document.getElementById('auth-reset-email').value = document.getElementById('auth-email').value;
        AuthUI.msg('auth-reset-msg', '');
        AuthUI.showForm('reset');
      });
      document.getElementById('auth-back-login').addEventListener('click', function () {
        AuthUI.showForm('login');
      });

      resetForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('auth-reset-email').value;
        if (!email) { AuthUI.msg('auth-reset-msg', 'Escribe tu correo.'); return; }
        AuthUI.busy(resetForm, true, 'Enviando…');
        Auth.sendPasswordReset(email).then(function () {
          // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
          AuthUI.msg('auth-reset-msg', 'Si el correo está registrado, recibirás un enlace en unos minutos.', true);
        }).catch(function (err) {
          AuthUI.msg('auth-reset-msg', err.message);
        }).finally(function () {
          AuthUI.busy(resetForm, false);
        });
      });

      setpassForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var p1 = document.getElementById('auth-new-pass').value;
        var p2 = document.getElementById('auth-new-pass2').value;
        if (p1.length < 8) { AuthUI.msg('auth-setpass-msg', 'La contraseña debe tener al menos 8 caracteres.'); return; }
        if (p1 !== p2) { AuthUI.msg('auth-setpass-msg', 'Las contraseñas no coinciden.'); return; }
        AuthUI.busy(setpassForm, true, 'Guardando…');
        Auth.setPassword(p1).then(function () {
          setpassForm.reset();
          toast('Contraseña actualizada.', 'success');
        }).catch(function (err) {
          AuthUI.msg('auth-setpass-msg', err.message);
        }).finally(function () {
          AuthUI.busy(setpassForm, false);
        });
      });

      document.getElementById('auth-denied-logout').addEventListener('click', function () { Auth.signOut(); });
      document.getElementById('btn-logout').addEventListener('click', function () { Auth.signOut(); });
    }
  };

  window.Ademincol = window.Ademincol || {};
  window.Ademincol.UI = UI;

})(window);

