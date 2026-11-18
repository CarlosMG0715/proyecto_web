const { prisma } = require('../conexionBaseDatos')
const { claveFecha, convertirAFecha, desplazarDia } = require('../utils/fechas')


// consultas


// grupos y habitos activos
async function buscarGruposYHabitos(idUsuario) {
  const membresias = await prisma.membresiaGrupo.findMany({
    where: { idUsuario },
    include: {
      group: {
        include: {
          habits: {
            where: { activo: true },
          },
        },
      },
    },
  })

  return membresias
}


// checks de los ultimos 30 dias
async function buscarRegistrosRecientes(idUsuario) {
  const fechaFinal = claveFecha()
  const fechaInicial = desplazarDia(fechaFinal, -29)

  const registros = await prisma.registroHabito.findMany({
    where: {
      idUsuario,
      fechaRegistro: {
        gte: convertirAFecha(fechaInicial), // desde
        lte: convertirAFecha(fechaFinal), // hasta
      },
    },
    select: {
      idHabito: true,
      fechaRegistro: true,
    },
  })

  return registros
}


// funcion principal
async function obtenerDatosConstanciaPerfil(idUsuario) {
  const membresias = await buscarGruposYHabitos(idUsuario)
  const registros = await buscarRegistrosRecientes(idUsuario)
  const hoy = claveFecha()
  const dias = []

  // cada dia cuenta solo los habitos que ya existian al ingresar al grupo
  for (let paso = -29; paso <= 0; paso++) {
    const fecha = desplazarDia(hoy, paso)
    const habitosDelDia = membresias.flatMap((membresia) =>
      membresia.group.habits.filter((habito) =>
        claveFecha(membresia.ingresoEn) <= fecha &&
        claveFecha(habito.creadoEn) <= fecha,
      ),
    )
    const ids = new Set(habitosDelDia.map((habito) => habito.id))
    const completados = registros.filter((registro) =>
      ids.has(registro.idHabito) && claveFecha(registro.fechaRegistro, 'UTC') === fecha,
    ).length
    dias.push({
      fecha,
      esperados: ids.size,
      completados,
      porcentaje: ids.size ? Math.round(completados / ids.size * 100) : 0,
    })
  }

  const resumenSemanal = dias.slice(-7).map(({ fecha, porcentaje }) => ({ fecha, porcentaje }))
  const esperados = dias.reduce((total, dia) => total + dia.esperados, 0)
  const completados = dias.reduce((total, dia) => total + dia.completados, 0)
  const semana = dias.slice(-7)
  const esperadosSemana = semana.reduce((total, dia) => total + dia.esperados, 0)
  const completadosSemana = semana.reduce((total, dia) => total + dia.completados, 0)
  const constanciaTreintaDias = esperados ? Math.round(completados / esperados * 100) : 0
  const promedioSemanal = esperadosSemana ? Math.round(completadosSemana / esperadosSemana * 100) : 0

  return { resumenSemanal, constanciaTreintaDias, promedioSemanal }
}


// exportar
module.exports = {
  buscarGruposYHabitos,
  buscarRegistrosRecientes,
  contarHabitosActivos,
  obtenerDatosConstanciaPerfil,
}
