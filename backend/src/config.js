// valores de seguridad y conexion usados por varios modulos del backend.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const jwtSecret = process.env.JWT_SECRET || 'jwt_secret_dev_cambiar_en_produccion'

const configuredSameSite = (process.env.COOKIE_SAME_SITE || 'strict').toLowerCase()
const cookieSameSite = ['strict', 'lax', 'none'].includes(configuredSameSite) ? configuredSameSite : 'strict'

const cookieName = 'refreshToken'

const cookieOptions = {
  // el refresh no queda disponible para javascript y solo viaja en rutas de auth.
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || cookieSameSite === 'none',
  sameSite: cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
}

module.exports = {
  allowedOrigins,
  jwtSecret,
  cookieName,
  cookieOptions,
  accessTokenExpiration: '15m',
  refreshTokenDays: 7,
}
