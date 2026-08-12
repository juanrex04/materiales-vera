# Materiales Vera 🚚

Sistema web para la gestión de la flota de volquetas de **VERA S.A.S.**: inspecciones preoperacionales de los conductores, control de documentación de los vehículos (SOAT, tecnomecánica, cambio de aceite) y reportes en PDF.

Aplicación full-stack (Vue 3 + Node.js/Express + MySQL) pensada para un uso interno de ~15 usuarios no simultáneos.

## Funcionalidades

- **Roles de usuario**: `Admin` y `Conductor`, con rutas protegidas según el rol.
- **Autenticación con JWT** y obligación de cambiar la contraseña en el primer inicio de sesión.
- **Dashboard con alertas**: muestra vehículos con documentación vencida o próxima a vencer (SOAT, tecnomecánica, cambio de aceite) y los días restantes.
- **Gestión de vehículos** (Admin): alta, edición y baja; estado (Disponible / En Ruta / Mantenimiento), capacidad de carga y seguimiento de fechas de documentos.
- **Gestión de colaboradores** (Admin): alta, edición y baja; asignación de rol y licencia de conducción.
- **Inspección preoperacional** (Conductor): checklist de 42 puntos para volquetas (luces, frenos, mecánica, kit carretera, etc.), con estado de documentos del vehículo en la vista.
- **Control de inspecciones** (Admin): historial de checklists con filtros por placa y rango de fechas.
- **Reportes en PDF**: reporte individual de una inspección y matriz semanal exportable (`html2pdf.js`).
- **Seguridad**: hash de contraseñas con `bcrypt`, `helmet`, validación con `express-validator` y limitación de intentos de login (5 por cada 5 minutos).

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3, Vue Router, Vite |
| Backend | Node.js, Express 5 |
| Base de datos | MySQL 8+ (compatible con TiDB Cloud Serverless) |
| Autenticación | JSON Web Token (JWT) + bcrypt |
| PDF | html2pdf.js |

## Estructura del proyecto

```
├── backend/               # API REST en Express
│   ├── server.js          # Punto de entrada
│   ├── db.js              # Conexión a la base de datos
│   ├── database.sql       # Esquema + seed (MySQL local)
│   └── .env.example       # Plantilla de variables de entorno
├── frontend/              # SPA en Vue 3
│   ├── src/views/         # Vistas (Login, Dashboard, Vehículos, etc.)
│   ├── src/router/        # Configuración de rutas y guards
│   └── .env.example       # Plantilla de variables de entorno
├── deploy/                # Blueprint de Render (backend + frontend)
│   ├── schema_remoto.sql  # Esquema SQL
│   └── GUIA_RENDER.md     
└── render.yaml            
```

## Puesta en marcha local

### Requisitos

- Node.js **22.18 o superior** (versión fijada en `engines` del frontend)
- MySQL **8 o superior** (o un cluster TiDB Cloud Serverless)

### 1. Clonar el repositorio

```bash
git clone https://github.com/juanrex04/materiales-vera.git
cd materiales-vera
```

### 2. Crear la base de datos

```bash
mysql -u <usuario> -p < backend/database.sql
```

Esto crea la base `materiales_vera`, sus 6 tablas y el usuario administrador inicial.

### 3. Backend

```bash
cd backend
npm install
copy .env.example .env   # Windows (o cp .env.example .env en Linux/macOS)
npm run dev
```

Edita `backend/.env` con los datos de tu base de datos y un `JWT_SECRET` propio.

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto `3000`) |
| `DB_HOST` | Host de la base de datos |
| `DB_PORT` | Puerto (`3306` en MySQL local)|
| `DB_USER` | Usuario de la base de datos |
| `DB_PASSWORD` | Contraseña de la base de datos |
| `DB_DATABASE` | Nombre de la base de datos (`materiales_vera`) |
| `DB_SSL` | `true` solo si la base de datos exige TLS|
| `JWT_SECRET` | Secreto para firmar los tokens (genera uno largo y aleatorio) |
| `CORS_ORIGIN` | Orígenes permitidos separados por coma (ej. `http://localhost:5173`) |

### 4. Frontend

```bash
cd frontend
npm install
copy .env.example .env   # Windows (o cp .env.example .env en Linux/macOS)
npm run dev
```

En `frontend/.env` define `VITE_API_URL=http://localhost:3000` y abre `http://localhost:5173`.

### 5. Usuario inicial

| Documento | Contraseña | Rol |
|---|---|---|
| `11111` | `12345` | Admin |

En el primer inicio de sesión se solicitará cambiar la contraseña. En producción, cambia la contraseña del admin antes de compartir el acceso.

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` (backend) | Servidor Express con recarga automática (nodemon) |
| `npm start` (backend) | Inicia el servidor en producción |
| `npm run dev` (frontend) | Servidor de desarrollo de Vite |
| `npm run build` (frontend) | Build de producción en `dist/` |
