const assert = require('node:assert/strict')
const test = require('node:test')
const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../src/config')
const prisma = { session: { findFirst: async () => null } }
const prismaPath = require.resolve('../src/prisma')
const originalPrismaModule = require.cache[prismaPath]
require.cache[prismaPath] = { exports: { prisma } }
const { authenticateToken } = require('../src/middlewares/authMiddleware')
if (originalPrismaModule) require.cache[prismaPath] = originalPrismaModule
else delete require.cache[prismaPath]
const { registerSchema, loginSchema } = require('../src/validators/authValidators')

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

test('el access token vencido responde 401 para activar la renovación del cliente', async () => {
  const token = jwt.sign({ userId: 'user-1', familyId: 'device-1' }, jwtSecret, { expiresIn: -1 })
  const res = response()
  await authenticateToken({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('Token vencido aceptado'))
  assert.equal(res.statusCode, 401)
})

test('un token válido necesita una sesión vigente de su misma cuenta y dispositivo', async (t) => {
  const token = jwt.sign({ userId: 'user-1', familyId: 'device-1' }, jwtSecret, { expiresIn: '1m' })
  let active = true
  t.mock.method(prisma.session, 'findFirst', async ({ where }) => {
    assert.equal(where.userId, 'user-1')
    assert.equal(where.familyId, 'device-1')
    assert.equal(where.isRevoked, false)
    return active ? { id: 'session-1' } : null
  })
  let accepted = false
  await authenticateToken({ headers: { authorization: `Bearer ${token}` } }, response(), () => { accepted = true })
  assert.equal(accepted, true)
  active = false
  const res = response()
  await authenticateToken({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('Sesión cerrada aceptada'))
  assert.equal(res.statusCode, 401)
})

test('un token firmado sin identificador de cuenta se rechaza antes de consultar Prisma', async () => {
  const token = jwt.sign({ familyId: 'device-1' }, jwtSecret)
  const res = response()
  await authenticateToken({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('Cuenta vacía aceptada'))
  assert.equal(res.statusCode, 401)
})

test('registro y login rechazan campos con tipos incorrectos o correo inválido', () => {
  assert.equal(loginSchema.safeParse({ email: 123, password: true }).success, false)
  assert.equal(loginSchema.safeParse({ email: 'sin-correo', password: '12345678' }).success, false)
  assert.equal(registerSchema.safeParse({ name: '   ', email: 'a@example.com', password: '12345678' }).success, false)
  assert.equal(registerSchema.safeParse({ name: 'A', email: 'a@example.com', password: 'á'.repeat(37) }).success, false)
  const valid = registerSchema.parse({ name: ' Valeria ', email: ' valeria@example.com ', password: '12345678' })
  assert.equal(valid.name, 'Valeria')
  assert.equal(valid.email, 'valeria@example.com')
})
