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
     * Crea una Excel Table (ListObject) con filtros, estilos corporativos
     * y columnas auto-ajustadas al contenido.
     */
    exportToExcel: function (records, filename) {
      var cols = ['id'].concat(FIELDS.map(function (f) { return f.key; }));
      var colLabels = ['ITEM No.'].concat(FIELDS.map(function (f) { return f.label.toUpperCase(); }));

      // Convertir registros a arrays de valores
      var tableRows = records.map(function (r) {
        return cols.map(function (c) { return r[c] === undefined ? '' : String(r[c]); });
      });

      var EJ = window.ExcelJS;
      var workbook = new EJ.Workbook();
      var ws = workbook.addWorksheet('Personal');

      // ------- Calcular ancho optimo por columna -------
      var colWidths = colLabels.map(function (label, i) {
        var maxLen = label.length;
        tableRows.forEach(function (row) {
          var val = row[i] || '';
          if (val.length > maxLen) maxLen = val.length;
        });
        // Minimo 10, maximo 45, +2 de padding
        return Math.min(45, Math.max(10, maxLen + 2));
      });

      // Definir columnas con ancho calculado
      ws.columns = cols.map(function (c, i) {
        return { header: colLabels[i], key: c, width: colWidths[i] };
      });

      // ------- Crear la tabla formal (ListObject) -------
      ws.addTable({
        name: 'EmployeesTable',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: {
          theme: null,
          showRowStripes: true,
          showFirstColumn: false,
          showLastColumn: false
        },
        columns: colLabels.map(function (label) {
          return { name: label, filterButton: true };
        }),
        rows: tableRows
      });

      // ------- Estilo del encabezado (salmon/naranja) -------
      var headerRow = ws.getRow(1);
      headerRow.height = 36;
      headerRow.eachCell({ includeEmpty: true }, function (cell) {
        cell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF4B084' }
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FF000000' } },
          left:   { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right:  { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // ------- Estilos de filas de datos (alterno verde/rosa) -------
      var greenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      var pinkFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      var thinBorder = {
        top:    { style: 'thin', color: { argb: 'FF000000' } },
        left:   { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right:  { style: 'thin', color: { argb: 'FF000000' } }
      };

      for (var r = 2; r <= tableRows.length + 1; r++) {
        var dataRow = ws.getRow(r);
        var fill = (r % 2 === 0) ? greenFill : pinkFill;
        dataRow.eachCell({ includeEmpty: true }, function (cell) {
          cell.fill = fill;
          cell.border = thinBorder;
          cell.alignment = { vertical: 'middle', wrapText: false };
        });
      }

      // ------- Generar buffer y descargar -------
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
