const { prisma } = require('../conexionBaseDatos')

const { obtenerDatosConstanciaPerfil } = require('../services/servicioConstanciaPerfil')


// personajes y temas permitidos
const personajesPermitidos = new Set([
  'sprout',
  'fox',
  'music',
  'pilot',
  'royal',
  'cap',
])
const temasPermitidos = new Set([
  'sprout',
  'fox',
  'music',
  'pilot',
  'royal',
  'cap',
  'red',
  'pink',
])


// validar y guardar preferencias
async function actualizarPreferencias(req, res, next) {
  try {
    const datos = req.body
    if (
      !datos ||
      typeof datos !== 'object' ||
      Array.isArray(datos) ||
      Object.keys(datos).length === 0 ||
      Object.keys(datos).some((key) => !['idPersonaje', 'idTema'].includes(key))
    ) {
      return res
        .status(400)
        .json({ error: 'Envía el personaje o el tema que quieres guardar' })
    }
    const { idPersonaje, idTema } = datos
    if (
      ('idPersonaje' in datos && !personajesPermitidos.has(idPersonaje)) ||
      ('idTema' in datos && !temasPermitidos.has(idTema))
    ) {
      return res
        .status(400)
        .json({ error: 'El personaje o el tema seleccionado no existe' })
    }
    const cambios = {}
    if ('idPersonaje' in datos) cambios.idPersonaje = idPersonaje
    if ('idTema' in datos) cambios.idTema = idTema
    const preferencias = await prisma.usuario.update({
      where: { id: req.user.idUsuario },
      data: cambios,
      select: { idPersonaje: true, idTema: true },
    })
    return res.json(preferencias)
  } catch (error) {
    return next(error)
  }
}


// pedir constancia al servicio
async function obtenerConstanciaPerfil(req, res, next) {
  try {
    // usuario de la sesion
    const idUsuario = req.user.idUsuario
    const constancia = await obtenerDatosConstanciaPerfil(idUsuario)

    return res.json(constancia)
  } catch (error) {
    // pasar error al manejador
    return next(error)
  }
}


module.exports = {
  actualizarPreferencias,
  obtenerConstanciaPerfil,
}
