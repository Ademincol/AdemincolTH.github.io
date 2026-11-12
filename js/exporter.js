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
      // Build column list (id + defined fields)
      var cols = ['id'].concat(FIELDS.map(function (f) { return f.key; }));
      // Convert records to plain objects matching column order
      var rows = records.map(function (r) {
        var o = {};
        cols.forEach(function (c) {
          o[c] = r[c] === undefined ? '' : r[c];
        });
        return o;
      });

      // Create worksheet from JSON data
      var ws = XLSX.utils.json_to_sheet(rows, { header: cols });

      // Apply header styling (bold, gray background, borders)
      var range = XLSX.utils.decode_range(ws['!ref']);
      for (var C = range.s.c; C <= range.e.c; ++C) {
        var cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellRef]) continue;
        ws[cellRef].s = {
          font: { bold: true, color: { rgb: "000000" } },
          fill: { fgColor: { rgb: "D9D9D9" } },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }

      // Apply alternating row colors (banded rows)
      for (var R = range.s.r + 1; R <= range.e.r; ++R) {
        var fillColor = (R % 2 === 0) ? "F2F9FF" : "FFFFFF";
        for (var C = range.s.c; C <= range.e.c; ++C) {
          var cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) continue;
          ws[cellRef].s = ws[cellRef].s || {};
          ws[cellRef].s.fill = { fgColor: { rgb: fillColor } };
        }
      }

      // Enable autofilter so Excel shows filter dropdowns
      ws['!autofilter'] = { ref: ws['!ref'] };

      // Set column widths for readability
      ws['!cols'] = cols.map(function () { return { wch: 20 }; });

      // Build workbook and trigger download
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

