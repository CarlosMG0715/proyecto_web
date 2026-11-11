require('dotenv').config()

const groupService = require('../src/services/groupService')
const { prisma } = require('../src/prisma')

async function main() {
  try {
    const processed = await groupService.closeDailyGroups()
    console.log(`Cierre diario: ${processed} grupos revisados.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Falló el cierre diario de grupos:', error.message)
  process.exitCode = 1
})
