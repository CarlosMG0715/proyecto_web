const jwt = require('jsonwebtoken')
const { secretoJwt } = require('../configuracion')
const { prisma } = require('../conexionBaseDatos')

async function verificarToken(req, res, next) {
  const cabeceraAutorizacion = req.headers.authorization
  const token =
    typeof cabeceraAutorizacion === 'string'
      ? /^Bearer\s+(\S+)$/i.exec(cabeceraAutorizacion)?.[1]
      : undefined

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token no proporcionado',
      idCorrelacion: req.idCorrelacion,
    })
  }

  let user
  try {
    user = jwt.verify(token, secretoJwt)
  } catch {
    return res.status(401).json({
      error: 'Token inválido o expirado',
      idCorrelacion: req.idCorrelacion,
    })
  }

  req.user = user

  if (!user || typeof user !== 'object' || typeof user.idUsuario !== 'string') {
    return res.status(401).json({
      error: 'Token inválido',
      idCorrelacion: req.idCorrelacion,
    })
  }

  // El access token tambien debe pertenecer a una sesion que siga activa.
  if (typeof req.user.idFamilia !== 'string' || !req.user.idFamilia) {
    return res.status(401).json({
      error: 'La sesión debe renovarse',
      idCorrelacion: req.idCorrelacion,
    })
  }

  const sesionActiva = await prisma.sesion.findFirst({
    where: {
      idUsuario: req.user.idUsuario,
      idFamilia: req.user.idFamilia,
      revocado: false,
      venceEn: { gt: new Date() },
    },
    select: { id: true },
  })

  if (!sesionActiva) {
    return res.status(401).json({
      error: 'Esta sesión fue cerrada o expiró',
      idCorrelacion: req.idCorrelacion,
    })
  }

  next()
}

module.exports = {
  verificarToken,
}
