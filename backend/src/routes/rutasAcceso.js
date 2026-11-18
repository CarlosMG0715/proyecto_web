const { Router } = require('express')
const authController = require('../controllers/controladorAcceso')
const { verificarToken } = require('../middleware/verificarSesion')
const { validate } = require('../middleware/validar')
const {
  esquemaRegistro,
  esquemaInicioSesion,
  accountSchema,
} = require('../validators/validadoresAcceso')
const servicioAcceso = require('../services/servicioAcceso')

const { nombreCookie, opcionesCookie } = require('../configuracion')
const { z } = require('zod')

const { limitarPeticionesAcceso } = require('../middleware/limitePeticiones')
const router = Router()
router.delete(
  '/account',
  verificarToken,
  validate(
    z.object({
      password: z.string().min(1, 'Escribe tu contraseña.'),
    }),
  ),
  async (req, res) => {
    await servicioAcceso.eliminarCuenta(req.user.idUsuario, req.body.password)
    const { maxAge, ...clearOptions } = opcionesCookie
    res.clearCookie(nombreCookie, clearOptions)
    res.sendStatus(204)
  },
)

router.patch(
  '/account',
  verificarToken,
  validate(accountSchema),
  async (req, res) => {
    res.json(await servicioAcceso.actualizarCuenta(req.user, req.body))
  },
)

router.post(
  '/register',
  limitarPeticionesAcceso,
  validate(esquemaRegistro),
  (req, res, next) => authController.register(req, res, next),
)
router.post('/login', limitarPeticionesAcceso, validate(esquemaInicioSesion), (req, res, next) =>
  authController.login(req, res, next),
)
router.post('/refresh', (req, res, next) =>
  authController.refresh(req, res, next),
)
router.post('/logout', (req, res, next) =>
  authController.logout(req, res, next),
)

module.exports = router
