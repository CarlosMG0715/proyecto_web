// configuracion principal de express: middleware, rutas y respuestas de error.
const cors = require('cors')
const express = require('express')
const fs = require('node:fs')
const path = require('node:path')
const { allowedOrigins } = require('./config')
const { correlationId } = require('./middlewares/correlation')
const { notFound, errorHandler } = require('./middlewares/errorHandler')
const apiRoutes = require('./routes')

const app = express()

app.use(correlationId)
// permite cookies del frontend en los origenes que se configuraron.
app.use(cors({ origin: allowedOrigins, credentials: true, exposedHeaders: ['x-correlation-id'] }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  // endpoint simple para saber si el proceso responde.
  res.status(200).json({
    status: 'ok',
    service: 'habitos-api',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api', apiRoutes)

// En producción, el mismo servidor publica la app Vue y la API comparte su origen.
const frontendDist = process.env.FRONTEND_DIST_DIR || path.resolve(__dirname, '../../Frontend/dist')
const frontendIndex = path.join(frontendDist, 'index.html')

if (fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendDist, { index: false }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path === '/api' || req.path.startsWith('/api/')) {
      return next()
    }

    res.sendFile(frontendIndex, (error) => {
      if (error) next(error)
    })
  })
}

app.use(notFound)
app.use(errorHandler)

module.exports = app
