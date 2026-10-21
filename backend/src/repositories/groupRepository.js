const { prisma } = require('../prisma')

const groupRepository = {
  createWithAdmin({ name, timeZone, inviteCode, userId }) {
    return prisma.group.create({
      data: {
        name,
        timeZone,
        inviteCode,
        createdById: userId,
        memberships: { create: { userId, role: 'ADMIN' } },
      },
    })
  },

  findByInviteCode(inviteCode) {
    return prisma.group.findUnique({ where: { inviteCode } })
  },

  findMembership(groupId, userId) {
    return prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
    })
  },

  addMember(groupId, userId) {
    return prisma.groupMembership.create({ data: { groupId, userId } })
  },

  listByUser(userId) {
    return prisma.group.findMany({
      where: { memberships: { some: { userId } } },
      include: { _count: { select: { memberships: true, habits: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  findByIdWithMembers(groupId) {
    return prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: { include: { user: { select: { id: true, name: true } } } },
      },
    })
  },
}

module.exports = groupRepository