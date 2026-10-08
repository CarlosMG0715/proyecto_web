const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../config')

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token no proporcionado',
      correlationId: req.correlationId,
    })
  }

  try {
    req.user = jwt.verify(token, jwtSecret)
    next()
  } catch {
    return res.status(403).json({
      error: 'Token inválido o expirado',
      correlationId: req.correlationId,
    })
  }
}

module.exports = {
  authenticateToken,
}
