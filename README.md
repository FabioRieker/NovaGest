# NovaGest ERP - Sistema de Gestión Multiplataforma (PWA/Híbrida)

[![CI/CD Pipeline](https://github.com/FabioRieker/NovaGest/actions/workflows/ci.yml/badge.svg)](https://github.com/FabioRieker/NovaGest/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Framework: Ionic 8](https://img.shields.io/badge/Ionic-8.0-3880ff.svg)](https://ionicframework.com/)
[![Angular: 18/22](https://img.shields.io/badge/Angular-Standalone-dd0031.svg)](https://angular.dev/)
[![Accessibility: WCAG AA](https://img.shields.io/badge/WCAG-2.1%20AA%2FAAA-success.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)

> **Actividad Individual 1 - Módulo Profesional:** Desarrollo de Interfaces (Código: 0488)  
> **Ciclo Formativo:** Grado Superior en Desarrollo de Aplicaciones Multiplataforma (DAM2)  
> **Estudiante:** Fabio Luis Rieker González  
> **Comunidad de Madrid**

---

## Descripción del Proyecto
**NovaGest ERP** es una aplicación de gestión empresarial multiplataforma desarrollada desde cero con **Ionic** y **Angular Standalone**. La solución incorpora:
- Arquitectura desacoplada **MVVM** con servicios reactivos basados en Signals y RxJS.
- **Control de Acceso Basado en Roles (RBAC)** con enrutamiento protegido mediante Guards e inyección asíncrona de tokens JWT con interceptores HTTP.
- **Backend y persistencia íntegra con Supabase:**
  - API REST Relacional (PostgreSQL en Supabase) con almacenamiento persistente y validaciones de clave única.
  - Servicio en tiempo real con Supabase Realtime (WebSockets) con stream continuo de eventos de auditoría y telemetría.
- **Componentes visuales reutilizables e independientes:**
  - `<app-data-table>`: Tabla avanzada con buscador en tiempo real, ordenación bidireccional, paginación dinámica y acciones CRUD.
  - `<app-stat-widget>`: Tarjeta métrica/KPI con indicadores de tendencia, icono personalizable y eventos `@Output()`.
- **Cuadro de Mando Ejecutivo (Dashboard):** Gráficos analíticos con **Chart.js** y filtros dinámicos.
- **Generación y exportación de informes:** Exportación en **PDF formal** tabulado con `jspdf-autotable` y **CSV** compatible con Microsoft Excel (UTF-8 con BOM).
- **Cumplimiento estricto de accesibilidad WCAG 2.1 AA/AAA:** Puntuación superior a 95/100 en Google Lighthouse, navegación íntegra por teclado y atributos semánticos WAI-ARIA.
- **Control de versiones Git Flow:** Ramas `main`, `develop` y ramas de características individuales.
- **Integración continua (CI/CD):** Pipeline con GitHub Actions que valida linters, ejecuta tests unitarios bloqueantes y compila el bundle de producción.

---

## Credenciales de Acceso Oficiales

| Rol | Usuario / Email | Contraseña | Vistas y Capacidades |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@empresa.com` | `Admin1234*` | Acceso irrestricto: Cuadro de Mando, Gestión de Catálogo (Creación, Edición, Eliminación), Auditoría Supabase Realtime en vivo, Exportación. |
| **Usuario Estándar** | `user@empresa.com` | `User1234*` | Acceso de consulta: Listado de inventario con filtros, visualización de fichas de detalle, informes tabulados y manual de usuario. |

*La pantalla de Login incluye botones de acceso rápido para autorellenar ambas credenciales instantáneamente.*

---

## Tecnologías Empleadas

- **Framework Híbrido:** Ionic Framework 8 (`@ionic/angular`)
- **Lógica y Arquitectura:** Angular Standalone Components & Signals
- **Backend, Base de Datos y Realtime:** Supabase (`@supabase/supabase-js`, PostgreSQL & WebSockets)
- **Librería de Gráficos:** Chart.js 4.x
- **Generación de Informes:** jsPDF + jsPDF-AutoTable
- **Control de Versiones y CI:** Git, GitHub Actions
- **Documentación Técnica Automatizada:** Compodoc 2.x
- **Test Runner:** Vitest con pruebas asíncronas

---

## Instalación y Puesta en Marcha

### Prerrequisitos
- Node.js (v18.x o superior)
- npm (v9.x o superior)
- Ionic CLI (`npm install -g @ionic/cli`)

### Instrucciones
1. Clonar el repositorio:
   ```bash
   git clone git@github.com:FabioRieker/NovaGest.git
   cd NovaGest
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo local:
   ```bash
   ionic serve
   ```
   *La aplicación estará disponible en `http://localhost:8100/`.*

4. Ejecutar pruebas unitarias:
   ```bash
   npm test
   ```

5. Generar la documentación técnica (Compodoc):
   ```bash
   npm run doc:build
   ```
   *Para servir la documentación en local: `npm run compodoc` (puerto 8080).*

6. Compilar para producción (PWA):
   ```bash
   npm run build
   ```
   *Los artefactos optimizados se generarán en la carpeta `www/`.*

---

## Estructura del Proyecto

```text
src/
├── app/
│   ├── core/                      # Núcleo de la aplicación
│   │   ├── guards/                # authGuard y roleGuard (RBAC)
│   │   ├── interceptors/          # authInterceptor (JWT Bearer)
│   │   ├── models/                # Modelos TypeScript (User, Product, AuditLog)
│   │   └── services/              # AuthService, SqlRestService, SupabaseService, SupabaseRealtimeService, ExportService
│   ├── shared/
│   │   └── components/            # Componentes reutilizables e independientes
│   │       ├── data-table/        # Componente 1: Tabla avanzada con buscador y ordenación
│   │       └── stat-widget/       # Componente 2: Widget estadístico/KPI configurable
│   └── pages/                     # Vistas con carga diferida (Lazy Loading)
│       ├── login/                 # Formulario reactivo de login
│       ├── dashboard/             # Cuadro de mando interactivo con Chart.js
│       ├── products/              # Catálogo que instancia <app-data-table>
│       ├── product-form/          # Alta y edición con validación asíncrona de SKU
│       ├── realtime-audit/        # Stream Supabase Realtime en vivo
│       ├── reports/               # Descarga de informes PDF/CSV
│       ├── help/                  # Manual de usuario embebido en la aplicación
│       └── unauthorized/          # Pantalla de acceso denegado (403)
├── theme/
│   └── variables.scss             # Paleta de colores de alto contraste WCAG
└── global.scss                    # Estilos globales y foco visible
```

---

## Licencia y Autoría
Proyecto desarrollado por **Fabio Luis Rieker González** como entrega oficial de la Actividad Individual 1 de DAM2. Distribuido bajo licencia MIT.
