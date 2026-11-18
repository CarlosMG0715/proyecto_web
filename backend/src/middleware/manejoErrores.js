const { randomUUID } = require('node:crypto')

function rutaNoEncontrada(_req, _res, next) {
  const error = new Error('Ruta no encontrada')
  error.status = 404
  next(error)
}

function manejarError(error, req, res, _next) {
  // registra contexto y elige el mensaje que se envia a quien hizo la peticion.
  const status = Number.isInteger(error.status) ? error.status : 500
  const idCorrelacion = req.idCorrelacion || randomUUID()

  console.error(
    JSON.stringify({
      level: status >= 500 ? 'error' : 'warn',
      message: error.message,
      name: error.name,
      status,
      idCorrelacion,
    }),
  )

  res.status(status).json({
    ...(error.publicCode ? { code: error.publicCode } : {}),
    error:
      status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : error.message,
    idCorrelacion,
  })
}

module.exports = { rutaNoEncontrada, manejarError }
