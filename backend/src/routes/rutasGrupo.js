const { Router } = require('express')
const { verificarToken } = require('../middleware/verificarSesion')
const { validate } = require('../middleware/validar')
const perfil = require('../controllers/controladorPerfil')
const grupos = require('../controllers/controladorGrupo')
const validadores = require('../validators/validadoresGrupo')

const router = Router()


// verificar sesion
router.use(verificarToken)


// perfil
router.patch('/profile/preferences', perfil.actualizarPreferencias)
router.get('/profile/constancia', perfil.obtenerConstanciaPerfil)


// grupos
router.get('/groups', grupos.listarGrupos)
router.post('/groups', validate(validadores.esquemaCrearGrupo), grupos.crearGrupo)

router.post(
  '/groups/join',
  validate(validadores.esquemaUnirseGrupo),
  grupos.unirseAlGrupo,
)
router.get('/groups/:idGrupo', grupos.obtenerGrupo)
router.patch(
  '/groups/:idGrupo',
  validate(validadores.esquemaActualizarGrupo),
  grupos.actualizarGrupo,
)
router.delete('/groups/:idGrupo', grupos.eliminarGrupo)


// integrantes y personaje
router.delete('/groups/:idGrupo/membership', grupos.salirDelGrupo)
router.delete('/groups/:idGrupo/members/:idMiembro', grupos.quitarIntegrante)
router.post('/groups/:idGrupo/revive', grupos.reiniciarPersonaje)
router.post('/groups/:idGrupo/members/:idMiembro/revive', grupos.reiniciarPersonaje)


// habitos y validacion
router.post(
  '/groups/:idGrupo/habits',
  validate(validadores.esquemaCrearHabito),
  grupos.guardarHabito,
)
router.patch(
  '/groups/:idGrupo/habits/:idHabito',
  validate(validadores.esquemaCrearHabito),
  grupos.guardarHabito,
)
router.delete('/groups/:idGrupo/habits/:idHabito', grupos.eliminarHabito)
router.put(
  '/groups/:idGrupo/habits/:idHabito/check-in',
  validate(validadores.esquemaRegistrarHabito),
  grupos.marcarHabito,
)


// chat
router.post(
  '/groups/:idGrupo/messages',
  validate(validadores.esquemaMensaje),
  grupos.enviarMensaje,
)


module.exports = router
