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

      // Prepare data rows (plain objects matching the column order)
      var dataRows = records.map(function (r) {
        var o = {};
        cols.forEach(function (c) { o[c] = r[c] === undefined ? '' : r[c]; });
        return o;
      });

      // ------------------------------------------------------------
      // Use ExcelJS (client‑side) to create a true Excel Table (ListObject)
      // ------------------------------------------------------------
      var ExcelJS = window.ExcelJS; // CDN provides global `ExcelJS`
      var workbook = new ExcelJS.Workbook();
      var ws = workbook.addWorksheet('Personal');

      // Define columns with a reasonable width (20 characters)
      ws.columns = cols.map(function (c) { return { header: c, key: c, width: 20 }; });

      // Add data rows
      ws.addRows(dataRows);

      // Apply header styling (bold font, corporate background color, borders)
      var headerRow = ws.getRow(1);
      headerRow.eachCell({ includeEmpty: true }, function (cell) {
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } }; // blue corporate
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Add a formal Excel Table (ListObject) with filter buttons and banded rows
      ws.addTable({
        name: 'EmployeesTable',
        ref: 'A1',
        headerRow: true,
        style: { theme: 'TableStyleMedium9', showRowStripes: true },
        columns: cols.map(function (c) { return { name: c, filterButton: true }; })
      });

      // Write the workbook to a Blob and trigger download
      workbook.xlsx.writeBuffer().then(function (buffer) {
        var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
      }).catch(function (err) {
        console.error('Error generating Excel file with ExcelJS:', err);
        toast('No se pudo generar el archivo Excel: ' + (err && err.message ? err.message : err), 'error');
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

