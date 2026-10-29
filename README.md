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

Vite inicia normalmente en `http://localhost:5173` y reenvía `/api` a Express en `http://localhost:3000`. En despliegues, `VITE_API_URL` puede apuntar a la URL HTTPS de la API.

## Usar grupos desde otros computadores

En desarrollo local, las cuentas y los grupos se guardan en el PostgreSQL de este computador. Para que Carlos y otras personas vean los mismos grupos, todos deben entrar a la misma app publicada y esa app debe conectarse a una sola base de datos PostgreSQL en la nube.

La configuración `render.yaml` publica el frontend y Express bajo el mismo dominio, conecta una base PostgreSQL y aplica las migraciones al iniciar. En Render, crea un Blueprint desde la rama que quieras publicar. Está configurado con los planes gratuitos para probarlo sin cobro: Render indica que la base expira después de 30 días y el servidor web se duerme tras 15 minutos sin tráfico; al volver a abrir la app puede tardar alrededor de un minuto en despertar. Antes del vencimiento, exporta la base o cámbiala a un plan pago si necesitas conservar los datos.

Después del despliegue, cada integrante se registra en la URL compartida. Quien cree el grupo comparte su código de invitación; el resto lo ingresa desde sus propias cuentas. Las cuentas y grupos que existen solo en el PostgreSQL local no aparecen automáticamente en la base publicada.

El cliente usa `/api` en desarrollo y producción. Si más adelante frontend y API se publican en dominios separados, configura `VITE_API_URL` con la URL HTTPS de la API, agrega el dominio del cliente a `CORS_ORIGINS` y ajusta `COOKIE_SAME_SITE=none` para las cookies entre dominios.

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

La personalización, los check-ins y el chat se guardan en el servidor. Las rachas y los días cumplidos se calculan desde los check-ins guardados, por cuenta y por grupo. Los corazones siguen como indicador visual; todavía falta implementar el cierre diario y las penalizaciones automáticas.

## Base técnica

- Express 5 con CORS configurable, JSON limitado a 1 MB, `x-correlation-id` y errores centralizados.
- PostgreSQL 16 en Docker Compose y Prisma 6.19.0 (usuarios, grupos, membresías, hábitos, check-ins, penalizaciones, mensajes y sesiones).
- Seed idempotente: usuario administrador y grupo `HABITOS-DEMO`. Requiere `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` (mínimo 12 caracteres) en `backend/.env`.
- Vue 3, TypeScript, Vue Router, Pinia y Axios con `withCredentials`.
- Autenticación, personalización, grupos, solicitudes de ingreso, hábitos, check-ins e historial del chat tienen API. Falta definir y programar el cierre diario que actualiza la salud del grupo y aplica penalizaciones.
