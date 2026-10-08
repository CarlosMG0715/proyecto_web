const authService = require('../services/authService')
const { cookieName, cookieOptions } = require('../config')
const { extractRefreshToken } = require('../utils/cookies')

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

      const { accessToken, refreshToken, user } = await authService.login({
        email,
        password,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      })

      res.cookie(cookieName, refreshToken, cookieOptions)
      res.status(200).json({ accessToken, user })
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

      const { accessToken, refreshToken: newRefreshToken, user } = await authService.refresh({
        refreshToken,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      })

      res.cookie(cookieName, newRefreshToken, cookieOptions)
      res.status(200).json({ accessToken, user })
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

      res.clearCookie(cookieName, { ...cookieOptions, maxAge: 0 })
      res.status(200).json({ message: 'Sesión cerrada exitosamente' })
    } catch (error) {
      next(error)
    }
  }

  async logoutAll(req, res, next) {
    try {
      await authService.revokeAllUserSessions(req.user.userId)
      res.clearCookie(cookieName, { ...cookieOptions, maxAge: 0 })
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
