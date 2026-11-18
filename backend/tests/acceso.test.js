const assert = require('node:assert/strict')
const test = require('node:test')
const jwt = require('jsonwebtoken')
const { secretoJwt } = require('../src/configuracion')
const prisma = { sesion: { findFirst: async () => null } }
const prismaPath = require.resolve('../src/conexionBaseDatos')
const originalPrismaModule = require.cache[prismaPath]
require.cache[prismaPath] = { exports: { prisma } }
const { verificarToken } = require('../src/middleware/verificarSesion')
if (originalPrismaModule) require.cache[prismaPath] = originalPrismaModule
else delete require.cache[prismaPath]
const {
  esquemaRegistro,
  esquemaInicioSesion,
} = require('../src/validators/validadoresAcceso')

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('el access token vencido responde 401 para activar la renovación del cliente', async () => {
  const token = jwt.sign(
    { idUsuario: 'user-1', idFamilia: 'device-1' },
    secretoJwt,
    { expiresIn: -1 },
  )
  const res = response()
  await verificarToken(
    { headers: { authorization: `Bearer ${token}` } },
    res,
    () => assert.fail('Token vencido aceptado'),
  )
  assert.equal(res.statusCode, 401)
})

test('un token válido necesita una sesión vigente de su misma cuenta y dispositivo', async (t) => {
  const token = jwt.sign(
    { idUsuario: 'user-1', idFamilia: 'device-1' },
    secretoJwt,
    { expiresIn: '1m' },
  )
  let active = true
  t.mock.method(prisma.sesion, 'findFirst', async ({ where }) => {
    assert.equal(where.idUsuario, 'user-1')
    assert.equal(where.idFamilia, 'device-1')
    assert.equal(where.revocado, false)
    return active ? { id: 'session-1' } : null
  })
  let accepted = false
  await verificarToken(
    { headers: { authorization: `Bearer ${token}` } },
    response(),
    () => {
      accepted = true
    },
  )
  assert.equal(accepted, true)
  active = false
  const res = response()
  await verificarToken(
    { headers: { authorization: `Bearer ${token}` } },
    res,
    () => assert.fail('Sesión cerrada aceptada'),
  )
  assert.equal(res.statusCode, 401)
})

test('un token firmado sin identificador de cuenta se rechaza antes de consultar Prisma', async () => {
  const token = jwt.sign({ idFamilia: 'device-1' }, secretoJwt)
  const res = response()
  await verificarToken(
    { headers: { authorization: `Bearer ${token}` } },
    res,
    () => assert.fail('Cuenta vacía aceptada'),
  )
  assert.equal(res.statusCode, 401)
})

test('registro y login rechazan campos con tipos incorrectos o correo inválido', () => {
  assert.equal(
    esquemaInicioSesion.safeParse({ email: 123, password: true }).success,
    false,
  )
  assert.equal(
    esquemaInicioSesion.safeParse({ email: 'sin-correo', password: '12345678' })
      .success,
    false,
  )
  assert.equal(
    esquemaRegistro.safeParse({
      name: '   ',
      email: 'a@example.com',
      password: '12345678',
    }).success,
    false,
  )
  assert.equal(
    esquemaRegistro.safeParse({
      name: 'A',
      email: 'a@example.com',
      password: 'á'.repeat(37),
    }).success,
    false,
  )
  const valid = esquemaRegistro.parse({
    name: ' Valeria ',
    email: ' valeria@example.com ',
    password: '12345678',
  })
  assert.equal(valid.name, 'Valeria')
  assert.equal(valid.email, 'valeria@example.com')
})
