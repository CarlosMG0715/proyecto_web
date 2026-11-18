const origenesPermitidos = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const secretoJwt =
  process.env.JWT_SECRET || 'jwt_secret_dev_cambiar_en_produccion'

const configuredSameSite = (
  process.env.COOKIE_SAME_SITE || 'strict'
).toLowerCase()
const cookieSameSite = ['strict', 'lax', 'none'].includes(configuredSameSite)
  ? configuredSameSite
  : 'strict'

const nombreCookie = 'refreshToken'

const opcionesCookie = {
  // el refresh no queda disponible para javascript y solo viaja en rutas de auth.
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || cookieSameSite === 'none',
  sameSite: cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
}

module.exports = {
  origenesPermitidos,
  secretoJwt,
  nombreCookie,
  opcionesCookie,
  accessTokenExpiration: '15m',
  refreshTokenDays: 7,
}
