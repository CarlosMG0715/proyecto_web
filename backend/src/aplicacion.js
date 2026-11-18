const cors = require('cors')
const express = require('express')
const fs = require('node:fs')
const path = require('node:path')
const { timingSafeEqual } = require('node:crypto')
const { origenesPermitidos } = require('./configuracion')
const { idCorrelacion } = require('./middleware/correlacion')
const { rutaNoEncontrada, manejarError } = require('./middleware/manejoErrores')
const apiRoutes = require('./routes/rutas')
const servicioGrupos = require('./services/servicioCierreDiario')

const app = express()

app.use(idCorrelacion)
app.use(
  cors({
    origin: origenesPermitidos,
    credentials: true,
    exposedHeaders: ['x-correlation-id'],
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'habitos-api',
    timestamp: new Date().toISOString(),
  })
})

let dailyClosureRun
app.post('/api/internal/close-group-day', async (req, res) => {
  const secret = process.env.DAILY_CLOSURE_SECRET
  if (!secret) return res.sendStatus(404)

  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(req.get('authorization') || '')
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return res.sendStatus(401)
  }

  dailyClosureRun ??= servicioGrupos.cerrarGruposDelDia().finally(() => {
    dailyClosureRun = undefined
  })
  const processed = await dailyClosureRun
  res.json({ processed })
})

app.use('/api', apiRoutes)

// En producción, el mismo servidor publica la app Vue y la API comparte su origen.
const frontendDist =
  process.env.FRONTEND_DIST_DIR ||
  path.resolve(__dirname, '../../frontend/dist')
const frontendIndex = path.join(frontendDist, 'index.html')

if (fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendDist, { index: false }))
  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path === '/api' ||
      req.path.startsWith('/api/')
    ) {
      return next()
    }

    res.sendFile(frontendIndex, (error) => {
      if (error) next(error)
    })
  })
}

app.use(rutaNoEncontrada)
app.use(manejarError)

module.exports = app
