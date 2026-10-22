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
  return crypto.createHmac('sha256', refreshPepper).update(token).digest('hex')
}

function createAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
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
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (!user) throw unauthorized('Credenciales inválidas')

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) throw unauthorized('Credenciales inválidas')

    const accessToken = createAccessToken(user)
    const { refreshToken, tokenHash, expiresAt } = createRefreshToken()

    // familyId se genera solo (@default(cuid())): cada login abre una familia nueva
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        expiresAt,
      },
    })

    return {
      accessToken,
      refreshToken,
      user: publicUser(user),
    }
  }

  async refresh({ refreshToken, userAgent, ipAddress }) {
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
      accessToken: createAccessToken(session.user),
      refreshToken: nextRefresh.refreshToken,
      user: publicUser(session.user),
    }
  }

  async logout({ refreshToken }) {
    if (!refreshToken) return

    await prisma.session.updateMany({
      where: { tokenHash: hashToken(refreshToken), isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    })
  }

  async revokeAllUserSessions(userId) {
    await prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    })
  }
}

module.exports = new AuthService()
