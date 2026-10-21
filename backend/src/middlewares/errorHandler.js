const { randomUUID } = require('node:crypto')

function notFound(_req, _res, next) {
  const error = new Error('Ruta no encontrada')
  error.status = 404
  next(error)
}

function errorHandler(error, req, res, _next) {
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
    error:
      status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : error.message,
    correlationId,
  })
}

module.exports = { notFound, errorHandler }
