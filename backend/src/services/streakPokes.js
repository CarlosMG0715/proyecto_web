const { prisma } = require('../prisma')

function today(timeZone = 'America/Bogota') {
  return new Date(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()))
}

function conflict(message) {
  return Object.assign(new Error(message), { status: 409 })
}

async function send(groupId, senderId, recipientId) {
  if (senderId === recipientId) throw conflict('Elige a otro miembro del grupo.')
  const group = await prisma.group.findFirst({
    where: {
      id: groupId, archivedAt: null,
      habits: { some: { isActive: true } },
      memberships: { some: { userId: recipientId, fallenAt: null } },
    },
    select: { timeZone: true },
  })
  if (!group) throw conflict('Este miembro no tiene una misión activa en el grupo.')
  const check = await prisma.groupDailyCheck.findUnique({
    where: { groupId_userId_localDate: { groupId, userId: recipientId, localDate: today(group.timeZone) } },
  })
  if (check) throw conflict('Este miembro ya registró su aporte.')
  const data = { groupId, senderId, recipientId, localDate: today() }
  await prisma.streakPoke.create({ data }).catch(error => {
    if (error.code === 'P2002') throw conflict('Ya le diste un toque hoy.')
    throw error
  })
}

async function list(userId) {
  return prisma.streakPoke.findMany({
    where: {
      recipientId: userId, localDate: today(),
      group: { archivedAt: null, memberships: { some: { userId, fallenAt: null } } },
    },
    select: { id: true, groupId: true, group: { select: { name: true } }, sender: { select: { name: true } } },
    orderBy: { id: 'asc' },
  })
}

module.exports = { send, list }
