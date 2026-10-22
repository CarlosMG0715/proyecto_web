# Monitor de hábitos grupales

Aplicación web para seguimiento de hábitos en grupo, detección de incumplimientos y penalizaciones colectivas.

## Estructura del repositorio

```text
proyecto_web/
├── README.md
├── backend/                 API Express + Prisma + PostgreSQL
│   ├── server.js            Arranque HTTP y cierre ordenado
│   ├── src/
│   │   ├── app.js           Middlewares, CORS, rutas y errores
│   │   ├── config.js        Orígenes CORS, JWT y cookies
│   │   ├── prisma.js        Cliente Prisma compartido
│   │   ├── controllers/     Adaptan HTTP a servicios
│   │   ├── middlewares/     Auth, correlation-id y errores
│   │   ├── routes/          Endpoints `/api`
│   │   ├── services/        Reglas de negocio
│   │   └── utils/           Lectura de cookies
│   └── prisma/              Esquema, migraciones y seed
└── Frontend/                Cliente Vue 3 + TypeScript + Vite
    └── src/
        ├── assets/styles/   Estilos globales
        ├── components/      Piezas reutilizables (Navbar)
        ├── layouts/         AuthLayout y AppLayout
        ├── views/           Páginas (inicio, login, grupos)
        ├── router/          Rutas y guards
        ├── stores/          Sesión en Pinia (access token en memoria)
        ├── services/        Cliente Axios
        └── types/           Contratos TypeScript
```

El directorio del cliente se llama `Frontend` (mayúscula) porque así está versionado. En Windows no conviene renombrarlo a `frontend` sin un `git mv` coordinado.

## Qué se reorganizó y por qué

En `fix/reorganize-workspace` se limpió lo que no formaba parte de la aplicación:

| Cambio | Motivo |
| --- | --- |
| Se eliminó `backend/src/models/` | Prisma ya es el modelo. El archivo solo reexportaba el cliente y duplicaba la ruta de importación. |
| Se eliminaron `node-cron` y `socket.io` del backend, y `socket.io-client` del frontend | Estaban en `package.json` y no se importaban en ningún archivo. |
| Se eliminó `Frontend/src/assets/s/hola.img` | Archivo vacío, sin referencias. Era un placeholder. |
| `server.js` se partió en `src/app.js` y middlewares | El arranque HTTP no debe mezclarse con CORS, 404 y el manejador de errores. |
| JWT, CORS y cookies viven en `src/config.js` | Evita secretos y opciones duplicadas entre middleware y servicio. |
| `styles.css` pasa a reset global e `index.html` usa título e idioma reales | El CSS vacío no se cargaba; la plantilla de Vite no describe el producto. |
| README del frontend deja de ser el de la plantilla Vue | La documentación del proyecto vive aquí; el frontend solo resume sus scripts. |

Las carpetas de agentes (`.agents`, `.claude`, `.cursor`, `.devin`) no pertenecen al runtime y no se versionan.

## Desarrollo local

Requisitos: Node.js 22.18 o superior, npm y Docker para PostgreSQL.

### Backend

```powershell
cd backend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run db:generate
docker compose up -d db
npm run db:deploy
npm run db:seed
npm run dev
```

El servidor usa el puerto `3000` por defecto. `GET http://localhost:3000/api/health` comprueba que está activo.

Si ya tienes un `.env`, conserva sus valores y agrega las variables que falten de `.env.example` (incluido `JWT_SECRET`). El ejemplo configura PostgreSQL local en Docker; cambia la contraseña de desarrollo antes de ejecutar el seed. No uses esas credenciales en producción.

Para cambios posteriores al esquema, usa `npm run db:migrate -- --name nombre_del_cambio` en desarrollo y sube el SQL generado en `prisma/migrations`. En despliegues aplica las migraciones versionadas con `npm run db:deploy`.

### Frontend

```powershell
cd Frontend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Vite inicia normalmente en `http://localhost:5173`. `VITE_API_URL` apunta a `http://localhost:3000/api`.

## API de autenticación (fase actual)

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Salud del servicio |
| `POST` | `/api/auth/register` | No | Alta de usuario |
| `POST` | `/api/auth/login` | No | Access token en JSON + refresh en cookie HttpOnly |
| `POST` | `/api/auth/refresh` | Cookie | Rota refresh y emite un access token nuevo |
| `POST` | `/api/auth/logout` | Cookie | Revoca la sesión actual |
| `POST` | `/api/auth/logout-all` | Bearer | Revoca todas las sesiones del usuario |
| `GET` | `/api/auth/me` | Bearer | Payload del access token |

El access token no se guarda en `localStorage`; vive en el store de Pinia. El refresh token va en cookie `refreshToken` con `path=/api/auth`.

## Personalización por cuenta

El personaje (`User.characterId`) y el tema (`User.themeId`) se guardan en PostgreSQL para el usuario autenticado. El navegador conserva una caché, pero al iniciar sesión se carga la elección del servidor, también en incógnito. Las cuentas se identifican por su ID, sin mezclar preferencias de personas con el mismo nombre.

- `GET /api/profile/preferences` carga la personalización de la cuenta.
- `PATCH /api/profile/preferences` guarda `characterId`, `themeId` o ambos. El usuario se obtiene del token, no del cuerpo de la petición.
- Login y renovación de sesión incluyen el personaje y el tema guardados.
- La lista de grupos incluye los avatares actuales de sus miembros. La interfaz los actualiza cada 15 segundos mientras está visible y al volver a la ventana.

En Perfil, el estado **Guardado en tu cuenta** aparece después de la confirmación del servidor. Si el guardado falla, se muestra un aviso con **Reintentar**. Tras aplicar por primera vez la migración `20261021120000_profile_preferences_and_group_join_requests`, vuelve a elegir el personaje y el tema que antes estaban guardados solo en el navegador.

Esto cubre la personalización y su visibilidad entre miembros. Los check-ins, el chat y las penalizaciones todavía conservan su implementación local.

## Base técnica

- Express 5 con CORS configurable, JSON limitado a 1 MB, `x-correlation-id` y errores centralizados.
- PostgreSQL 16 en Docker Compose y Prisma 6.19.0 (usuarios, grupos, membresías, hábitos, check-ins, penalizaciones, mensajes y sesiones).
- Seed idempotente: usuario administrador y grupo `HABITOS-DEMO`. Requiere `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` (mínimo 12 caracteres) en `backend/.env`.
- Vue 3, TypeScript, Vue Router, Pinia y Axios con `withCredentials`.
- Autenticación, personalización, creación de grupos y solicitudes de ingreso tienen API. El progreso diario, el chat y las penalizaciones todavía requieren persistencia en el servidor.
