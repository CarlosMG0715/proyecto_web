const { prisma } = require('../prisma')

/**
 * Modelos y contratos de datos de la aplicación.
 * Centraliza las referencias al cliente de Prisma y validaciones.
 */
module.exports = {
  prisma,
  User: prisma.user,
  Group: prisma.group,
  GroupMembership: prisma.groupMembership,
  Habit: prisma.habit,
  CheckIn: prisma.checkIn,
  Penalty: prisma.penalty,
  Message: prisma.message,
  Session: prisma.session,
}
