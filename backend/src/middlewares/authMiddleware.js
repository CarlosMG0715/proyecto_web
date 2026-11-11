const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../config')
const { prisma } = require('../prisma')

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization
  const token = typeof authHeader === 'string'
    ? /^Bearer\s+(\S+)$/i.exec(authHeader)?.[1]
    : undefined

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token no proporcionado',
      correlationId: req.correlationId,
    })
  }

  let user
  try {
    user = jwt.verify(token, jwtSecret)
  } catch {
    return res.status(401).json({
      error: 'Token inválido o expirado',
      correlationId: req.correlationId,
    })
  }

  req.user = user

  if (!user || typeof user !== 'object' || typeof user.userId !== 'string') {
    return res.status(401).json({
      error: 'Token inválido',
      correlationId: req.correlationId,
    })
  }

  // El access token tambien debe pertenecer a una sesion que siga activa.
  if (typeof req.user.familyId !== 'string' || !req.user.familyId) {
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
