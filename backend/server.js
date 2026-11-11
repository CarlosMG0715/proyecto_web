require('dotenv').config()

const { createServer } = require('node:http')
const { Server } = require('socket.io')
const app = require('./src/app')
const { prisma } = require('./src/prisma')
const { startDailyReminders } = require('./src/services/dailyReminder')

if (require.main === module) {
  // solo abre el puerto cuando este archivo se ejecuta directamente.
  const port = Number(process.env.PORT || 3000)
  let stopReminders
  const server = createServer(app)
  const io = new Server(server)
  server.listen(port, '0.0.0.0', (error) => {
    if (error) {
      console.error(error.code === 'EADDRINUSE'
        ? `No se pudo iniciar la API: el puerto ${port} ya está ocupado por otro proceso.`
        : `No se pudo iniciar la API: ${error.message}`)
      process.exitCode = 1
      return
    }
    stopReminders = startDailyReminders()
    console.log(`API escuchando en http://localhost:${port}`)
  })

  const shutdown = (signal) => {
    // cierra conexiones de forma ordenada para no dejar trabajo de base pendiente.
    console.log(`Recibida señal ${signal}; cerrando servidor`)
    stopReminders?.()
    io.close(async (error) => {
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
