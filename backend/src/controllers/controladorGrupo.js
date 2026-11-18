const grupos = require('../services/servicioGrupos')
const { notificarGrupo } = require('../tiempoReal')

// Cada ruta llama a una función concreta req contiene la petición y res envía la respuesta
function responderCambio(req, res) {
  notificarGrupo(req.params.idGrupo)
  res.sendStatus(204)
}

exports.listarGrupos = async (req, res) => {
  const resultado = await grupos.listarGrupos(req.user.idUsuario)
  res.json(resultado)
}
exports.obtenerGrupo = async (req, res) => {
  const resultado = await grupos.obtenerGrupo(
    req.params.idGrupo,
    req.user.idUsuario,
  )
  res.json(resultado)
}
exports.crearGrupo = async (req, res) => {
  const resultado = await grupos.crearGrupo(req.user.idUsuario, req.body)
  res.status(201).json(resultado)
}
exports.unirseAlGrupo = async (req, res) => {
  const resultado = await grupos.unirseAlGrupo(req.user.idUsuario, req.body.code)
  notificarGrupo(resultado.id)
  res.json(resultado)
}
exports.actualizarGrupo = async (req, res) => {
  await grupos.actualizarGrupo(req.params.idGrupo, req.user.idUsuario, req.body)
  responderCambio(req, res)
}
exports.guardarHabito = async (req, res) => {
  await grupos.guardarHabito(
    req.params.idGrupo,
    req.user.idUsuario,
    req.params.idHabito,
    req.body,
  )
  responderCambio(req, res)
}
exports.eliminarHabito = async (req, res) => {
  await grupos.eliminarHabito(
    req.params.idGrupo,
    req.user.idUsuario,
    req.params.idHabito,
  )
  responderCambio(req, res)
}
exports.marcarHabito = async (req, res) => {
  await grupos.marcarHabito(
    req.params.idGrupo,
    req.user.idUsuario,
    req.params.idHabito,
    req.body.completed,
  )
  responderCambio(req, res)
}
exports.enviarMensaje = async (req, res) => {
  await grupos.enviarMensaje(
    req.params.idGrupo,
    req.user.idUsuario,
    req.body.content,
  )
  responderCambio(req, res)
}
exports.reiniciarPersonaje = async (req, res) => {
  await grupos.reiniciarPersonaje(req.params.idGrupo, req.user.idUsuario)
  responderCambio(req, res)
}
exports.quitarIntegrante = async (req, res) => {
  await grupos.quitarIntegrante(
    req.params.idGrupo,
    req.user.idUsuario,
    req.params.idMiembro,
  )
  responderCambio(req, res)
}
exports.salirDelGrupo = async (req, res) => {
  await grupos.quitarIntegrante(
    req.params.idGrupo,
    req.user.idUsuario,
    req.user.idUsuario,
  )
  responderCambio(req, res)
}
exports.eliminarGrupo = async (req, res) => {
  await grupos.eliminarGrupo(req.params.idGrupo, req.user.idUsuario)
  responderCambio(req, res)
}
