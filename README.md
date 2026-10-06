# Monitor de habitos grupales

Aplicacion web para seguimiento de habitos en grupo, deteccion de incumplimientos y penalizaciones colectivas.

## Desarrollo local

Requisitos: Node.js 22.18 o superior y npm.

### Frontend

```powershell
cd Frontend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Vite inicia normalmente en `http://localhost:5173`. La variable `VITE_API_URL` apunta al backend.

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

El servidor usa el puerto `3000` por defecto. `GET http://localhost:3000/api/health` comprueba que está activo. Si ya tienes un `.env`, conserva sus valores y agrega las variables que falten del `.env.example`. El ejemplo configura PostgreSQL local en Docker; cambia la contraseña de desarrollo antes de ejecutar el seed. No uses esas credenciales de ejemplo en producción.

Para cambios posteriores al esquema, usa `npm run db:migrate -- --name nombre_del_cambio` en desarrollo y sube el SQL generado en `prisma/migrations`. En despliegues aplica las migraciones versionadas con `npm run db:deploy`.

## Base técnica actual

- Backend Express con CORS configurable, JSON limitado, endpoint de salud, errores centralizados y `x-correlation-id`.
- PostgreSQL 16 en Docker Compose y Prisma CLI/Client 6.19.0, con migración inicial para usuarios, grupos, membresías, hábitos, check-ins, penalizaciones y mensajes.
- Seed idempotente para crear un usuario administrador local y un grupo de demostración; requiere `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` definidos en `backend/.env`.
- Singleton Prisma en `backend/src/prisma.js`.
- Frontend Vue 3 con TypeScript, Vue Router, Pinia y cliente Axios con credenciales para cookies.
- El access token se mantiene solo en memoria; el inicio de sesión y la renovación de tokens se implementan en la Fase 1.
