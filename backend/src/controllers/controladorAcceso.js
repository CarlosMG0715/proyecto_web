const servicioAcceso = require('../services/servicioAcceso')
const { nombreCookie, opcionesCookie } = require('../configuracion')
const { extraerTokenRenovacion } = require('../utils/cookies')

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body
      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ error: 'Nombre, correo y contraseña son obligatorios' })
      }
      if (password.length < 8) {
        return res
          .status(400)
          .json({ error: 'La contraseña debe tener al menos 8 caracteres' })
      }

      const result = await servicioAcceso.register({ name, email, password })
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  }
  async login(req, res, next) {
    // envia el token corto en json y el refresh en una cookie protegida.
    try {
      const { email, password } = req.body
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: 'Correo y contraseña son obligatorios' })
      }

      const { tokenAcceso, tokenRenovacion, user } = await servicioAcceso.login({
        email,
        password,
        agenteUsuario: req.headers['user-agent'],
        direccionIp: req.ip,
      })

      res.cookie(nombreCookie, tokenRenovacion, opcionesCookie)
      res.status(200).json({ tokenAcceso, user })
    } catch (error) {
      next(error)
    }
  }

  async refresh(req, res, next) {
    try {
      const tokenRenovacion = extraerTokenRenovacion(req)
      if (!tokenRenovacion) {
        return res
          .status(401)
          .json({ error: 'No hay sesión activa para renovar' })
      }

      const {
        tokenAcceso,
        tokenRenovacion: nuevoTokenRenovacion,
        user,
      } = await servicioAcceso.refresh({
        tokenRenovacion,
        agenteUsuario: req.headers['user-agent'],
        direccionIp: req.ip,
      })

      res.cookie(nombreCookie, nuevoTokenRenovacion, opcionesCookie)
      res.status(200).json({ tokenAcceso, user })
    } catch (error) {
      next(error)
    }
  }

  async logout(req, res, next) {
    try {
      const tokenRenovacion = extraerTokenRenovacion(req)
      if (tokenRenovacion) {
        await servicioAcceso.logout({ tokenRenovacion })
      }

      res.clearCookie(nombreCookie, { ...opcionesCookie, maxAge: 0 })
      res.status(200).json({ message: 'Sesión cerrada exitosamente' })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new AuthController()
