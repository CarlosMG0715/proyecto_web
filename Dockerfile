# Compila Vue y sirve sus archivos desde Express para mantener la API y la sesión
# bajo el mismo origen en producción.
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim AS app
ENV NODE_ENV=production
WORKDIR /app/backend
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Prisma necesita el esquema disponible durante npm ci para generar su cliente.
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma/ ./prisma/
# El arranque usa el CLI de Prisma para aplicar las migraciones.
RUN npm ci --include=dev

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

ENV FRONTEND_DIST_DIR=/app/frontend/dist
EXPOSE 10000
CMD ["sh", "-c", "npm run db:deploy && npm start"]
