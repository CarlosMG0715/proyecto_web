const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { prisma } = require('./conexionBaseDatos')
const { secretoJwt, origenesPermitidos } = require('./configuracion')
let io
function conectarTiempoReal(server) {
  io = new Server(server, {
    cors: { origin: origenesPermitidos, credentials: true },
  })
  io.on('connection', (socket) => {
    // Solo se emiten avisos de cambio. Los datos se consultan por HTTP con permisos vigentes.
    socket.on('watch-group', async (idGrupo, reply) => {
      try {
        const user = jwt.verify(socket.handshake.auth.token, secretoJwt)
        const session = await prisma.sesion.findFirst({
          where: {
            idUsuario: user.idUsuario,
            idFamilia: user.idFamilia,
            revocado: false,
            venceEn: { gt: new Date() },
          },
        })
        const member =
          typeof idGrupo === 'string' &&
          (await prisma.membresiaGrupo.findUnique({
            where: { idGrupo_idUsuario: { idGrupo, idUsuario: user.idUsuario } },
          }))
        if (!session || !member) throw new Error('No autorizado')
        for (const room of socket.rooms)
          if (room !== socket.id) socket.leave(room)
        socket.join(idGrupo)
        reply?.({ ok: true })
      } catch {
        reply?.({ ok: false })
        socket.disconnect()
      }
    })
  })
  return io
}
function notificarGrupo(idGrupo) {
  io?.to(idGrupo).emit('group-changed', idGrupo)
}
module.exports = { conectarTiempoReal, notificarGrupo }
