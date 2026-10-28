# Frontend

Cliente Vue 3 del monitor de hábitos grupales. La guía completa del monorepo está en el [README raíz](../README.md).

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

| Script | Uso |
| --- | --- |
| `npm run dev` | Vite en `http://localhost:5173` |
| `npm run build` | Type-check + bundle de producción |
| `npm run preview` | Sirve el build |

En desarrollo, `VITE_API_URL=/api` usa el proxy local de Vite hacia Express. En la publicación de Render configurada en el repositorio, frontend y API comparten dominio y se conserva `/api`. Solo si luego se alojan por separado se debe configurar esta variable con la URL HTTPS de la API.
