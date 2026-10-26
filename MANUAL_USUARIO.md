# 📖 Manual de Usuario - NovaGest ERP

**Módulo:** Desarrollo de Interfaces (Código: 0488)  
**Ciclo Formativo:** Grado Superior en Desarrollo de Aplicaciones Multiplataforma (DAM2)  
**Autor:** Fabio Luis Rieker González  
**Versión:** 1.0.0 (PWA Multiplataforma)

---

## 🏢 1. Introducción y Alcance del Sistema
**NovaGest ERP** es un sistema de gestión empresarial multiplataforma (PWA/Híbrida) diseñado con el framework **Ionic** y **Angular**, estructurado bajo el patrón arquitectónico MVVM y orientado a la optimización de procesos de negocio, control de stock y auditoría de eventos en tiempo real.

El sistema consume concurrentemente dos orígenes de datos:
1. **API REST Relacional (SQL simulada)** con persistencia local y soporte para operaciones CRUD, indexación y agregaciones.
2. **Servicio NoSQL en Tiempo Real (tipo Firestore)** con un flujo continuo de logs, trazabilidad y alertas automáticas.

---

## 🔐 2. Credenciales de Acceso Oficiales

El sistema implementa **Control de Acceso Basado en Roles (RBAC)** con dos perfiles diferenciados:

| Perfil | Correo Electrónico | Contraseña | Alcance y Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@empresa.com` | `Admin1234*` | **Acceso total:** Cuadro de Mando Ejecutivo, Gráficos Interactivos, Altas/Bajas/Modificaciones de Inventario, Informes y Auditoría NoSQL en vivo. |
| **Usuario Estándar** | `user@empresa.com` | `User1234*` | **Acceso limitado:** Consulta de catálogo con filtros, ordenación de columnas, detalle de artículos, informes y manual de ayuda. |

> **Nota:** La pantalla de inicio de sesión dispone de botones de autorelleno para facilitar la evaluación rápida de ambos roles por parte del docente.

---

## 🚀 3. Funcionalidades Principales

### 3.1. Navegación Global y Side Menu
- **Menú Lateral Responsivo:** Emplea `IonSplitPane` para mostrar permanentemente la navegación en pantallas grandes (escritorio/tablets en horizontal) y como menú lateral desplegable en móviles.
- **Carga Diferida (Lazy Loading):** Todas las rutas se cargan bajo demanda (`loadComponent`) garantizando tiempos de carga inferiores a 1 segundo.
- **Protección de Rutas (Guards):** 
  - `authGuard`: Redirige al login si no existe una sesión JWT válida.
  - `roleGuard`: Bloquea el acceso a rutas exclusivas de administrador (`/dashboard`, `/product-form`, `/realtime-audit`) mostrando una pantalla informativa de error 403.

### 3.2. Cuadro de Mando Ejecutivo (Dashboard)
- **Widgets Estadísticos Reutilizables:** Componente visual `<app-stat-widget>` que muestra KPIs de valor de inventario, stock bajo, artículos agotados y tendencias.
- **Gráficos Interactivos (Chart.js):** 
  - *Gráfico de Barras:* Comparativa financiera mensual entre ingresos y costes operativos.
  - *Gráfico Circular (Doughnut):* Distribución económica del valor de los activos por categorías.
- **Filtros en Tiempo Real:** Selector de período (7 días, 30 días, anual) que actualiza los gráficos al instante.

### 3.3. Catálogo de Productos y Componente Tabla Avanzada
- **Componente Reutilizable `<app-data-table>`:** Componente desacoplado que implementa:
  - Búsqueda en tiempo real con debounce de 250ms.
  - Ordenación ascendente/descendente por cualquier columna con indicadores visuales y atributo `aria-sort`.
  - Paginación dinámica con selección de tamaño de página.
  - Acciones contextuales (Ver, Editar, Eliminar con diálogo de confirmación).

### 3.4. Alta y Edición de Registros con Validación Asíncrona
- **Formulario Reactivo:** Construido con `ReactiveFormsModule` y estrategia `ChangeDetectionStrategy.OnPush`.
- **Validación Asíncrona (`skuAsyncValidator`):** Al ingresar el SKU de un producto, el sistema consulta en segundo plano si dicho código ya se encuentra registrado en la base de datos SQL.
  - Mientras valida, muestra un spinner accesible.
  - Si el código existe, muestra un mensaje de error y deshabilita el botón de guardado.

### 3.5. Auditoría NoSQL en Tiempo Real
- Conexión reactiva a la colección de eventos del sistema (altas, modificaciones, eliminaciones, accesos e incidencias de telemetría).
- Emisión periódica de latidos (*heartbeat*) que evidencian la naturaleza en tiempo real del servicio sin bloquear el hilo principal.

### 3.6. Exportación de Informes
- **PDF Oficial:** Documento formal con diseño profesional, cabecera corporativa, metadatos, tabla formateada mediante `jspdf-autotable` y paginación.
- **CSV Estandarizado:** Exportación según norma RFC 4180 con codificación **UTF-8 con BOM** (`\uFEFF`), permitiendo abrir el archivo en Microsoft Excel sin problemas de codificación con tildes.

---

## ♿ 4. Accesibilidad (WCAG 2.1 AA / AAA)

NovaGest ERP ha sido desarrollado con un compromiso estricto con la accesibilidad:
- **Navegación Integral por Teclado:**
  - `Tab` / `Shift + Tab`: Salto secuencial entre controles interactivos.
  - `Enter` / `Espacio`: Activación de botones, ordenación de columnas y apertura de registros.
  - `Esc`: Cierre de diálogos modales y menús.
- **Indicador de Foco:** Anillo de enfoque de alto contraste (`3px solid #2563eb`).
- **Semántica WAI-ARIA:** Uso de roles (`table`, `columnheader`, `feed`, `region`), etiquetas `aria-label`, y regiones dinámicas `aria-live="polite"` y `aria-live="assertive"`.
- **Modo Oscuro:** Conmutador accesible en el menú con paleta optimizada para confort visual y alto ratio de contraste (>7:1).
