// reglas de autenticacion: contraseñas, tokens cortos y refresh tokens revocables.
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { prisma } = require('../prisma')
const { jwtSecret, accessTokenExpiration, refreshTokenDays } = require('../config')

const refreshPepper = process.env.REFRESH_TOKEN_PEPPER
if (!refreshPepper) {
  throw new Error('Falta REFRESH_TOKEN_PEPPER en el .env')
}

function httpError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

const unauthorized = (message = 'Sesión inválida o expirada') => httpError(message, 401)

function hashToken(token) {
  // guarda una huella del refresh en la base, no el secreto del navegador.
  return crypto.createHmac('sha256', refreshPepper).update(token).digest('hex')
}

function createAccessToken(user, familyId) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, familyId },
    jwtSecret,
    { expiresIn: accessTokenExpiration },
  )
}

function createRefreshToken() {
  const refreshToken = crypto.randomBytes(40).toString('hex')
  const tokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000)
  return { refreshToken, tokenHash, expiresAt }
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    characterId: user.characterId,
    themeId: user.themeId,
  }
}

async function revokeFamily(familyId) {
  await prisma.session.updateMany({
    where: { familyId, isRevoked: false },
    data: { isRevoked: true, revokedAt: new Date() },
  })
}

class AuthService {
  async register({ name, email, password }) {
    // normaliza el correo y crea una contraseña cifrada con bcrypt.
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existing) {
      throw httpError('El correo electrónico ya está registrado', 400)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    return prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        characterId: true,
        themeId: true,
        createdAt: true,
      },
    })
  }

  async login({ email, password, userAgent, ipAddress }) {
    // revisa credenciales y abre una sesion con refresh token rotativo.
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (!user) throw unauthorized('Credenciales inválidas')

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) throw unauthorized('Credenciales inválidas')

    const { refreshToken, tokenHash, expiresAt } = createRefreshToken()

    // familyId se genera solo (@default(cuid())): cada login abre una familia nueva
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        expiresAt,
      },
    })
    const accessToken = createAccessToken(user, session.familyId)

    return {
      accessToken,
      refreshToken,
      user: publicUser(user),
    }
  }

  async refresh({ refreshToken, userAgent, ipAddress }) {
    // valida el refresh anterior, lo revoca y entrega una nueva pareja de tokens.
    if (!refreshToken) throw unauthorized('Refresh token requerido')

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    })
    if (!session) throw unauthorized()

    // Token ya rotado o revocado: posible robo. Se invalida toda la familia.
    if (session.isRevoked) {
      await revokeFamily(session.familyId)
      throw unauthorized()
    }

    if (session.expiresAt < new Date()) throw unauthorized()

    const nextRefresh = createRefreshToken()
    const now = new Date()

    try {
      await prisma.$transaction(async (tx) => {
        // Reclamo atómico: solo una petición concurrente puede rotar este token
        const claimed = await tx.session.updateMany({
          where: { id: session.id, isRevoked: false },
          data: { isRevoked: true, revokedAt: now, lastUsedAt: now },
        })
        if (claimed.count === 0) throw new Error('REUSE_DETECTED')

        const created = await tx.session.create({
          data: {
            userId: session.userId,
            familyId: session.familyId,
            tokenHash: nextRefresh.tokenHash,
            userAgent: userAgent || session.userAgent,
            ipAddress: ipAddress || session.ipAddress,
            expiresAt: nextRefresh.expiresAt,
          },
        })

        await tx.session.update({
          where: { id: session.id },
          data: { replacedById: created.id },
        })
      })
    } catch (err) {
      if (err.message === 'REUSE_DETECTED') {
        await revokeFamily(session.familyId)
        throw unauthorized()
      }
      throw err
    }

    return {
      accessToken: createAccessToken(session.user, session.familyId),
      refreshToken: nextRefresh.refreshToken,
      user: publicUser(session.user),
    }
  }

  async revokeSession({ userId, sessionId, refreshToken }) {
    if (!refreshToken) {
      throw httpError('No se pudo identificar este dispositivo', 401)
    }

    const currentSession = await prisma.session.findFirst({
      where: {
        tokenHash: hashToken(refreshToken),
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: { familyId: true },
    })

    if (!currentSession) {
      throw httpError('La sesión actual ya no está activa', 401)
    }

    const targetSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: { familyId: true },
    })

    if (!targetSession) {
      throw httpError('No encontramos esa sesión activa', 404)
    }

    if (targetSession.familyId === currentSession.familyId) {
      throw httpError('No puedes cerrar este dispositivo desde aquí', 409)
    }

    await prisma.session.updateMany({
      where: {
        userId,
        familyId: targetSession.familyId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    })

    return { revoked: true }
  }




  async logout({ refreshToken }) {
    // invalida la sesion asociada al refresh recibido.
    if (!refreshToken) return

    await prisma.session.updateMany({
      where: { tokenHash: hashToken(refreshToken), isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    })
  }

  // Lista los inicios de sesión vigentes y señala el dispositivo actual.
  async listSessions({ userId, refreshToken }) {
    const now = new Date()
    const currentSession = refreshToken
      ? await prisma.session.findFirst({
          where: {
            tokenHash: hashToken(refreshToken),
            userId,
            isRevoked: false,
            expiresAt: { gt: now },
          },
          select: { familyId: true },
        })
      : null

    // Busca las sesiones vigentes de esta cuenta.
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        familyId: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Envía a la pantalla los datos visibles y marca la sesión actual.
    return sessions.map(({ familyId, ...session }) => ({
      ...session,
      isCurrent: familyId === currentSession?.familyId,
    }))
  }





  async revokeAllUserSessions(userId, password) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw unauthorized('La contraseña no es correcta')
    }

    await prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    })
  }
}


module.exports = new AuthService()
