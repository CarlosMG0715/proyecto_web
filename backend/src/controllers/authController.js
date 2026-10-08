const authService = require('../services/authService')

const COOKIE_NAME = 'refreshToken'

function extractRefreshToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME]
  }

  // Soporte manual si cookie-parser no está activo
  const rawCookie = req.headers.cookie
  if (!rawCookie) return null

  const match = rawCookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))

  return match ? decodeURIComponent(match.split('=')[1]) : null
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
}

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' })
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
      }

      const user = await authService.register({ name, email, password })
      res.status(201).json({ message: 'Usuario registrado con éxito', user })
    } catch (error) {
      next(error)
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body
      if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios' })
      }

      const userAgent = req.headers['user-agent']
      const ipAddress = req.ip

      const { accessToken, refreshToken, user } = await authService.login({
        email,
        password,
        userAgent,
        ipAddress,
      })

      // Guardar Refresh Token en Cookie Segura HttpOnly
      res.cookie(COOKIE_NAME, refreshToken, cookieOptions)

      res.status(200).json({
        accessToken,
        user,
      })
    } catch (error) {
      next(error)
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = extractRefreshToken(req)
      if (!refreshToken) {
        return res.status(401).json({ error: 'No hay sesión activa para renovar' })
      }

      const userAgent = req.headers['user-agent']
      const ipAddress = req.ip

      const { accessToken, refreshToken: newRefreshToken, user } = await authService.refresh({
        refreshToken,
        userAgent,
        ipAddress,
      })

      res.cookie(COOKIE_NAME, newRefreshToken, cookieOptions)

      res.status(200).json({
        accessToken,
        user,
      })
    } catch (error) {
      next(error)
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = extractRefreshToken(req)
      if (refreshToken) {
        await authService.logout({ refreshToken })
      }

      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 })
      res.status(200).json({ message: 'Sesión cerrada exitosamente' })
    } catch (error) {
      next(error)
    }
  }

  async logoutAll(req, res, next) {
    try {
      // Revocar todas las sesiones activas del usuario en la base de datos
      await authService.revokeAllUserSessions(req.user.userId)

      res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 })
      res.status(200).json({ message: 'Se cerraron todas las sesiones en todos los dispositivos' })
    } catch (error) {
      next(error)
    }
  }

  async me(req, res) {
    res.status(200).json({ user: req.user })
  }
}

module.exports = new AuthController()
