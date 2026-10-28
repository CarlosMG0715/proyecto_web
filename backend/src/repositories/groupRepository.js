// consultas de grupos y membresias; las reglas de acceso pertenecen al servicio.
const { prisma } = require('../prisma')

const withMembers = {
  // incluye los nombres de usuario necesarios para formar la respuesta del grupo.
  memberships: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  },
}

const groupRepository = {
  createWithAdmin({ name, category, description, color, timeZone, inviteCode, userId, initialHabit }) {
    // crea el grupo y su primera membresia en una sola operacion prisma.
    return prisma.group.create({
      data: {
        name, category, description, color, timeZone, inviteCode,
        createdById: userId,
        memberships: { create: { userId, role: 'ADMIN' } },
        habits: { create: { name: initialHabit.name, icon: initialHabit.icon, createdById: userId } },
      },
      include: withMembers,
    })
  },

  findByInviteCode(inviteCode) {
    return prisma.group.findUnique({ where: { inviteCode }, include: withMembers })
  },

  findMembership(groupId, userId) {
    return prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId, userId } } })
  },

  addMember(groupId, userId) {
    return prisma.groupMembership.create({ data: { groupId, userId } })
  },

  listByUser(userId) {
    // busca solo grupos que tengan una membresia para este usuario.
    return prisma.group.findMany({
      where: { memberships: { some: { userId } } },
      include: withMembers,
      orderBy: { createdAt: 'asc' },
    })
  },

  findById(groupId) {
    return prisma.group.findUnique({ where: { id: groupId }, include: withMembers })
  },
}

module.exports = groupRepository
