/* =================================================================
   Ademincol RRHH — Importador de Archivos Excel / CSV
   ================================================================= */
(function (window) {
  'use strict';

  var C = window.Ademincol;
  var Utils = C.Utils;
  var FIELDS = C.FIELDS;
  var Validate = C.Validate;

  var SYNONYMS = {
    nombre: ['NOMBRE', 'NOMBRECOMPLETO', 'EMPLEADO', 'TRABAJADOR'],
    empresa: ['EMPRESA'],
    estado: ['ESTADO', 'ESTADODELTRABAJADOR', 'ESTADOACTUAL'],
    sexo: ['SEXO', 'GENERO'],
    categoria: ['CATEGORIA'],
    area: ['AREA', 'AREADEPARTAMENTO', 'DEPARTAMENTO'],
    cargo: ['CARGO'],
    ciudad: ['CIUDAD', 'CIUDADCONTRATACION'],
    cedula: ['CEDULA', 'CC', 'NUMERODECEDULA', 'IDENTIFICACION'],
    fecha_exp_cedula: ['FECHAEXPCEDULA', 'FECHAEXPEDICIONCEDULA'],
    lugar_exp_cedula: ['LUGAREXPCEDULA', 'LUGAREXPEDICIONCEDULA'],
    grupo_sanguineo: ['GRUPOSANGUINEO', 'RH'],
    estado_civil: ['ESTADOCIVIL'],
    ciudad_nacimiento: ['CIUDADNACIMIENTO'],
    fecha_nacimiento: ['FECHANACIMIENTO', 'FECHADENACIMIENTO'],
    telefono: ['TELEFONO', 'CELULAR'],
    correo_personal: ['CORREOPERSONAL', 'EMAILPERSONAL'],
    correo_corporativo: ['CORREOCORPORATIVO', 'CORREOELECTRONICOCORPORATIVO', 'EMAILCORPORATIVO'],
    direccion: ['DIRECCION'],
    barrio: ['BARRIO'],
    ciudad_residencia: ['CIUDADRESIDENCIA'],
    contacto_emergencia_nombre: ['CONTACTOEMERGENCIANOMBRE', 'NOMBRECONTACTOEMERGENCIA'],
    contacto_emergencia_parentesco: ['CONTACTOEMERGENCIAPARENTESCO', 'PARENTESCO'],
    contacto_emergencia_telefono: ['CONTACTOEMERGENCIATELEFONO', 'TELEFONOEMERGENCIA'],
    area_trabajo: ['AREADETRABAJO'],
    lugar_trabajo: ['LUGARDETRABAJO'],
    tipo_contrato_inicial: ['TIPODECONTRATOINICIAL'],
    tipo_contrato: ['TIPODECONTRATO', 'TIPODECONTRATOACTUAL'],
    fecha_inicio: ['FECHADEINICIO', 'FECHAINICIO'],
    fecha_cambio_modalidad: ['CAMBIODEMODALIDAD', 'FECHACAMBIOMODALIDAD'],
    fecha_retiro: ['FECHARETIRO', 'FECHARETIRODEFINITIVA'],
    nivel_escolaridad: ['NIVELDEESCOLARIDAD'],
    profesion: ['PROFESION'],
    fecha_grado: ['FECHADEGRADO'],
    nombre_posgrado: ['NOMBREPOSGRADO', 'POSGRADO'],
    fecha_posgrado: ['FECHAPOSGRADO'],
    matricula_profesional: ['MATRICULAPROFESIONAL'],
    num_matricula_profesional: ['NMATRICULAPROFESIONAL', 'NUMEROMATRICULAPROFESIONAL'],
    fecha_exp_mp: ['FECHAEXPMATRICULA'],
    lso: ['LSO'],
    num_resolucion_lso: ['NRESOLUCIONLSO'],
    fecha_resolucion_lso: ['FECHARESOLUCIONLSO'],
    licencia_conduccion: ['LICENCIADECONDUCCION'],
    categoria_licencia_conduccion: ['CATEGORIALICENCIA'],
    banco: ['BANCO'],
    cuenta: ['CUENTA'],
    arl: ['ARL'],
    eps: ['EPS'],
    fondo_pension: ['FONDODEPENSION'],
    ccf: ['CCF'],
    fondo_cesantias: ['FONDODECESANTIAS']
  };

  function parseFile(file) {
    return file.arrayBuffer().then(function (buf) {
      var wb = XLSX.read(buf, { type: 'array', cellDates: false });
      var sheetName = wb.SheetNames[0];
      var sheet = wb.Sheets[sheetName];
      var rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      var headers = rows.length ? Object.keys(rows[0]) : (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] || []);
      return { headers: headers, rows: rows, sheetName: sheetName };
    });
  }

  function suggestMapping(headers) {
    var mapping = {};
    var normHeaders = headers.map(function (h) {
      return { raw: h, norm: Utils.normalize(h) };
    });
    var used = {};

    // Paso 1: Coincidencia exacta normalizada
    FIELDS.forEach(function (f) {
      var candidates = (SYNONYMS[f.key] || []).concat([Utils.normalize(f.label), Utils.normalize(f.key)]);
      var found = normHeaders.find(function (h) {
        return !used[h.raw] && candidates.indexOf(h.norm) !== -1;
      });
      if (found) {
        mapping[f.key] = found.raw;
        used[found.raw] = true;
      }
    });

    // Paso 2: Coincidencia difusa para campos aún no asignados
    FIELDS.forEach(function (f) {
      if (mapping[f.key]) return;
      var candidates = (SYNONYMS[f.key] || []).concat([Utils.normalize(f.label), Utils.normalize(f.key)]);
      var found = normHeaders.find(function (h) {
        return !used[h.raw] && candidates.some(function (c) {
          return h.norm.indexOf(c) !== -1 || c.indexOf(h.norm) !== -1;
        });
      });
      mapping[f.key] = found ? found.raw : '';
      if (found) used[found.raw] = true;
    });

    return mapping;
  }

  function buildPreview(rawRows, mapping, existingEmployees) {
    var byCedula = {}, byNombre = {};
    existingEmployees.forEach(function (e) {
      if (e.cedula) byCedula[String(e.cedula).trim()] = e;
      if (e.nombre) byNombre[Utils.normalize(e.nombre)] = e;
    });

    var toCreate = [], toUpdate = [], duplicates = [], errors = [];
    var seenKeys = {};

    rawRows.forEach(function (raw, idx) {
      var rec = {};
      FIELDS.forEach(function (f) {
        var col = mapping[f.key];
        rec[f.key] = col && raw[col] !== undefined ? String(raw[col]).trim() : '';
      });

      var key = rec.cedula ? ('ced:' + rec.cedula) : (rec.nombre ? ('nom:' + Utils.normalize(rec.nombre)) : '');
      if (!key) {
        errors.push({ row: idx + 2, reason: 'Falta nombre y cédula; no se puede identificar el registro.' });
        return;
      }
      if (seenKeys[key]) {
        duplicates.push({ row: idx + 2, nombre: rec.nombre || '(sin nombre)', reason: 'Mismo registro repetido dentro del archivo.' });
        return;
      }
      seenKeys[key] = true;

      var v = Validate.validateRecord(rec);
      if (!v.valid) {
        errors.push({ row: idx + 2, nombre: rec.nombre || '(sin nombre)', reason: Object.values(v.errors).join(' ') });
        return;
      }

      var existing = (rec.cedula && byCedula[String(rec.cedula).trim()]) || byNombre[Utils.normalize(rec.nombre)];
      if (existing) {
        var changes = [];
        FIELDS.forEach(function (f) {
          if (!mapping[f.key]) return;
          var oldV = existing[f.key] || '';
          var newV = rec[f.key] || '';
          if (String(oldV) !== String(newV)) {
            changes.push({ field: f.key, label: f.label, oldV: oldV, newV: newV });
          }
        });
        if (changes.length) {
          var merged = Object.assign({}, existing);
          changes.forEach(function (c) { merged[c.field] = c.newV; });
          toUpdate.push({ id: existing.id, nombre: rec.nombre, changes: changes, merged: merged });
        }
      } else {
        rec.id = Utils.uid();
        toCreate.push(rec);
      }
    });

    return {
      toCreate: toCreate,
      toUpdate: toUpdate,
      duplicates: duplicates,
      errors: errors,
      totalRows: rawRows.length
    };
  }

  var Importer = {
    parseFile: parseFile,
    suggestMapping: suggestMapping,
    buildPreview: buildPreview
  };

  window.Ademincol = window.Ademincol || {};
  window.Ademincol.Importer = Importer;

})(window);

