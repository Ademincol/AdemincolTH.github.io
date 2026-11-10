/* =================================================================
   Ademincol RRHH — Exportador de Datos (Excel y Backup JSON)
   ================================================================= */
(function (window) {
  'use strict';

  var C = window.Ademincol;
  var FIELDS = C.FIELDS;
  var Utils = C.Utils;

  var Exporter = {
    exportToExcel: function (records, filename) {
      var cols = ['id'].concat(FIELDS.map(function (f) { return f.key; }));
      var rows = records.map(function (r) {
        var o = {};
        cols.forEach(function (c) {
          o[c] = r[c] === undefined ? '' : r[c];
        });
        return o;
      });

      var ws = XLSX.utils.json_to_sheet(rows, { header: cols });
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Personal');
      XLSX.writeFile(wb, filename);
    },

    exportBackupJSON: function (employees, history, filename) {
      var backupData = {
        app: 'Ademincol RRHH',
        version: '1.0',
        exportedAt: Utils.nowIso(),
        totalEmployees: employees.length,
        totalHistory: history.length,
        employees: employees,
        history: history
      };

      var jsonStr = JSON.stringify(backupData, null, 2);
      var blob = new Blob([jsonStr], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename || ('ademincol_rrhh_backup_' + new Date().toISOString().slice(0, 10) + '.json');
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    },

    readBackupJSON: function (file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) {
          try {
            var data = JSON.parse(e.target.result);
            if (!data || !Array.isArray(data.employees)) {
              return reject(new Error('El archivo no tiene un formato válido de copia de seguridad (falta lista de empleados).'));
            }
            resolve({
              employees: data.employees,
              history: Array.isArray(data.history) ? data.history : []
            });
          } catch (err) {
            reject(new Error('Error al interpretar el archivo JSON: ' + err.message));
          }
        };
        reader.onerror = function (e) {
          reject(new Error('No se pudo leer el archivo seleccionado.'));
        };
        reader.readAsText(file);
      });
    }
  };

  window.Ademincol = window.Ademincol || {};
  window.Ademincol.Exporter = Exporter;

})(window);

