const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const jwtSecret = process.env.JWT_SECRET || 'jwt_secret_dev_cambiar_en_produccion'

const cookieName = 'refreshToken'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
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
