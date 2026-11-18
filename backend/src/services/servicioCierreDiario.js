const repo = require('../repositories/repositorioGrupos')
const { claveFecha, convertirAFecha, desplazarDia } = require('../utils/fechas')

// Regla única: si falta algún hábito, cae ese personaje y el grupo pierde la racha.
// El cierre y sus penalizaciones se guardan juntos y solo una vez por fecha.
async function cerrarDia(idGrupo, date) {
  return repo.change(idGrupo, async (db, group) => {
    if (group.cierres.some((c) => claveFecha(c.fechaLocal, 'UTC') === date))
      return false
    const members = group.membresias.filter(
      (m) => claveFecha(m.ingresoEn, group.timeZone) <= date,
    )
    const habits = group.habits.filter(
      (h) => claveFecha(h.creadoEn, group.timeZone) <= date,
    )
    const expected = members.length * habits.length
    const completed = members.reduce(
      (sum, member) =>
        sum +
        habits.filter((h) =>
          h.registrosHabito.some(
            (c) =>
              c.idUsuario === member.idUsuario &&
              claveFecha(c.fechaRegistro, 'UTC') === date,
          ),
        ).length,
      0,
    )
    const penalty = expected > 0 && completed < expected
    const closure = await db.cierreDiario.create({
      data: {
        idGrupo,
        fechaLocal: convertirAFecha(date),
        registrosEsperados: expected,
        registrosCompletados: completed,
        tasaCumplimiento: expected ? completed / expected : 0,
        penalizacionAplicada: penalty,
      },
    })


    if (!expected) return true
    for (const member of members) {
      const missed = habits.some(
        (h) =>
          !h.registrosHabito.some(
            (c) =>
              c.idUsuario === member.idUsuario &&
              claveFecha(c.fechaRegistro, 'UTC') === date,
          ),
      )
      const previous = group.riesgosDesercion.find(
        (r) => r.idUsuario === member.idUsuario,
      )
      const ausenciasConsecutivas = missed
        ? (previous?.ausenciasConsecutivas ?? 0) + 1
        : 0
      const level =
        ausenciasConsecutivas >= 3 ? 'HIGH' : ausenciasConsecutivas ? 'MEDIUM' : 'LOW'
      await db.riesgoDesercion.upsert({
        where: { idGrupo_idUsuario: { idGrupo, idUsuario: member.idUsuario } },
        create: { idGrupo, idUsuario: member.idUsuario, ausenciasConsecutivas, level },
        update: { ausenciasConsecutivas, level, calculadoEn: new Date() },
      })
      if (missed && !member.caidoEn)
        await db.membresiaGrupo.update({
          where: { id: member.id },
          data: { caidoEn: new Date() },
        })
      if (penalty)
        await db.penalizacion.create({
          data: {
            idGrupo,
            idUsuario: member.idUsuario,
            idCierre: closure.id,
            claveUnica: `${idGrupo}:${date}:${member.idUsuario}`,
            reason:
              'El equipo no completó todos los hábitos. Racha grupal perdida.',
          },
        })
      if (level === 'HIGH' && previous?.level !== 'HIGH')
        await db.mensaje.create({
          data: {
            idGrupo,
            type: 'SYSTEM',
            tipoContexto: 'DROPOUT_RISK',
            content: `${member.user.name} lleva 3 días sin cumplir todas sus metas.`,
          },
        })
    }
    
    await db.mensaje.create({
      data: {
        idGrupo,
        type: 'SYSTEM',
        tipoContexto: penalty ? 'PENALTY' : 'DAILY_CLOSURE',
        content: `${date}: ${completed}/${expected} hábitos completados. ${penalty ? 'El equipo perdió la racha; quienes incumplieron verán su tumba.' : '¡La racha del equipo continúa!'}`,
      },
    })
    return true
  })
}
async function cerrarGruposDelDia(now = new Date()) {
  const groups = await repo.prisma.grupo.findMany({
    select: {
      id: true,
      timeZone: true,
      creadoEn: true,
      cierres: { orderBy: { fechaLocal: 'desc' }, take: 1 },
    },
  })
  let processed = 0
  for (const group of groups) {
    const last = group.cierres[0]
    let date = last
      ? desplazarDia(claveFecha(last.fechaLocal, 'UTC'), 1)
      : claveFecha(group.creadoEn, group.timeZone)
    const today = claveFecha(now, group.timeZone)
    while (date < today) {
      if (await cerrarDia(group.id, date)) processed++
      date = desplazarDia(date, 1)
    }
  }
  return processed
}
module.exports = { cerrarDia, cerrarGruposDelDia }
