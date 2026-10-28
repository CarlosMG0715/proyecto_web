// una instancia compartida evita crear un cliente de base de datos por peticion.
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

module.exports = { prisma }
