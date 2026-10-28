// arranque del proceso: lee variables locales y crea express y prisma.
require('dotenv').config()

const app = require('./src/app')
const { prisma } = require('./src/prisma')

if (require.main === module) {
  // solo abre el puerto cuando este archivo se ejecuta directamente.
  const port = Number(process.env.PORT || 3000)
  const server = app.listen(port, () => {
    console.log(`API escuchando en http://localhost:${port}`)
  })

  const shutdown = (signal) => {
    // cierra conexiones de forma ordenada para no dejar trabajo de base pendiente.
    console.log(`Recibida señal ${signal}; cerrando servidor`)
    server.close(async (error) => {
      if (error) {
        console.error(error)
        process.exitCode = 1
      }

      await prisma.$disconnect()
      process.exit()
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

module.exports = app
