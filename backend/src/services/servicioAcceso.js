const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { prisma } = require('../conexionBaseDatos')
const {
  secretoJwt,
  accessTokenExpiration,
  refreshTokenDays,
} = require('../configuracion')

const refreshPepper = process.env.REFRESH_TOKEN_PEPPER
if (!refreshPepper) {
  throw new Error('Falta REFRESH_TOKEN_PEPPER en el .env')
}

function crearErrorHttp(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

const accesoDenegado = (message = 'Sesión inválida o expirada') =>
  crearErrorHttp(message, 401)

// Tokens y datos de sesión
function calcularHashToken(token) {
  // La base guarda una huella del token de renovación.
  return crypto.createHmac('sha256', refreshPepper).update(token).digest('hex')
}

function crearTokenAcceso(user, idFamilia) {
  return jwt.sign(
    { idUsuario: user.id, email: user.email, name: user.name, idFamilia },
    secretoJwt,
    { expiresIn: accessTokenExpiration },
  )
}

function crearTokenRenovacion() {
  const tokenRenovacion = crypto.randomBytes(40).toString('hex')
  const hashToken = calcularHashToken(tokenRenovacion)
  const venceEn = new Date(
    Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000,
  )
  return { tokenRenovacion, hashToken, venceEn }
}

function usuarioPublico(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    idPersonaje: user.idPersonaje,
    idTema: user.idTema,
  }
}

async function revocarFamilia(idFamilia) {
  await prisma.sesion.updateMany({
    where: { idFamilia, revocado: false },
    data: { revocado: true, revocadoEn: new Date() },
  })
}

// Registro y cambios de cuenta
async function register({ name, email, password }) {
  const correoNormalizado = email.toLowerCase().trim()
  const cuentaExistente = await prisma.usuario.findUnique({
    where: { email: correoNormalizado },
  })
  if (cuentaExistente) {
    throw crearErrorHttp('El correo electrónico ya está registrado', 400)
  }

  const hashContrasena = await bcrypt.hash(password, 12)

  const user = await prisma.usuario
    .create({
      data: {
        name: name.trim(),
        email: correoNormalizado,
        hashContrasena,
      },
      select: {
        id: true,
        name: true,
        email: true,
        idPersonaje: true,
        idTema: true,
        creadoEn: true,
      },
    })
    .catch((error) => {
      if (error.code === 'P2002')
        throw crearErrorHttp('El correo electrónico ya está registrado', 400)
      throw error
    })

  return { user }
}

// Conserva los grupos con integrantes y reasigna sus hábitos.
async function reorganizarGruposDeCuenta(tx, idUsuario) {
  const grupos = await tx.grupo.findMany({
    where: {
      OR: [
        { idCreador: idUsuario },
        { membresias: { some: { idUsuario } } },
        { habits: { some: { idCreador: idUsuario } } },
      ],
    },
    select: {
      id: true,
      idCreador: true,
      membresias: { orderBy: [{ ingresoEn: 'asc' }, { id: 'asc' }] },
    },
  })

  for (const grupo of grupos) {
    const saliente = grupo.membresias.find(
      (integrante) => integrante.idUsuario === idUsuario,
    )
    const integrantes = grupo.membresias.filter(
      (integrante) => integrante.idUsuario !== idUsuario,
    )
    if (!integrantes.length) {
      await tx.grupo.delete({ where: { id: grupo.id } })
      continue
    }
    const admin = integrantes.find(
      (integrante) => integrante.role === 'ADMIN' && !integrante.caidoEn,
    )
    const sucesor =
      admin ??
      integrantes.find((integrante) => !integrante.caidoEn) ??
      integrantes.find((integrante) => integrante.role === 'ADMIN') ??
      integrantes[0]
    if (
      sucesor.role !== 'ADMIN' &&
      (saliente?.role === 'ADMIN' ||
        !integrantes.some((integrante) => integrante.role === 'ADMIN'))
    ) {
      await tx.membresiaGrupo.update({
        where: { id: sucesor.id },
        data: { role: 'ADMIN' },
      })
    }
    if (grupo.idCreador === idUsuario) {
      await tx.grupo.update({
        where: { id: grupo.id },
        data: { idCreador: sucesor.idUsuario },
      })
    }
    await tx.habito.updateMany({
      where: { idGrupo: grupo.id, idCreador: idUsuario },
      data: { idCreador: sucesor.idUsuario },
    })
  }
}

async function eliminarCuenta(idUsuario, password) {
  const user = await prisma.usuario.findUnique({
    where: { id: idUsuario },
    select: { hashContrasena: true },
  })
  if (!user || !(await bcrypt.compare(password, user.hashContrasena))) {
    throw crearErrorHttp('La contraseña no es correcta.', 403)
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        await reorganizarGruposDeCuenta(tx, idUsuario)

        await tx.mensaje.deleteMany({ where: { idUsuario } })
        const cuentaEliminada = await tx.usuario.deleteMany({
          where: { id: idUsuario, hashContrasena: user.hashContrasena },
        })
        if (!cuentaEliminada.count)
          throw crearErrorHttp(
            'La cuenta cambió. Confirma tu contraseña actual e inténtalo de nuevo.',
            409,
          )
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (error) {
    if (error.code === 'P2034')
      throw crearErrorHttp(
        'Hubo un cambio simultáneo. Intenta borrar tu cuenta otra vez.',
        409,
      )
    throw error
  }
}

async function actualizarCuenta({ idUsuario, idFamilia }, input) {
  if (input.action === 'name') {
    return {
      user: await prisma.usuario.update({
        where: { id: idUsuario },
        data: { name: input.name },
        select: {
          id: true,
          name: true,
          email: true,
          idPersonaje: true,
          idTema: true,
        },
      }),
    }
  }
  const user = await prisma.usuario.findUnique({ where: { id: idUsuario } })
  if (!user || !(await bcrypt.compare(input.password, user.hashContrasena))) {
    throw crearErrorHttp('La contraseña actual no es correcta.', 403)
  }
  if (input.action === 'password') {
    const hashContrasena = await bcrypt.hash(input.nuevaContrasena, 12)
    await prisma.$transaction(async (tx) => {
      const cuentaActualizada = await tx.usuario.updateMany({
        where: { id: idUsuario, hashContrasena: user.hashContrasena },
        data: { hashContrasena },
      })
      if (!cuentaActualizada.count)
        throw crearErrorHttp('La cuenta cambió. Inténtalo de nuevo.', 409)
      await tx.sesion.updateMany({
        where: { idUsuario, idFamilia: { not: idFamilia }, revocado: false },
        data: { revocado: true, revocadoEn: new Date() },
      })
    })
    return {}
  }

  throw crearErrorHttp('Acción de cuenta no válida.', 400)
}

// Inicio, renovación y cierre de sesión
async function login({ email, password, agenteUsuario, direccionIp }) {
  const user = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase().trim() },
  })
  if (!user) throw accesoDenegado('Credenciales inválidas')

  const contrasenaValida = await bcrypt.compare(password, user.hashContrasena)
  if (!contrasenaValida) throw accesoDenegado('Credenciales inválidas')
  const { tokenRenovacion, hashToken, venceEn } = crearTokenRenovacion()

  // idFamilia se genera solo (@default(cuid())): cada login abre una familia nueva
  const session = await prisma.sesion.create({
    data: {
      idUsuario: user.id,
      hashToken,
      agenteUsuario: agenteUsuario || null,
      direccionIp: direccionIp || null,
      venceEn,
    },
  })
  const tokenAcceso = crearTokenAcceso(user, session.idFamilia)

  return {
    tokenAcceso,
    tokenRenovacion,
    user: usuarioPublico(user),
  }
}

async function refresh({ tokenRenovacion, agenteUsuario, direccionIp }) {
  // Cada renovación reemplaza el token anterior.
  if (!tokenRenovacion) throw accesoDenegado('Refresh token requerido')

  const session = await prisma.sesion.findUnique({
    where: { hashToken: calcularHashToken(tokenRenovacion) },
    include: { user: true },
  })
  if (!session) throw accesoDenegado()

  // Token ya rotado o revocado: posible robo. Se invalida toda la familia.
  if (session.revocado) {
    await revocarFamilia(session.idFamilia)
    throw accesoDenegado()
  }

  if (session.venceEn < new Date()) throw accesoDenegado()

  const siguienteRenovacion = crearTokenRenovacion()
  const now = new Date()

  try {
    await prisma.$transaction(async (tx) => {
      // Solo una solicitud puede renovar el mismo token.
      const sesionRevocada = await tx.sesion.updateMany({
        where: { id: session.id, revocado: false },
        data: { revocado: true, revocadoEn: now, ultimoUsoEn: now },
      })
      if (sesionRevocada.count === 0) throw new Error('REUSE_DETECTED')

      const sesionNueva = await tx.sesion.create({
        data: {
          idUsuario: session.idUsuario,
          idFamilia: session.idFamilia,
          hashToken: siguienteRenovacion.hashToken,
          agenteUsuario: agenteUsuario || session.agenteUsuario,
          direccionIp: direccionIp || session.direccionIp,
          venceEn: siguienteRenovacion.venceEn,
        },
      })

      await tx.sesion.update({
        where: { id: session.id },
        data: { idReemplazo: sesionNueva.id },
      })
    })
  } catch (err) {
    if (err.message === 'REUSE_DETECTED') {
      await revocarFamilia(session.idFamilia)
      throw accesoDenegado()
    }
    throw err
  }

  return {
    tokenAcceso: crearTokenAcceso(session.user, session.idFamilia),
    tokenRenovacion: siguienteRenovacion.tokenRenovacion,
    user: usuarioPublico(session.user),
  }
}

async function logout({ tokenRenovacion }) {
  if (!tokenRenovacion) return

  await prisma.sesion.updateMany({
    where: { hashToken: calcularHashToken(tokenRenovacion), revocado: false },
    data: { revocado: true, revocadoEn: new Date() },
  })
}

module.exports = { register, eliminarCuenta, actualizarCuenta, login, refresh, logout }
