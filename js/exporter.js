/* =================================================================
   Ademincol RRHH — Exportador de Datos (Excel y Backup JSON)
   ================================================================= */
(function (window) {
  'use strict';

  var C = window.Ademincol;
  var FIELDS = C.FIELDS;
  var Utils = C.Utils;

  var Exporter = {
    /**
     * Exporta registros a .xlsx con ExcelJS.
     * Crea una Excel Table (ListObject) con filtros y filas alternas.
     * Descarga mediante FileSaver o fallback con <a>.
     */
    exportToExcel: function (records, filename) {
      var cols = ['id'].concat(FIELDS.map(function (f) { return f.key; }));

      var dataRows = records.map(function (r) {
        var o = {};
        cols.forEach(function (c) { o[c] = r[c] === undefined ? '' : r[c]; });
        return o;
      });

      var EJ = window.ExcelJS;
      var workbook = new EJ.Workbook();
      var ws = workbook.addWorksheet('Personal');

      ws.columns = cols.map(function (c) {
        return { header: c, key: c, width: 20 };
      });

      ws.addRows(dataRows);

      var headerRow = ws.getRow(1);
      headerRow.eachCell({ includeEmpty: true }, function (cell) {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FF000000' } },
          left:   { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right:  { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      ws.addTable({
        name: 'EmployeesTable',
        ref: 'A1',
        headerRow: true,
        style: { theme: 'TableStyleMedium9', showRowStripes: true },
        columns: cols.map(function (c) { return { name: c, filterButton: true }; })
      });

      workbook.xlsx.writeBuffer()
        .then(function (buffer) {
          var blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
          if (window.saveAs) {
            window.saveAs(blob, filename);
          } else {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }, 100);
          }
        })
        .catch(function (err) {
          console.error('Error generating Excel:', err);
        });
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
              return reject(new Error('El archivo no tiene un formato valido de copia de seguridad.'));
            }
            resolve({
              employees: data.employees,
              history: Array.isArray(data.history) ? data.history : []
            });
          } catch (err) {
            reject(new Error('Error al interpretar el archivo JSON: ' + err.message));
          }
        };
        reader.onerror = function () {
          reject(new Error('No se pudo leer el archivo seleccionado.'));
        };
        reader.readAsText(file);
      });
    }
  };

  window.Ademincol = window.Ademincol || {};
  window.Ademincol.Exporter = Exporter;

})(window);
