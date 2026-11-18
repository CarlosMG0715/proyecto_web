require('dotenv').config()
const { createServer } = require('node:http')
const app = require('./src/aplicacion')
const { prisma } = require('./src/conexionBaseDatos')
const { conectarTiempoReal } = require('./src/tiempoReal')
const { iniciarCierreDiario } = require('./src/jobs/cierreDiario')
if (require.main === module) {
  const server = createServer(app)
  const io = conectarTiempoReal(server)
  const port = Number(process.env.PORT || 3000)
  let stopJob
  server.on('error', (error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  server.listen(port, () => {
    stopJob = iniciarCierreDiario()
    console.log(`Kordia API: http://localhost:${port}`)
  })
  async function shutdown() {
    stopJob?.()
    io.close()
    server.close()
    await prisma.$disconnect()
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
module.exports = app
