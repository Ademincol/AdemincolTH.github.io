/* =================================================================
   Ademincol RRHH — Exportador de Datos (Excel y Backup JSON)
   ================================================================= */
(function (window) {
  'use strict';

  var C = window.Ademincol;
  var FIELDS = C.FIELDS;
  var Utils = C.Utils;

  // Mapeo de colores y etiquetas personalizadas para el encabezado
  var CUSTOM_LABELS = {
    estado: 'ESTADO DEL TRABAJADOR',
    nombre: 'APELLIDOS Y NOMBRE',
    cedula: 'CEDULA',
    empresa: 'EMPRESA',
    fecha_cambio_modalidad: 'FECHA DE CAMBIO DE MODALIDAD DE CONTRATO',
    fecha_retiro: 'FECHA RETIRO DEFINITIVA',
    fondo_pension: 'PENSIONES',
    arl: 'ARL',
    eps: 'EPS',
    ccf: 'CCF',
    fondo_cesantias: 'CESANTIAS'
  };

  // Paleta de colores temáticos por grupo para los encabezados
  var GROUP_HEADER_COLORS = {
    empresa: 'FFFF6E4A',       // Naranja coral
    basico: 'FF1A6F8A',        // Azul petróleo / Teal
    identificacion: 'FF2B78C5',// Azul real
    contacto: 'FF34495E',      // Pizarra
    emergencia: 'FF34495E',    // Pizarra
    puesto: 'FF683391',        // Morado / Púrpura
    formacion: 'FF512E5F',     // Púrpura oscuro
    financiero: 'FFD82E6A'     // Magenta / Fucsia
  };

  var Exporter = {
    /**
     * Exporta registros a .xlsx con ExcelJS.
     * Crea una hoja con autofiltros, cabeceras temáticas multicolores,
     * pastillas de estado (ACTIVO / RETIRADO), bordes negros y cebreado blanco / gris claro.
     */
    exportToExcel: function (records, filename) {
      // 1. Definir columnas en el orden exacto de la plantilla
      var initialKeys = ['empresa', 'estado', 'cedula', 'nombre'];
      var remainingFields = FIELDS.filter(function (f) {
        return initialKeys.indexOf(f.key) === -1;
      });

      var orderedCols = [
        { key: '__item_no__', label: 'ITEM No.', headerColor: 'FFFF6E4A', align: 'center' },
        { key: 'empresa', label: 'EMPRESA', headerColor: 'FFFF6E4A', align: 'center' },
        { key: 'estado', label: 'ESTADO DEL TRABAJADOR', headerColor: 'FF2B78C5', align: 'center' },
        { key: 'cedula', label: 'CEDULA', headerColor: 'FF2B78C5', align: 'center' },
        { key: 'nombre', label: 'APELLIDOS Y NOMBRE', headerColor: 'FF1A6F8A', align: 'left' }
      ];

      remainingFields.forEach(function (f) {
        var label = CUSTOM_LABELS[f.key] || f.label.toUpperCase();
        var color = GROUP_HEADER_COLORS[f.group] || 'FF1A6F8A';
        var align = 'center';
        if (f.kind === 'textarea' || f.key.indexOf('nombre') !== -1 || f.key === 'direccion') {
          align = 'left';
        }
        orderedCols.push({
          key: f.key,
          label: label,
          headerColor: color,
          align: align
        });
      });

      // 2. Construir matriz de datos con valores limpios
      var tableRows = records.map(function (r, index) {
        return orderedCols.map(function (col) {
          if (col.key === '__item_no__') {
            return index + 1;
          }
          var val = r[col.key];
          if (val === undefined || val === null || val === '') {
            return '';
          }
          if (col.key === 'estado') {
            var st = String(val).trim().toUpperCase();
            return st === 'ACTIVO' ? '● ACTIVO' : (st === 'RETIRADO' ? '● RETIRADO' : st);
          }
          return String(val).trim();
        });
      });

      // 3. Crear Workbook y Hoja
      var EJ = window.ExcelJS;
      var workbook = new EJ.Workbook();
      var ws = workbook.addWorksheet('Hoja1', {
        views: [{ showGridLines: true }]
      });

      // 4. Calcular ancho adaptativo para cada columna
      var colWidths = orderedCols.map(function (col, colIdx) {
        var maxLen = col.label.length;
        tableRows.forEach(function (row) {
          var cellVal = String(row[colIdx] || '');
          if (cellVal.length > maxLen) {
            maxLen = cellVal.length;
          }
        });
        // Margen extra para el botón de autofiltro y buena lectura
        return Math.min(50, Math.max(12, maxLen + 5));
      });

      ws.columns = orderedCols.map(function (col, i) {
        return { header: col.label, key: col.key, width: colWidths[i] };
      });

      // 5. Agregar filas de datos directamente
      tableRows.forEach(function (rowData) {
        ws.addRow(rowData);
      });

      // Habilitar autofiltro nativo en todo el rango sin corromper el XML
      var totalCols = orderedCols.length;
      var totalRows = tableRows.length + 1; // Fila 1 es header
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: totalRows, column: totalCols }
      };

      // Bordes negros finos para todas las celdas
      var borderBlackThin = {
        top:    { style: 'thin', color: { argb: 'FF000000' } },
        left:   { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right:  { style: 'thin', color: { argb: 'FF000000' } }
      };

      var borderHeader = {
        top:    { style: 'thin', color: { argb: 'FF000000' } },
        left:   { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right:  { style: 'thin', color: { argb: 'FF000000' } }
      };

      // 6. Estilizar encabezados (Fila 1) con los colores exactos y borde negro
      var headerRow = ws.getRow(1);
      headerRow.height = 42;
      headerRow.eachCell({ includeEmpty: true }, function (cell, colNumber) {
        var colDef = orderedCols[colNumber - 1];
        var bgColor = (colDef && colDef.headerColor) ? colDef.headerColor : 'FF1A6F8A';

        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };
        cell.border = borderHeader;
      });

      // 7. Estilizar filas de datos (Fila 2 en adelante): bordes negros y cebreado blanco / gris claro
      for (var r = 2; r <= totalRows; r++) {
        var dataRow = ws.getRow(r);
        dataRow.height = 24;

        // Cebreado: filas pares blanco, filas impares gris claro (o viceversa)
        var rowBgColor = (r % 2 === 0) ? 'FFFFFFFF' : 'FFF2F2F2';

        dataRow.eachCell({ includeEmpty: true }, function (cell, colNumber) {
          var colDef = orderedCols[colNumber - 1];
          var rawVal = cell.value !== undefined && cell.value !== null ? String(cell.value) : '';

          // Bordes negros en cada celda
          cell.border = borderBlackThin;

          // Tipografía y alineación
          cell.font = { size: 10, color: { argb: 'FF2C3E50' } };
          cell.alignment = {
            vertical: 'middle',
            horizontal: (colDef && colDef.align) ? colDef.align : 'center'
          };

          // Relleno por defecto según cebreado
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowBgColor }
          };

          // Formato especial para Columna ITEM No.
          if (colDef && colDef.key === '__item_no__') {
            cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
          }

          // Formato especial tipo "badge" para ESTADO DEL TRABAJADOR
          if (colDef && colDef.key === 'estado') {
            if (rawVal.indexOf('ACTIVO') !== -1) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFA9DFBF' } // Verde pastel
              };
              cell.font = { bold: true, size: 10, color: { argb: 'FF145A32' } }; // Verde oscuro
            } else if (rawVal.indexOf('RETIRADO') !== -1) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF5B7B1' } // Rojo/Rosa pastel
              };
              cell.font = { bold: true, size: 10, color: { argb: 'FF78281F' } }; // Rojo vino
            }
          }
        });
      }

      // 8. Generar buffer y forzar descarga
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
          console.error('Error al generar Excel:', err);
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
              return reject(new Error('El archivo no tiene un formato válido de copia de seguridad.'));
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
