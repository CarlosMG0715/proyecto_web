const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { prisma } = require('../prisma')
const { jwtSecret, accessTokenExpiration, refreshTokenDays } = require('../config')

function createAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    jwtSecret,
    { expiresIn: accessTokenExpiration },
  )
}

function createRefreshToken() {
  const refreshToken = crypto.randomBytes(40).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000)
  return { refreshToken, tokenHash, expiresAt }
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  }
}

class AuthService {
  async register({ name, email, password }) {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existing) {
      const error = new Error('El correo electrónico ya está registrado')
      error.status = 400
      throw error
    }

    const passwordHash = await bcrypt.hash(password, 12)

    return prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })
  }

  async login({ email, password, userAgent, ipAddress }) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      const error = new Error('Credenciales inválidas')
      error.status = 401
      throw error
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      const error = new Error('Credenciales inválidas')
      error.status = 401
      throw error
    }

    const accessToken = createAccessToken(user)
    const { refreshToken, tokenHash, expiresAt } = createRefreshToken()

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
    if (!refreshToken) {
      const error = new Error('Refresh token requerido')
      error.status = 401
      throw error
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      const error = new Error('Sesión inválida o expirada')
      error.status = 401
      throw error
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    })

    const accessToken = createAccessToken(session.user)
    const nextRefresh = createRefreshToken()

    await prisma.session.create({
      data: {
        userId: session.user.id,
        tokenHash: nextRefresh.tokenHash,
        userAgent: userAgent || session.userAgent,
        ipAddress: ipAddress || session.ipAddress,
        expiresAt: nextRefresh.expiresAt,
      },
    })

    return {
      accessToken,
      refreshToken: nextRefresh.refreshToken,
      user: publicUser(session.user),
    }
  }

  async logout({ refreshToken }) {
    if (!refreshToken) return

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    await prisma.session.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    })
  }

  async revokeAllUserSessions(userId) {
    await prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    })
  }
}

module.exports = new AuthService()
