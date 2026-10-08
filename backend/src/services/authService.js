const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { prisma } = require('../models')

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_dev_cambiar_en_produccion'
const ACCESS_TOKEN_EXPIRATION = '15m'
const REFRESH_TOKEN_DAYS = 7

/**
 * Servicio de lógica de negocio para autenticación y sesiones.
 */
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

    const user = await prisma.user.create({
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

    return user
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

    // 1. Generar Access Token (vida corta en memoria)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRATION },
    )

    // 2. Generar Refresh Token rotativo
    const refreshToken = crypto.randomBytes(40).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

    // 3. Registrar la sesión en la base de datos
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
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

    // Rotar sesión: revocar la anterior
    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    })

    // Crear nuevo par de tokens
    const newAccessToken = jwt.sign(
      { userId: session.user.id, email: session.user.email, name: session.user.name },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRATION },
    )

    const newRefreshToken = crypto.randomBytes(40).toString('hex')
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: {
        userId: session.user.id,
        tokenHash: newTokenHash,
        userAgent: userAgent || session.userAgent,
        ipAddress: ipAddress || session.ipAddress,
        expiresAt,
      },
    })

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
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
