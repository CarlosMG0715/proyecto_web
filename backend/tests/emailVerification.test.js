const assert = require('node:assert/strict')
const test = require('node:test')
const bcrypt = require('bcrypt')

process.env.REFRESH_TOKEN_PEPPER = 'test-pepper'
process.env.APP_PUBLIC_URL = 'https://kordia.example.test'
process.env.RESEND_API_KEY = 'test-key'
process.env.EMAIL_FROM = 'Kordia <cuentas@example.test>'

const prisma = { user: {}, session: {} }
const prismaPath = require.resolve('../src/prisma')
require.cache[prismaPath] = { exports: { prisma } }
const authService = require('../src/services/authService')
delete require.cache[prismaPath]

const credentials = { email: 'valeria@example.test', password: 'password123' }
process.env.DEMO_EMAIL = credentials.email

function fakeDatabase(initialUser) {
  let user = initialUser
  prisma.user.findUnique = async () => user && { ...user }
  prisma.user.create = async ({ data, select }) => {
    user = { id: 'user-1', emailVerificationRequired: true, emailVerifiedAt: null, ...data }
    return Object.fromEntries(Object.keys(select).map((field) => [field, user[field]]))
  }
  prisma.user.updateMany = async ({ where, data }) => {
    if (!user || user.emailVerifiedAt !== null) return { count: 0 }
    if (where.emailVerificationHash && where.emailVerificationHash !== user.emailVerificationHash) {
      return { count: 0 }
    }
    if (where.emailVerificationExpiresAt && user.emailVerificationExpiresAt <= where.emailVerificationExpiresAt.gt) {
      return { count: 0 }
    }
    if (where.OR && user.emailVerificationSentAt > where.OR[1].emailVerificationSentAt.lte) {
      return { count: 0 }
    }
    Object.assign(user, data)
    return { count: 1 }
  }
  prisma.user.update = async ({ where, data }) => {
    if (user && user.id === where.id) {
      Object.assign(user, data)
      return { ...user }
    }
    return null
  }
  prisma.session.create = async () => ({ familyId: 'session-1' })
  return () => user
}

function captureEmail(t, { ok = true } = {}) {
  const tokens = []
  t.mock.method(globalThis, 'fetch', async (endpoint, request) => {
    assert.equal(endpoint, 'https://api.resend.com/emails')
    const mail = JSON.parse(request.body)
    assert.deepEqual(mail.to, [credentials.email])
    const link = new URL(mail.text.split('\n')[1])
    assert.equal(link.origin, process.env.APP_PUBLIC_URL)
    assert.equal(link.pathname, '/verificar-correo')
    tokens.push(link.hash.slice(1))
    return { ok, status: ok ? 200 : 503 }
  })
  return tokens
}

test('el registro exige confirmar un token que se guarda como hash y se consume una sola vez', async (t) => {
  const getUser = fakeDatabase()
  const tokens = captureEmail(t)
  const result = await authService.register({ ...credentials, name: 'Valeria' })
  assert.equal(result.verificationSent, true)
  assert.equal(tokens.length, 1)
  assert.notEqual(getUser().emailVerificationHash, tokens[0])
  await assert.rejects(authService.login(credentials), { publicCode: 'EMAIL_VERIFICATION_REQUIRED' })

  await authService.verifyEmail(tokens[0])
  assert.ok(getUser().emailVerifiedAt instanceof Date)
  assert.equal(getUser().emailVerificationHash, null)
  await assert.rejects(authService.verifyEmail(tokens[0]), { status: 400 })
  const session = await authService.login(credentials)
  assert.ok(session.accessToken)
})

test('un enlace vencido requiere reenvío y el enlace nuevo reemplaza el anterior', async (t) => {
  const getUser = fakeDatabase()
  const tokens = captureEmail(t)
  await authService.register({ ...credentials, name: 'Valeria' })
  await assert.rejects(authService.resendVerification(credentials), { status: 429 })
  getUser().emailVerificationExpiresAt = new Date(0)
  getUser().emailVerificationSentAt = new Date(0)
  await assert.rejects(authService.verifyEmail(tokens[0]), { status: 400 })
  await assert.rejects(authService.resendVerification({ ...credentials, password: 'wrong' }), { status: 401 })
  await authService.resendVerification(credentials)
  assert.equal(tokens.length, 2)
  await assert.rejects(authService.verifyEmail(tokens[0]), { status: 400 })
  await authService.verifyEmail(tokens[1])
})

test('las cuentas anteriores a la migración conservan el acceso', async () => {
  const legacyCredentials = { ...credentials, email: 'cuenta-anterior@example.test' }
  fakeDatabase({
    id: 'legacy-user',
    ...legacyCredentials,
    passwordHash: await bcrypt.hash(credentials.password, 4),
    emailVerificationRequired: false,
    emailVerifiedAt: null,
  })
  const session = await authService.login(legacyCredentials)
  assert.equal(session.user.id, 'legacy-user')
})

test('una cuenta normal puede iniciar sesión sin configurar el servicio de correo', async () => {
  const origKey = process.env.RESEND_API_KEY
  delete process.env.RESEND_API_KEY
  try {
    const getUser = fakeDatabase()
    const result = await authService.register({ email: 'sin-correo@example.test', password: 'password123', name: 'Sin Correo' })
    assert.equal(result.verificationRequired, false)
    assert.equal(result.verificationSent, false)
    assert.equal(getUser().emailVerificationRequired, false)
    assert.equal(getUser().emailVerifiedAt, null)
    const session = await authService.login({ email: 'sin-correo@example.test', password: 'password123' })
    assert.ok(session.accessToken)
  } finally {
    process.env.RESEND_API_KEY = origKey
  }
})

test('el correo de verificación se envía solo a la cuenta de demostración', async (t) => {
  const getUser = fakeDatabase()
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('No se debe enviar correo a una cuenta normal')
  })
  const result = await authService.register({ email: 'profesor@universidad.test', password: 'password123', name: 'Profesor' })
  assert.equal(result.verificationSent, false)
  assert.equal(result.verificationRequired, false)
  assert.equal(getUser().emailVerificationRequired, false)
  assert.equal(getUser().emailVerifiedAt, null)
  assert.equal(fetch.mock.callCount(), 0)
  const session = await authService.login({ email: 'profesor@universidad.test', password: 'password123' })
  assert.ok(session.accessToken)
})


