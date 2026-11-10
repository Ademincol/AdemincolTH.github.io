/* =================================================================
   Ademincol RRHH — Configuración, Esquema y Utilidades
   ================================================================= */
(function (window) {
  'use strict';

  var Utils = {
    uid: function () {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    },
    fmtInt: d3.format(',d'),
    fmtPct: d3.format('.0f'),
    nz: function (x) { return (x === null || x === undefined || x === '') ? 'Sin especificar' : x; },
    nowIso: function () { return new Date().toISOString(); },
    fmtDateTime: function (iso) {
      try {
        var d = new Date(iso);
        return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch (e) { return iso; }
    },
    normalize: function (s) {
      return String(s == null ? '' : s).toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]+/g, '');
    },
    debounce: function (fn, ms) {
      var t;
      return function () {
        var args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, ms);
      };
    },
    escapeHtml: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    looksLikeDate: function (s) {
      if (s === null || s === undefined || s === '') return true;
      var str = String(s).trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(str) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str) || /^\d{4}$/.test(str);
    }
  };

  var GROUPS = [
    { key: 'basico', label: 'Información básica' },
    { key: 'identificacion', label: 'Identificación' },
    { key: 'contacto', label: 'Contacto' },
    { key: 'emergencia', label: 'Contacto de emergencia' },
    { key: 'puesto', label: 'Puesto y contrato' },
    { key: 'formacion', label: 'Formación y credenciales' },
    { key: 'financiero', label: 'Afiliaciones y datos financieros' }
  ];

  var FIELDS = [
    { key: 'nombre', label: 'Nombre completo', group: 'basico', required: true, kind: 'text' },
    { key: 'empresa', label: 'Empresa', group: 'basico', required: true, kind: 'catalog' },
    { key: 'estado', label: 'Estado', group: 'basico', required: true, kind: 'select', options: ['ACTIVO', 'RETIRADO'] },
    { key: 'sexo', label: 'Sexo', group: 'basico', kind: 'select', options: ['M', 'F', 'OTRO'] },
    { key: 'categoria', label: 'Categoría', group: 'basico', kind: 'catalog' },
    { key: 'area', label: 'Área / departamento', group: 'basico', kind: 'catalog' },
    { key: 'cargo', label: 'Cargo', group: 'basico', kind: 'catalog' },
    { key: 'ciudad', label: 'Ciudad de contratación', group: 'basico', kind: 'catalog' },

    { key: 'cedula', label: 'Cédula', group: 'identificacion', kind: 'text' },
    { key: 'fecha_exp_cedula', label: 'Fecha exp. cédula', group: 'identificacion', kind: 'text' },
    { key: 'lugar_exp_cedula', label: 'Lugar exp. cédula', group: 'identificacion', kind: 'text' },
    { key: 'grupo_sanguineo', label: 'Grupo sanguíneo y RH', group: 'identificacion', kind: 'text' },
    { key: 'estado_civil', label: 'Estado civil', group: 'identificacion', kind: 'text' },
    { key: 'ciudad_nacimiento', label: 'Ciudad de nacimiento', group: 'identificacion', kind: 'text' },
    { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', group: 'identificacion', kind: 'text' },

    { key: 'telefono', label: 'Teléfono', group: 'contacto', kind: 'text' },
    { key: 'correo_personal', label: 'Correo personal', group: 'contacto', kind: 'text' },
    { key: 'correo_corporativo', label: 'Correo corporativo', group: 'contacto', kind: 'text' },
    { key: 'direccion', label: 'Dirección', group: 'contacto', kind: 'text' },
    { key: 'barrio', label: 'Barrio', group: 'contacto', kind: 'text' },
    { key: 'ciudad_residencia', label: 'Ciudad de residencia', group: 'contacto', kind: 'text' },

    { key: 'contacto_emergencia_nombre', label: 'Nombre', group: 'emergencia', kind: 'text' },
    { key: 'contacto_emergencia_parentesco', label: 'Parentesco', group: 'emergencia', kind: 'text' },
    { key: 'contacto_emergencia_telefono', label: 'Teléfono', group: 'emergencia', kind: 'text' },

    { key: 'area_trabajo', label: 'Área de trabajo', group: 'puesto', kind: 'text' },
    { key: 'lugar_trabajo', label: 'Lugar de trabajo', group: 'puesto', kind: 'text' },
    { key: 'tipo_contrato_inicial', label: 'Tipo de contrato inicial', group: 'puesto', kind: 'catalog' },
    { key: 'tipo_contrato', label: 'Tipo de contrato actual', group: 'puesto', kind: 'catalog' },
    { key: 'fecha_inicio', label: 'Fecha de inicio', group: 'puesto', kind: 'text' },
    { key: 'fecha_cambio_modalidad', label: 'Cambio de modalidad', group: 'puesto', kind: 'text' },
    { key: 'fecha_retiro', label: 'Fecha de retiro', group: 'puesto', kind: 'text' },

    { key: 'nivel_escolaridad', label: 'Nivel de escolaridad', group: 'formacion', kind: 'text' },
    { key: 'profesion', label: 'Profesión', group: 'formacion', kind: 'text' },
    { key: 'fecha_grado', label: 'Fecha de grado', group: 'formacion', kind: 'text' },
    { key: 'nombre_posgrado', label: 'Posgrado', group: 'formacion', kind: 'textarea' },
    { key: 'fecha_posgrado', label: 'Fecha posgrado', group: 'formacion', kind: 'text' },
    { key: 'matricula_profesional', label: 'Matrícula profesional', group: 'formacion', kind: 'text' },
    { key: 'num_matricula_profesional', label: 'N.° matrícula profesional', group: 'formacion', kind: 'text' },
    { key: 'fecha_exp_mp', label: 'Fecha exp. matrícula', group: 'formacion', kind: 'text' },
    { key: 'lso', label: 'LSO', group: 'formacion', kind: 'text' },
    { key: 'num_resolucion_lso', label: 'N.° resolución LSO', group: 'formacion', kind: 'text' },
    { key: 'fecha_resolucion_lso', label: 'Fecha resolución LSO', group: 'formacion', kind: 'text' },
    { key: 'licencia_conduccion', label: 'Licencia de conducción', group: 'formacion', kind: 'text' },
    { key: 'categoria_licencia_conduccion', label: 'Categoría licencia', group: 'formacion', kind: 'text' },

    { key: 'banco', label: 'Banco', group: 'financiero', kind: 'text' },
    { key: 'cuenta', label: 'Cuenta', group: 'financiero', kind: 'text' },
    { key: 'arl', label: 'ARL', group: 'financiero', kind: 'text' },
    { key: 'eps', label: 'EPS', group: 'financiero', kind: 'text' },
    { key: 'fondo_pension', label: 'Fondo de pensión', group: 'financiero', kind: 'text' },
    { key: 'ccf', label: 'CCF', group: 'financiero', kind: 'text' },
    { key: 'fondo_cesantias', label: 'Fondo de cesantías', group: 'financiero', kind: 'text' }
  ];

  var FIELD_BY_KEY = {};
  FIELDS.forEach(function (f) { FIELD_BY_KEY[f.key] = f; });

  var CATALOG_FIELDS = ['empresa', 'categoria', 'area', 'cargo', 'ciudad', 'tipo_contrato', 'tipo_contrato_inicial'];
  var FILTER_FIELDS = ['empresa', 'estado', 'area', 'categoria', 'ciudad', 'tipo_contrato'];
  var FILTER_LABELS = {
    empresa: 'Empresa',
    estado: 'Estado',
    area: 'Área',
    categoria: 'Categoría',
    ciudad: 'Ciudad',
    tipo_contrato: 'Tipo de contrato'
  };

  function emptyRecord() {
    var r = { id: Utils.uid() };
    FIELDS.forEach(function (f) { r[f.key] = ''; });
    return r;
  }

  var Validate = {
    validateRecord: function (rec) {
      var errors = {}, warnings = {};
      if (!rec.nombre || !String(rec.nombre).trim()) errors.nombre = 'El nombre es obligatorio.';
      if (!rec.empresa || !String(rec.empresa).trim()) errors.empresa = 'La empresa es obligatoria.';
      if (!rec.estado || ['ACTIVO', 'RETIRADO'].indexOf(rec.estado) === -1) errors.estado = 'El estado debe ser ACTIVO o RETIRADO.';
      if (rec.estado === 'RETIRADO' && !rec.fecha_retiro) warnings.fecha_retiro = 'Se recomienda registrar la fecha de retiro.';
      if (rec.estado === 'ACTIVO' && rec.fecha_retiro) warnings.fecha_retiro = 'Tiene fecha de retiro pero el estado es ACTIVO; verifica.';
      FIELDS.forEach(function (f) {
        if (f.key.indexOf('fecha_') === 0 && rec[f.key] && !Utils.looksLikeDate(rec[f.key])) {
          warnings[f.key] = 'Formato de fecha inusual; verifica el valor.';
        }
      });
      return { errors: errors, warnings: warnings, valid: Object.keys(errors).length === 0 };
    }
  };

  // Exportar al ámbito global
  window.Ademincol = window.Ademincol || {};
  window.Ademincol.Utils = Utils;
  window.Ademincol.GROUPS = GROUPS;
  window.Ademincol.FIELDS = FIELDS;
  window.Ademincol.FIELD_BY_KEY = FIELD_BY_KEY;
  window.Ademincol.CATALOG_FIELDS = CATALOG_FIELDS;
  window.Ademincol.FILTER_FIELDS = FILTER_FIELDS;
  window.Ademincol.FILTER_LABELS = FILTER_LABELS;
  window.Ademincol.emptyRecord = emptyRecord;
  window.Ademincol.Validate = Validate;

})(window);

