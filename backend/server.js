require('dotenv').config()

const { randomUUID } = require('node:crypto')
const cors = require('cors')
const express = require('express')

const app = express()
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use((req, res, next) => {
  const suppliedId = req.get('x-correlation-id')
  const correlationId =
    suppliedId && /^[a-zA-Z0-9._-]{1,128}$/.test(suppliedId) ? suppliedId : randomUUID()

  req.correlationId = correlationId
  res.setHeader('x-correlation-id', correlationId)
  next()
})

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '1mb' }))

const apiRoutes = require('./src/routes')

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'habitos-api',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api', apiRoutes)

app.use((_req, _res, next) => {
  const error = new Error('Ruta no encontrada')
  error.status = 404
  next(error)
})

app.use((error, req, res, _next) => {
  const status = Number.isInteger(error.status) ? error.status : 500
  const correlationId = req.correlationId || randomUUID()

  console.error(
    JSON.stringify({
      level: status >= 500 ? 'error' : 'warn',
      message: error.message,
      name: error.name,
      status,
      correlationId,
    }),
  )

  res.status(status).json({
    error: status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : error.message,
    correlationId,
  })
})

if (require.main === module) {
  const port = Number(process.env.PORT || 3000)
  const server = app.listen(port, () => {
    console.log(`API escuchando en http://localhost:${port}`)
  })

  const shutdown = (signal) => {
    console.log(`Recibida señal ${signal}; cerrando servidor`)
    server.close(async (error) => {
      if (error) {
        console.error(error)
        process.exitCode = 1
      }

      const prismaModule = require.cache[require.resolve('./src/prisma')]
      if (prismaModule) {
        await prismaModule.exports.prisma.$disconnect()
      }
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

module.exports = app
