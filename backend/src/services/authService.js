const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { prisma } = require('../prisma')
const { jwtSecret, accessTokenExpiration, refreshTokenDays } = require('../config')
const { demoEmail, getVerificationEmailConfig, sendVerificationEmail } = require('./verificationEmail')

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
const verificationHash = (token) => crypto.createHash('sha256').update(token).digest('hex')

function newEmailVerification() {
  const token = crypto.randomBytes(32).toString('hex')
  const now = new Date()
  return {
    token,
    fields: {
      emailVerificationHash: verificationHash(token),
      emailVerificationExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      emailVerificationSentAt: now,
    },
  }
}

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
    const normalizedEmail = email.toLowerCase().trim()
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    if (existing) {
      throw httpError('El correo electrónico ya está registrado', 400)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const mailConfig = normalizedEmail === demoEmail() ? getVerificationEmailConfig() : null
    const verification = mailConfig ? newEmailVerification() : null
    const verificationFields = verification
      ? { ...verification.fields, emailVerificationRequired: true }
      : {
          emailVerificationRequired: false,
          emailVerifiedAt: null,
          emailVerificationHash: null,
          emailVerificationExpiresAt: null,
          emailVerificationSentAt: null,
        }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        ...verificationFields,
      },
      select: {
        id: true,
        name: true,
        email: true,
        characterId: true,
        themeId: true,
        createdAt: true,
      },
    }).catch((error) => {
      if (error.code === 'P2002') throw httpError('El correo electrónico ya está registrado', 400)
      throw error
    })

    const verificationSent = verification
      ? await sendVerificationEmail(mailConfig, user.email, verification.token)
      : false
    return { user, verificationSent, verificationRequired: Boolean(verification) }
  }

  async deleteAccount(userId, password) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw httpError('La contraseña no es correcta.', 403)
    }

    try {
      await prisma.$transaction(async tx => {
        const groups = await tx.group.findMany({
          where: { OR: [{ createdById: userId }, { memberships: { some: { userId } } }, { habits: { some: { createdById: userId } } }] },
          select: {
            id: true, createdById: true,
            memberships: { orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] },
          },
        })

        for (const group of groups) {
          const departing = group.memberships.find(member => member.userId === userId)
          const members = group.memberships.filter(member => member.userId !== userId)
          if (!members.length) {
            await tx.group.delete({ where: { id: group.id } })
            continue
          }
          const admin = members.find(member => member.role === 'ADMIN' && !member.fallenAt)
          const successor = admin ?? members.find(member => !member.fallenAt)
            ?? members.find(member => member.role === 'ADMIN') ?? members[0]
          if (successor.role !== 'ADMIN' && (departing?.role === 'ADMIN' || !members.some(member => member.role === 'ADMIN'))) {
            await tx.groupMembership.update({ where: { id: successor.id }, data: { role: 'ADMIN' } })
          }
          if (group.createdById === userId) {
            await tx.group.update({ where: { id: group.id }, data: { createdById: successor.userId } })
          }
          await tx.habit.updateMany({
            where: { groupId: group.id, createdById: userId }, data: { createdById: successor.userId },
          })
        }

        await tx.message.deleteMany({ where: { userId } })
        const deleted = await tx.user.deleteMany({ where: { id: userId, passwordHash: user.passwordHash } })
        if (!deleted.count) throw httpError('La cuenta cambió. Confirma tu contraseña actual e inténtalo de nuevo.', 409)
      }, { isolationLevel: 'Serializable' })
    } catch (error) {
      if (error.code === 'P2034') throw httpError('Hubo un cambio simultáneo. Intenta borrar tu cuenta otra vez.', 409)
      throw error
    }
  }

  async updateAccount({ userId, familyId }, input) {
    if (input.action === 'name') {
      return { user: await prisma.user.update({
        where: { id: userId }, data: { name: input.name },
        select: { id: true, name: true, email: true, characterId: true, themeId: true },
      }) }
    }
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw httpError('La contraseña actual no es correcta.', 403)
    }
    if (input.action === 'password') {
      const passwordHash = await bcrypt.hash(input.newPassword, 12)
      await prisma.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({
          where: { id: userId, passwordHash: user.passwordHash },
          data: { passwordHash },
        })
        if (!updated.count) throw httpError('La cuenta cambió. Inténtalo de nuevo.', 409)
        await tx.session.updateMany({
          where: { userId, familyId: { not: familyId }, isRevoked: false },
          data: { isRevoked: true, revokedAt: new Date() },
        })
      })
      return {}
    }

    throw httpError('Acción de cuenta no válida.', 400)
  }

  async verifyEmail(token) {
    const now = new Date()
    const result = await prisma.user.updateMany({
      where: {
        emailVerificationRequired: true,
        emailVerifiedAt: null,
        emailVerificationHash: verificationHash(token),
        emailVerificationExpiresAt: { gt: now },
      },
      data: {
        emailVerifiedAt: now,
        emailVerificationHash: null,
        emailVerificationExpiresAt: null,
      },
    })
    if (!result.count) throw httpError('El enlace venció o ya se usó. Intenta iniciar sesión o solicita otro enlace.', 400)
  }

  async resendVerification({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw unauthorized('Credenciales inválidas')
    }
    if (user.email !== demoEmail() || user.emailVerifiedAt) {
      throw httpError('Esta cuenta ya puede iniciar sesión.', 409)
    }
    const mailConfig = getVerificationEmailConfig()

    const verification = newEmailVerification()
    const result = await prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerifiedAt: null,
        OR: [
          { emailVerificationSentAt: null },
          { emailVerificationSentAt: { lte: new Date(Date.now() - 60_000) } },
        ],
      },
      data: { ...verification.fields, emailVerificationRequired: true },
    })
    if (!result.count) throw httpError('Espera un minuto antes de solicitar otro enlace.', 429)
    if (!(await sendVerificationEmail(mailConfig, user.email, verification.token))) {
      throw httpError('No pudimos reenviar el correo de verificación.', 503)
    }
  }

  async login({ email, password, userAgent, ipAddress }) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (!user) throw unauthorized('Credenciales inválidas')

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) throw unauthorized('Credenciales inválidas')
    if (user.email === demoEmail() && !user.emailVerifiedAt) {
      throw Object.assign(httpError('Confirma tu correo antes de iniciar sesión.', 403), {
        publicCode: 'EMAIL_VERIFICATION_REQUIRED',
      })
    }

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
