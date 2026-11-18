// Acceso a PostgreSQL mediante Prisma: consultas compartidas y transacciones de grupos.
const { prisma } = require('../conexionBaseDatos')
const crearErrorHttp = require('../utils/errorHttp')
const usuarioPublico = { id: true, name: true, idPersonaje: true, idTema: true }
const details = {
  membresias: {
    include: { user: { select: usuarioPublico } },
    orderBy: { ingresoEn: 'asc' },
  },
  habits: {
    where: { activo: true },
    include: { registrosHabito: true },
    orderBy: { creadoEn: 'asc' },
  },
  messages: {
    orderBy: { creadoEn: 'desc' },
    take: 100,
    include: { user: { select: usuarioPublico } },
  },
  cierres: { orderBy: { fechaLocal: 'desc' } },
  riesgosDesercion: true,
}
function buscarGrupo(id, db = prisma) {
  return db.grupo.findUnique({ where: { id }, include: details })
}
function listarGruposDelUsuario(idUsuario) {
  return prisma.grupo.findMany({
    where: { membresias: { some: { idUsuario } } },
    include: details,
    orderBy: { creadoEn: 'desc' },
  })
}
// Una transacción por cambio. El bloqueo del grupo evita checks/cierres simultáneos inconsistentes.
async function change(idGrupo, action) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (db) => {
          const locked = await db.grupo.updateMany({
            where: { id: idGrupo },
            data: { version: { increment: 1 } },
          })
          if (!locked.count) throw crearErrorHttp('Grupo no encontrado', 404)
          return action(db, await buscarGrupo(idGrupo, db))
        },
        { isolationLevel: 'Serializable', timeout: 15000 },
      )
    } catch (error) {
      if (error.code !== 'P2034') throw error
    }
  }
  throw crearErrorHttp('Hubo otro cambio al mismo tiempo. Inténtalo de nuevo.', 409)
}
module.exports = { prisma, buscarGrupo, listarGruposDelUsuario, change }
