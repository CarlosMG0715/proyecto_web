require('dotenv').config()
const { cerrarGruposDelDia } = require('../src/services/servicioCierreDiario')
const { prisma } = require('../src/conexionBaseDatos')
cerrarGruposDelDia()
  .then((processed) => console.log({ processed }))
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
