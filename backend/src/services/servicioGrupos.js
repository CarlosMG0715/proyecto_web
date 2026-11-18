// Reglas del grupo: permisos, hábitos, rachas y mensajes. Las rutas no deciden estas reglas.
const crypto = require('node:crypto')
const repo = require('../repositories/repositorioGrupos')
const crearErrorHttp = require('../utils/errorHttp')
const { claveFecha, convertirAFecha, desplazarDia } = require('../utils/fechas')

// Permisos y datos que se muestran en el grupo
function comprobarMiembro(grupo, idUsuario, admin = false) {
  if (!grupo) throw crearErrorHttp('Grupo no encontrado', 404)
  const integrante = grupo.membresias.find((item) => item.idUsuario === idUsuario)
  if (!integrante) throw crearErrorHttp('No perteneces a este grupo', 403)
  if (admin && integrante.role !== 'ADMIN')
    throw crearErrorHttp('Solo el administrador puede hacer esto', 403)
  return integrante
}

// Si hoy sigue en curso, la racha se cuenta desde ayer.
function calcularRacha(fechasCumplidas, hoy) {
  const diasCumplidos = new Set(fechasCumplidas)
  let dia = diasCumplidos.has(hoy) ? hoy : desplazarDia(hoy, -1)
  let racha = 0
  while (diasCumplidos.has(dia)) {
    racha++
    dia = desplazarDia(dia, -1)
  }
  return racha
}

function prepararIntegrantes(grupo, hoy) {
  return grupo.membresias.map((integrante) => {
    const registros = grupo.habits.flatMap((habit) =>
      habit.registrosHabito.filter((registro) => registro.idUsuario === integrante.idUsuario),
    )
    const riesgo = grupo.riesgosDesercion.find(
      (item) => item.idUsuario === integrante.idUsuario,
    )
    return {
      ...integrante.user,
      role: integrante.role,
      caidoEn: integrante.caidoEn,
      completadosHoy: registros.filter(
        (registro) => claveFecha(registro.fechaRegistro, 'UTC') === hoy,
      ).length,
      diasSinCumplir: riesgo?.ausenciasConsecutivas ?? 0,
    }
  })
}

function prepararHistorial(cierres) {
  return cierres
    .slice(0, 7)
    .reverse()
    .map((c) => ({
      date: claveFecha(c.fechaLocal, 'UTC'),
      percent: Math.round(c.tasaCumplimiento * 100),
      penalty: c.penalizacionAplicada,
    }))
}

function prepararGrupo(grupo) {
  const hoy = claveFecha(new Date(), grupo.timeZone)
  const integrantes = prepararIntegrantes(grupo, hoy)
  const todosCompletaron =
    grupo.habits.length > 0 &&
    integrantes.length > 0 &&
    integrantes.every((integrante) => integrante.completadosHoy === grupo.habits.length)
  const diasCerrados = grupo.cierres
    .filter((c) => c.registrosEsperados > 0 && c.tasaCumplimiento === 1)
    .map((c) => claveFecha(c.fechaLocal, 'UTC'))
  if (todosCompletaron) diasCerrados.push(hoy)
  return {
    id: grupo.id,
    creadoEn: grupo.creadoEn,
    name: grupo.name,
    color: grupo.color,
    codigoInvitacion: grupo.codigoInvitacion,
    today: hoy,
    streak: calcularRacha(diasCerrados, hoy),
    members: integrantes,
    habits: grupo.habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      description: habit.description,
      diasMeta: habit.diasMeta,
      completadoPor: habit.registrosHabito
        .filter((registro) => claveFecha(registro.fechaRegistro, 'UTC') === hoy)
        .map((registro) => registro.idUsuario),
    })),
    // chat y avisos de habitos nuevos
    messages: [...grupo.messages]
      .reverse()
      .filter((message) => message.type !== 'SYSTEM' || message.tipoContexto === 'HABIT_CREATED')
      .map((message) => ({
      id: message.id,
      content: message.content,
      type: message.type,
      creadoEn: message.creadoEn,
      author: message.user,
    })),
    history: prepararHistorial(grupo.cierres),
  }
}

const registrarEvento = (db, idGrupo, content, tipoContexto) =>
  db.mensaje.create({ data: { idGrupo, content, type: 'SYSTEM', tipoContexto } })
// Consultas y cambios del grupo
async function listarGrupos(idUsuario) {
  return (await repo.listarGruposDelUsuario(idUsuario)).map(prepararGrupo)
}

async function obtenerGrupo(idGrupo, idUsuario) {
  const grupo = await repo.buscarGrupo(idGrupo)
  comprobarMiembro(grupo, idUsuario)
  return prepararGrupo(grupo)
}

async function crearGrupo(idUsuario, input) {
  const grupo = await repo.prisma.grupo.create({
    data: {
      ...input,
      codigoInvitacion: crypto.randomBytes(6).toString('hex').toUpperCase(),
      idCreador: idUsuario,
      membresias: { create: { idUsuario, role: 'ADMIN' } },
      messages: {
        create: { content: '¡El grupo comienza su aventura!', type: 'SYSTEM' },
      },
    },
  })
  return obtenerGrupo(grupo.id, idUsuario)
}

async function unirseAlGrupo(idUsuario, code) {
  const grupoEncontrado = await repo.prisma.grupo.findUnique({
    where: { codigoInvitacion: code },
  })
  if (!grupoEncontrado) throw crearErrorHttp('No existe un grupo con ese código', 404)
  await repo.change(grupoEncontrado.id, async (db, grupo) => {
    if (grupo.membresias.some((integrante) => integrante.idUsuario === idUsuario)) return
    await db.membresiaGrupo.create({ data: { idGrupo: grupoEncontrado.id, idUsuario } })
    await registrarEvento(db, grupoEncontrado.id, 'Se unió un nuevo integrante al grupo.')
  })
  return obtenerGrupo(grupoEncontrado.id, idUsuario)
}

async function actualizarGrupo(idGrupo, idUsuario, input) {
  await repo.change(idGrupo, async (db, grupo) => {
    comprobarMiembro(grupo, idUsuario, true)
    await db.grupo.update({ where: { id: idGrupo }, data: input })
  })
}

// Hábitos y registros diarios
async function guardarHabito(idGrupo, idUsuario, idHabito, input) {
  await repo.change(idGrupo, async (db, grupo) => {
    comprobarMiembro(grupo, idUsuario, true)
    if (idHabito) {
      if (!grupo.habits.some((h) => h.id === idHabito))
        throw crearErrorHttp('Hábito no encontrado', 404)
      await db.habito.update({ where: { id: idHabito }, data: input })
    } else {
      await db.habito.create({
        data: { ...input, idGrupo, idCreador: idUsuario },
      })
      await registrarEvento(
        db,
        idGrupo,
        `Nueva meta: ${input.name}`,
        'HABIT_CREATED',
      )
    }
  })
}

async function eliminarHabito(idGrupo, idUsuario, idHabito) {
  await repo.change(idGrupo, async (db, grupo) => {
    comprobarMiembro(grupo, idUsuario, true)
    if (!grupo.habits.some((h) => h.id === idHabito))
      throw crearErrorHttp('Hábito no encontrado', 404)
    await db.habito.update({ where: { id: idHabito }, data: { activo: false } })
  })
}

async function marcarHabito(idGrupo, idUsuario, idHabito, completado) {
  await repo.change(idGrupo, async (db, grupo) => {
    const integrante = comprobarMiembro(grupo, idUsuario)
    if (integrante.caidoEn)
      throw crearErrorHttp('Reinicia tu personaje antes de registrar hábitos', 409)
    const habit = grupo.habits.find((h) => h.id === idHabito)
    if (!habit) throw crearErrorHttp('Hábito no encontrado', 404)
    const fechaRegistro = convertirAFecha(claveFecha(new Date(), grupo.timeZone))
    // Un registro duplicado no genera otro mensaje.
    if (completado) {
      const result = await db.registroHabito.createMany({
        data: [{ idHabito, idUsuario, fechaRegistro }],
        skipDuplicates: true,
      })
      if (result.count)
        await registrarEvento(
          db,
          idGrupo,
          `${integrante.user.name} completó ${habit.name}`,
          'CHECK_IN',
        )
    } else
      await db.registroHabito.deleteMany({ where: { idHabito, idUsuario, fechaRegistro } })
  })
}

// Chat y miembros del grupo
async function enviarMensaje(idGrupo, idUsuario, content) {
  await repo.change(idGrupo, async (db, grupo) => {
    const integrante = comprobarMiembro(grupo, idUsuario)
    if (integrante.caidoEn) throw crearErrorHttp('Tu personaje esta caido', 409)
    await db.mensaje.create({ data: { idGrupo, idUsuario, content } })
  })
}

// solo el admin decide los regresos
async function reiniciarPersonaje(idGrupo, idUsuario, idMiembro) {
  await repo.change(idGrupo, async (db, grupo) => {
    comprobarMiembro(grupo, idUsuario, true)
    const todosCaidos = grupo.membresias.every((miembro) => miembro.caidoEn)

    if (!idMiembro && todosCaidos) {
      await db.membresiaGrupo.updateMany({
        where: { idGrupo },
        data: { caidoEn: null },
      })
      await db.riesgoDesercion.updateMany({
        where: { idGrupo },
        data: { ausenciasConsecutivas: 0, level: 'LOW' },
      })
      return
    }

    const integrante = comprobarMiembro(grupo, idMiembro || idUsuario)
    if (integrante.idUsuario === idUsuario && integrante.caidoEn) {
      throw crearErrorHttp('Otro admin debe revivir tu personaje', 403)
    }
    await db.membresiaGrupo.update({
      where: { id: integrante.id },
      data: { caidoEn: null },
    })
    await db.riesgoDesercion.updateMany({
      where: { idGrupo, idUsuario: integrante.idUsuario },
      data: { ausenciasConsecutivas: 0, level: 'LOW' },
    })
  })
}

async function quitarIntegrante(idGrupo, idUsuario, idMiembro) {
  await repo.change(idGrupo, async (db, grupo) => {
    comprobarMiembro(grupo, idUsuario, idMiembro !== idUsuario)
    const miembroSaliente = comprobarMiembro(grupo, idMiembro)
    const restantes = grupo.membresias.filter((m) => m.idUsuario !== idMiembro)
    if (!restantes.length) {
      await db.grupo.delete({ where: { id: idGrupo } })
      return
    }
    const sucesor = restantes.find((m) => m.role === 'ADMIN') ?? restantes[0]
    if (miembroSaliente.role === 'ADMIN')
      await db.membresiaGrupo.update({
        where: { id: sucesor.id },
        data: { role: 'ADMIN' },
      })
    if (grupo.idCreador === idMiembro)
      await db.grupo.update({
        where: { id: idGrupo },
        data: { idCreador: sucesor.idUsuario },
      })
    await db.habito.updateMany({
      where: { idGrupo, idCreador: idMiembro },
      data: { idCreador: sucesor.idUsuario },
    })
    await db.membresiaGrupo.delete({ where: { id: miembroSaliente.id } })
    await db.riesgoDesercion.deleteMany({ where: { idGrupo, idUsuario: idMiembro } })
    await registrarEvento(db, idGrupo, `${miembroSaliente.user.name} salió del grupo.`)
  })
}

async function eliminarGrupo(idGrupo, idUsuario) {
  await repo.change(idGrupo, async (db, grupo) => {
    comprobarMiembro(grupo, idUsuario, true)
    await db.grupo.delete({ where: { id: idGrupo } })
  })
}

module.exports = {
  listarGrupos,
  obtenerGrupo,
  crearGrupo,
  unirseAlGrupo,
  actualizarGrupo,
  guardarHabito,
  eliminarHabito,
  marcarHabito,
  enviarMensaje,
  reiniciarPersonaje,
  quitarIntegrante,
  eliminarGrupo,
}
