// comprueba el token de acceso antes de dejar pasar a una ruta privada.
const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../config')

function authenticateToken(req, res, next) {
  // espera el formato authorization: bearer <token>.
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token no proporcionado',
      correlationId: req.correlationId,
    })
  }

  try {
    // verify revisa la firma y la expiracion; el resultado identifica al usuario.
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
