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


// calculos


function contarHabitosActivos(membresias) {
  let total = 0

  for (const membresia of membresias) {
    total = total + membresia.group.habits.length
  }

  return total
}


// 7 dias hasta hoy
function crearFechasUltimosSieteDias(fechaFinal = claveFecha()) {
  const fechas = []

  for (let i = -6; i <= 0; i++) {
    fechas.push(desplazarDia(fechaFinal, i))
  }

  return fechas
}


function calcularPorcentajeDelDia(registros, totalHabitos, fecha) {
  if (totalHabitos === 0) return 0

  let cantidadChecks = 0

  for (const registro of registros) {
    // fecha de la base en UTC
    const fechaRegistro = claveFecha(registro.fechaRegistro, 'UTC')

    if (fechaRegistro === fecha) {
      cantidadChecks++
    }
  }

  return Math.round((cantidadChecks / totalHabitos) * 100)
}


// datos para las barras
function crearResumenSemanal(registros, totalHabitos) {
  const fechas = crearFechasUltimosSieteDias()
  const resumen = []

  for (const fecha of fechas) {
    const porcentaje = calcularPorcentajeDelDia(
      registros,
      totalHabitos,
      fecha,
    )

    resumen.push({ fecha, porcentaje })
  }

  return resumen
}


// 30 dias con los habitos activos actuales
function calcularConstanciaTreintaDias(registros, totalHabitos) {
  const checksEsperados = totalHabitos * 30

  if (checksEsperados === 0) return 0

  return Math.round((registros.length / checksEsperados) * 100)
}


// funcion principal
async function obtenerDatosConstanciaPerfil(idUsuario) {
  const membresias = await buscarGruposYHabitos(idUsuario)
  const registros = await buscarRegistrosRecientes(idUsuario)
  const totalHabitos = contarHabitosActivos(membresias)

  const resumenSemanal = crearResumenSemanal(registros, totalHabitos)
  const constanciaTreintaDias = calcularConstanciaTreintaDias(
    registros,
    totalHabitos,
  )

  return { resumenSemanal, constanciaTreintaDias }
}


// exportar
module.exports = {
  buscarGruposYHabitos,
  buscarRegistrosRecientes,
  contarHabitosActivos,
  obtenerDatosConstanciaPerfil,
}
