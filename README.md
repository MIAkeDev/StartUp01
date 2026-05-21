# Workify — Plataforma laboral peruana

Conecta empleadores con trabajadores independientes y profesionales de servicios.

---

## Estructura del proyecto

```
workify/
├── public/                 # Frontend estático
│   ├── css/
│   │   └── main.css        # Estilos globales
│   ├── js/
│   │   └── core.js         # Utilidades: Auth, API, Toast, Panel, Modal
│   ├── pages/
│   │   ├── ofertas.html    # Listado de ofertas laborales
│   │   ├── servicios.html  # Listado de servicios independientes
│   │   ├── publicar.html   # Flujo de publicación paso a paso
│   │   ├── perfil.html     # Dashboard del usuario
│   │   └── admin.html      # Panel de administración
│   └── index.html          # Página principal (home)
├── server/
│   ├── config/
│   │   └── supabase.js     # Clientes Supabase (público y admin)
│   ├── middleware/
│   │   └── auth.js         # Verificación JWT y roles
│   ├── routes/
│   │   ├── auth.js         # Registro, login, perfil, CV
│   │   ├── publicaciones.js # CRUD publicaciones + solicitudes pago + calificaciones
│   │   ├── postulaciones.js # Postulaciones a ofertas
│   │   ├── notificaciones.js# Bandeja de entrada
│   │   └── admin.js        # Panel admin (solicitudes, publicaciones, usuarios)
│   └── index.js            # Servidor Express principal + cron
├── scripts/
│   ├── schema.sql          # SQL para crear todas las tablas en Supabase
│   └── seed.js             # Crear admin + datos de prueba
├── .env.example            # Variables de entorno de ejemplo
└── package.json
```

---

## Configuración local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-usuario/workify.git
cd workify
npm install
```

### 2. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → New Project
2. Anota: **Project URL**, **anon key** y **service_role key** (en Settings → API)

### 3. Ejecutar el schema SQL

1. En tu proyecto Supabase → **SQL Editor** → New Query
2. Copia y pega el contenido de `scripts/schema.sql`
3. Clic en **Run** ✓

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores reales:

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

PORT=3000
NODE_ENV=development

ADMIN_EMAIL=admin@workify.pe
ADMIN_PASSWORD=Admin123!

WHATSAPP_ADMIN_NUMBER=51999999999
```

### 5. Ejecutar el seed (admin + datos de prueba)

```bash
node scripts/seed.js
```

Esto crea:
- Usuario admin: `admin@workify.pe` / `Admin123!`
- Usuario prueba: `usuario@prueba.pe` / `Test123!`
- 6 publicaciones de ejemplo (3 ofertas + 3 servicios)

### 6. Iniciar el servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

Abre: [http://localhost:3000](http://localhost:3000)

---

## Despliegue en Render

### 1. Subir código a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/workify.git
git push -u origin main
```

### 2. Crear servicio en Render

1. Ve a [render.com](https://render.com) → New → **Web Service**
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Name:** workify
   - **Region:** Oregon (US West) u Ohio
   - **Branch:** main
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

### 3. Variables de entorno en Render

En el dashboard de Render → Environment → Add Environment Variable:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `NODE_ENV` | `production` |
| `ADMIN_EMAIL` | `admin@workify.pe` |
| `ADMIN_PASSWORD` | `Admin123!` |
| `WHATSAPP_ADMIN_NUMBER` | `51999999999` |

### 4. Ejecutar seed en Render

Después del primer deploy, en Render → Shell:
```bash
node scripts/seed.js
```

---

## Flujos principales

### Publicar una oferta o servicio

1. Usuario inicia sesión y hace clic en **Publicar**
2. Elige tipo (Oferta / Servicio) y plan (Básico S/5 / Destacado S/10)
3. Se crea una solicitud de pago en estado `esperando_confirmacion`
4. Usuario avisa al admin por WhatsApp con el ID de solicitud
5. Admin en `/pages/admin.html` → Solicitudes → clic en **Verificar**
6. Usuario recibe notificación → puede completar los datos
7. Publicación queda en línea inmediatamente

### Postular a una oferta

1. Usuario debe tener CV subido en su perfil
2. En el detalle de la oferta (panel lateral) → clic **Enviar postulación**
3. Empleador recibe notificación y ve el postulante en su panel
4. Empleador cambia estado: Recibido → En revisión → Contratado / Rechazado
5. Postulante recibe notificación de cada cambio

### Contratar un servicio

1. Ver detalle del servicio (panel lateral)
2. Clic en **Contactar por WhatsApp** → abre chat con mensaje predefinido
3. Usuario puede calificar el servicio (1-5 estrellas + comentario)

---

## Credenciales de prueba

```
Admin:   admin@workify.pe   / Admin123!
Usuario: usuario@prueba.pe  / Test123!
```

---

## API Endpoints

### Autenticación
- `POST /auth/register` — Registro
- `POST /auth/login` — Login
- `GET  /auth/me` — Perfil actual
- `PUT  /auth/perfil` — Actualizar datos
- `POST /auth/cv` — Subir CV (multipart/form-data)

### Publicaciones
- `GET  /api/publicaciones` — Listar con filtros (`tipo`, `categoria`, `q`, `destacado`, `page`, `limit`)
- `GET  /api/publicaciones/:id` — Detalle con calificaciones
- `POST /api/publicaciones/solicitudes-pago` — Crear solicitud
- `GET  /api/publicaciones/solicitudes-pago/mis-solicitudes` — Solicitudes del usuario
- `POST /api/publicaciones/:solicitudId/completar` — Completar publicación (tras pago verificado)
- `POST /api/publicaciones/calificaciones` — Calificar servicio
- `GET  /api/publicaciones/usuario/mis-publicaciones` — Publicaciones del usuario

### Postulaciones
- `POST   /api/postulaciones` — Postularse a oferta
- `GET    /api/postulaciones/mis-postulaciones` — Mis postulaciones
- `GET    /api/postulaciones/oferta/:ofertaId` — Postulantes de una oferta (empleador)
- `PATCH  /api/postulaciones/:id/estado` — Cambiar estado

### Notificaciones
- `GET   /api/notificaciones` — Bandeja de entrada
- `PATCH /api/notificaciones/:id/leer` — Marcar como leída
- `PATCH /api/notificaciones/leer-todas` — Marcar todas

### Admin (requiere rol admin)
- `GET   /admin/stats` — Estadísticas generales
- `GET   /admin/solicitudes` — Listar solicitudes
- `PATCH /admin/solicitudes/:id` — Verificar / denegar pago
- `GET   /admin/publicaciones` — Todas las publicaciones
- `PATCH /admin/publicaciones/:id/activar` — Activar
- `PATCH /admin/publicaciones/:id/desactivar` — Desactivar
- `GET   /admin/postulaciones` — Todas las postulaciones
- `GET   /admin/usuarios` — Todos los usuarios
- `PATCH /admin/usuarios/:id/bloquear` — Bloquear usuario
- `PATCH /admin/usuarios/:id/desbloquear` — Desbloquear
