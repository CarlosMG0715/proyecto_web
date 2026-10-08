const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_dev_cambiar_en_produccion'

/**
 * Middleware para autenticar peticiones mediante Access Token (Bearer JWT).
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token no proporcionado',
      correlationId: req.correlationId,
    })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (error) {
    return res.status(403).json({
      error: 'Token inválido o expirado',
      correlationId: req.correlationId,
    })
  }
}

module.exports = {
  authenticateToken,
}
