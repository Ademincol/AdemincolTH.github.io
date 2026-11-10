# Ademincol RRHH — Sistema de Gestión de Talento Humano

Aplicación web moderna y ligera para la administración, visualización y auditoría del personal de **Ademincol S.A.**

Diseñada como una Single Page Application (SPA) modular, rápida y desacoplada, ejecutable tanto en local como alojada estáticamente en **GitHub Pages**.

---

## 🚀 Características Principales

- **📊 Dashboard Ejecutivo:**
  - Indicadores clave (KPIs) de dotación: Total de colaboradores, porcentaje de activos y retirados.
  - Gráficos interactivos construidos con **D3.js** (distribución por empresa, sexo, área, tipo de contrato y top de cargos).
- **👥 Base de Personal:**
  - Búsqueda en tiempo real por nombre, cargo o cédula.
  - Filtros combinados por empresa, estado, área, categoría, ciudad y tipo de contrato.
  - **Ordenamiento interactivo por columnas** (ascendente / descendente) en todos los campos principales.
  - **Paginación configurable** (15, 25, 50, 100 o todos los registros por página) para máximo rendimiento.
  - Ficha detallada de empleado con historial y edición completa.
- **📥 Importación Inteligente de Excel / CSV:**
  - Asistente guiado de 4 pasos para subir archivos `.xlsx` o `.csv`.
  - Mapeo automático de columnas mediante sinónimos inteligentes.
  - Detección de duplicados, validaciones de integridad y vista previa detallada de registros nuevos y modificados antes de confirmar.
- **📤 Exportación y Copias de Seguridad (Backup & Restore):**
  - Exportación de la base completa o de resultados filtrados directamente a Excel (`.xlsx`).
  - **Copia de seguridad completa en JSON:** Permite descargar un respaldo íntegro de la base de datos y restaurarlo en cualquier equipo o navegador.
- **🕒 Historial y Trazabilidad:**
  - Auditoría de todas las acciones: creaciones, ediciones campo por campo, eliminaciones e importaciones masivas.
- **⚙️ Configuración y Catálogos:**
  - Vista unificada de los valores de catálogos (cargos, áreas, empresas, ciudades) con herramienta de renombrado en lote.
- **🌓 Interfaz Adaptable (UI/UX):**
  - Selector manual de **Modo Claro / Modo Oscuro** con guardado de preferencia.
  - **Menú responsivo para móviles** con panel lateral deslizable (sidebar drawer).

---

## 📁 Estructura del Proyecto

```text
AdemincolTH.github.io/
├── index.html            # Estructura semántica HTML y punto de entrada
├── css/
│   └── styles.css        # Hoja de estilos principal (variables, temas, layout, componentes)
├── js/
│   ├── config.js         # Esquemas de datos, validaciones y utilidades generales
│   ├── db.js             # Capa de persistencia local en IndexedDB
│   ├── store.js          # Manejo de estado reactivo (pub/sub, filtros, orden y paginación)
│   ├── charts.js         # Generación de gráficos de barras horizontales con D3.js
│   ├── importer.js       # Motor de lectura, mapeo y validación de archivos Excel/CSV
│   ├── exporter.js       # Exportación a Excel (.xlsx) y gestión de respaldos JSON
│   └── app.js            # Controlador principal de interfaz de usuario y eventos
├── README.md             # Documentación del proyecto
└── .github/workflows/
    └── static.yml        # Pipeline de despliegue automático en GitHub Pages
```

---

## 🛠️ Ejecución Local

No requiere Node.js ni compilación previa. Para ejecutarlo en tu computador:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Ademincol/AdemincolTH.github.io.git
   cd AdemincolTH.github.io
   ```
2. Abre `index.html` en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari).
3. Opcionalmente, puedes servirlo con cualquier servidor local:
   ```bash
   # Con Python
   python -m http.server 8000
   
   # O con Node.js
   npx serve .
   ```

---

## 💾 Persistencia y Sincronización en la Nube (Supabase)

- La aplicación está conectada a **Supabase Cloud**, lo que permite sincronización en tiempo real entre múltiples computadores y usuarios de Talento Humano.
- Los cambios realizados (creación, edición, eliminación o importación de empleados) se guardan directamente en la nube y son visibles al instante por todo el equipo.
- **Copias de seguridad adicionales:**
  - En **Configuración** > **Copias de Seguridad**, puedes descargar un respaldo en archivo `.json` en cualquier momento para mantener respaldos locales periódicos.
