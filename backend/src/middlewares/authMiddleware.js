// comprueba el token de acceso antes de dejar pasar a una ruta privada.
const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../config')
const { prisma } = require('../prisma')

async function authenticateToken(req, res, next) {
  // espera el formato authorization: bearer <token>.
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token no proporcionado',
      correlationId: req.correlationId,
    })
  }

  let user
  try {
    // verify revisa la firma y la expiracion; el resultado identifica al usuario.
    user = jwt.verify(token, jwtSecret)
  } catch {
    return res.status(403).json({
      error: 'Token inválido o expirado',
      correlationId: req.correlationId,
    })
  }

  req.user = user

  // El access token tambien debe pertenecer a una sesion que siga activa.
  if (!req.user.familyId) {
    return res.status(401).json({
      error: 'La sesión debe renovarse',
      correlationId: req.correlationId,
    })
  }

  const activeSession = await prisma.session.findFirst({
    where: {
      userId: req.user.userId,
      familyId: req.user.familyId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })

  if (!activeSession) {
    return res.status(401).json({
      error: 'Esta sesión fue cerrada o expiró',
      correlationId: req.correlationId,
    })
  }

  next()
}

module.exports = {
  authenticateToken,
}
