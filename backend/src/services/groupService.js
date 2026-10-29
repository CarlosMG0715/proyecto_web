// reglas de grupos y conversion del modelo de prisma al formato que consume vue.
const crypto = require('crypto')
const { prisma } = require('../prisma')
const groupRepository = require('../repositories/groupRepository')

const httpError = (message, status) => Object.assign(new Error(message), { status })
const INVITE_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const inviteCodePrefix = (groupName) => {
  const clean = String(groupName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
  return (clean.slice(0, 4) || 'KORD').padEnd(4, 'X')
}
const newInviteCode = (groupName) => {
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += INVITE_CODE_CHARS[crypto.randomInt(INVITE_CODE_CHARS.length)]
  }
  return `${inviteCodePrefix(groupName)}-${suffix}`
}

// Convierte la fila de Prisma en el contrato `Group` del frontend (types/group.ts)
function toGroupDto(group, currentUserId) {
  // combina miembros, checks de hoy, habitos y mensajes en un solo objeto de respuesta.
  const today = localDateKey(group.timeZone || 'America/Bogota')
  const activeHabits = (group.habits || []).filter((habit) => habit.isActive)
  const habits = activeHabits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    icon: habit.icon,
    description: habit.description,
    checks: Object.fromEntries((habit.checkIns || []).filter((check) => check.checkInDate.toISOString().slice(0, 10) === today).map((check) => [check.userId, {
      done: true, note: check.note || '',
    }])),
  }))
  const dateKeys = recentDateKeys(group.timeZone || 'America/Bogota', 30)
  const doneDatesForMember = (userId) => dateKeys.filter((date) => activeHabits.length > 0 && activeHabits.every((habit) =>
    (habit.checkIns || []).some((check) => check.userId === userId && check.checkInDate.toISOString().slice(0, 10) === date),
  ))
  const members = group.memberships.map((m) => {
    const eligibleDates = dateKeys.filter((date) => date >= localDateKey(group.timeZone || 'America/Bogota', m.joinedAt))
    const doneDates = new Set(doneDatesForMember(m.user.id))
    const daysTotal = eligibleDates.length
    const daysCompleted = eligibleDates.filter((date) => doneDates.has(date)).length
    const memberStreak = consecutiveDays(doneDates, dateKeys)
    return {
      id: m.user.id,
      name: m.user.name,
      avatarUrl: null,
      characterId: m.user.characterId,
      themeId: m.user.themeId,
      role: m.role,
      habit: habits.map((h) => h.name).join(', '),
      daysCompleted,
      daysTotal,
      streak: memberStreak,
      checkedInToday: habits.length > 0 && habits.every((habit) => habit.checks[m.user.id]?.done),
      isCurrentUser: m.user.id === currentUserId,
      isOnline: false,
    }
  })
  const groupDoneDates = new Set(dateKeys.filter((date) =>
    group.memberships.length > 0 && group.memberships.every((membership) => doneDatesForMember(membership.user.id).includes(date)),
  ))
  const closedDates = dateKeys.slice(1, 7).reverse()
  const completionHistory = closedDates.map((date) => {
    const expected = group.memberships.length * habits.length
    if (!expected) return 0
    const done = activeHabits.reduce((sum, habit) => sum + (habit.checkIns || []).filter((check) => check.checkInDate.toISOString().slice(0, 10) === date).length, 0)
    return Math.round((done / expected) * 100)
  })
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    category: group.category,
    inviteCode: group.inviteCode,
    color: group.color,
    streak: consecutiveDays(groupDoneDates, dateKeys),
    health: 100,
    completionHistory,
    timeZone: group.timeZone,
    habits,
    members,
    messages: (group.messages || []).map((m) => ({
      id: m.id, kind: m.type.toLowerCase(), authorId: m.userId,
      text: m.content, sentAt: m.createdAt.toISOString(),
    })),
  }
}

function localDateKey(timeZone, referenceDate = new Date()) {
  // usa el calendario del grupo porque su dia puede diferir del dia utc del servidor.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(referenceDate)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function recentDateKeys(timeZone, count) {
  const today = localDateKey(timeZone)
  const [year, month, day] = today.split('-').map(Number)
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1, day - offset, 12))
    return date.toISOString().slice(0, 10)
  })
}

function consecutiveDays(doneDates, newestFirst) {
  let index = 0
  if (!doneDates.has(newestFirst[0]) && doneDates.has(newestFirst[1])) index = 1
  let streak = 0
  for (; index < newestFirst.length && doneDates.has(newestFirst[index]); index++) streak++
  return streak
}

const groupInclude = () => ({
  memberships: { include: { user: { select: { id: true, name: true, characterId: true, themeId: true } } }, orderBy: { joinedAt: 'asc' } },
  habits: { include: { checkIns: { where: { checkInDate: { gte: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) } } } } },
  messages: { orderBy: { createdAt: 'asc' }, take: 100 },
})

class GroupService {
  async create({ userId, ...data }) {
    // genera un codigo unico y agrega al creador con rol de admin.
    const requestedInviteCode = data.inviteCode?.startsWith(`${inviteCodePrefix(data.name)}-`)
      ? data.inviteCode
      : null
    for (let i = 0; i < 10; i++) {
      try {
        const group = await groupRepository.createWithAdmin({
          ...data,
          userId,
          inviteCode: i === 0 && requestedInviteCode ? requestedInviteCode : newInviteCode(data.name),
        })
        return this.getForMember({ userId, groupId: group.id })
      } catch (err) {
        if (err.code !== 'P2002') throw err
      }
    }
    throw httpError('No se pudo generar el código de invitación', 500)
  }

  async listMine(userId) {
    // trae los grupos de la persona y los adapta para el frontend.
    const groups = await prisma.group.findMany({
      where: { memberships: { some: { userId } } }, include: groupInclude(),
      orderBy: { createdAt: 'asc' },
    })
    return groups.map((g) => toGroupDto(g, userId))
  }

  async checkInHistory(userId) {
    const records = await prisma.checkIn.findMany({
      where: { userId }, select: { checkInDate: true }, orderBy: { checkInDate: 'asc' },
    })
    return [...new Set(records.map((item) => item.checkInDate.toISOString().slice(0, 10)))]
  }

  async join({ userId, inviteCode }) {
    const group = await groupRepository.findByInviteCode(inviteCode)
    if (!group) throw httpError('Código de invitación inválido', 404)
    if (await groupRepository.findMembership(group.id, userId)) {
      throw httpError('Ya perteneces a este grupo', 409)
    }
    await groupRepository.addMember(group.id, userId)
    return this.getForMember({ userId, groupId: group.id })
  }

  // Ownership: solo miembros ven el grupo
  async getForMember({ userId, groupId }) {
    // no permite ver un grupo si la cuenta no tiene membresia.
    if (!(await groupRepository.findMembership(groupId, userId))) {
      throw httpError('No tienes acceso a este grupo', 403)
    }
    const group = await prisma.group.findUnique({ where: { id: groupId }, include: groupInclude() })
    if (!group) throw httpError('Grupo no encontrado', 404)
    return toGroupDto(group, userId)
  }

  async updateGroup({ userId, groupId, ...changes }) {
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    if (membership.role !== 'ADMIN') throw httpError('Solo quien administra el grupo puede editarlo', 403)
    const group = await prisma.group.update({ where: { id: groupId }, data: changes })
    return this.getForMember({ userId, groupId: group.id })
  }

  async leaveGroup({ userId, groupId }) {
    return prisma.$transaction(async (tx) => {
      const membership = await tx.groupMembership.findUnique({ where: { groupId_userId: { groupId, userId } } })
      if (!membership) throw httpError('Ya no perteneces a este grupo', 404)
      const otherMembers = await tx.groupMembership.findMany({
        where: { groupId, userId: { not: userId } },
        orderBy: { joinedAt: 'asc' },
      })
      let promotedMemberId = null
      if (membership.role === 'ADMIN' && otherMembers.length) {
        const nextAdmin = otherMembers.find((member) => member.role === 'ADMIN') ?? otherMembers[0]
        if (nextAdmin.role !== 'ADMIN') {
          await tx.groupMembership.update({ where: { id: nextAdmin.id }, data: { role: 'ADMIN' } })
          promotedMemberId = nextAdmin.userId
        }
      }
      if (!otherMembers.length) {
        await tx.groupMembership.delete({ where: { id: membership.id } })
        return { groupId, groupDeleted: false, groupArchived: true, promotedMemberId: null }
      }
      await tx.groupMembership.delete({ where: { id: membership.id } })
      return { groupId, groupDeleted: false, groupArchived: false, promotedMemberId }
    })
  }

  async createHabit({ userId, groupId, name, description, icon }) {
    // comprueba el rol en el servidor; ocultar el boton en vue no es seguridad.
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    if (membership.role !== 'ADMIN') throw httpError('Solo un administrador puede crear hábitos', 403)
    const habit = await prisma.habit.create({ data: { groupId, createdById: userId, name, icon, description: description || null } })
    return { id: habit.id, name: habit.name, icon: habit.icon, description: habit.description, checks: {} }
  }

  async updateHabit({ userId, groupId, habitId, ...data }) {
    // solo administradores pueden editar habitos activos de su grupo.
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    if (membership.role !== 'ADMIN') throw httpError('Solo un administrador puede editar hábitos', 403)
    const existing = await prisma.habit.findFirst({ where: { id: habitId, groupId, isActive: true } })
    if (!existing) throw httpError('Hábito no encontrado', 404)
    const habit = await prisma.habit.update({ where: { id: habitId }, data })
    return { id: habit.id, name: habit.name, icon: habit.icon, description: habit.description, checks: {} }
  }

  async deleteHabit({ userId, groupId, habitId }) {
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    if (membership.role !== 'ADMIN') throw httpError('Solo un administrador puede eliminar hábitos', 403)
    const activeCount = await prisma.habit.count({ where: { groupId, isActive: true } })
    if (activeCount <= 1) throw httpError('El grupo debe conservar al menos un hábito activo', 409)
    const result = await prisma.habit.updateMany({ where: { id: habitId, groupId, isActive: true }, data: { isActive: false } })
    if (!result.count) throw httpError('Hábito no encontrado', 404)
    return { id: habitId, deleted: true }
  }

  async checkIn({ userId, groupId, habitId, note }) {
    // si ya existe el check de hoy lo quita; si no, crea el registro diario.
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    const habit = await prisma.habit.findFirst({ where: { id: habitId, groupId, isActive: true } })
    if (!habit) throw httpError('Hábito no encontrado', 404)
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { timeZone: true } })
    const checkInDate = new Date(`${localDateKey(group.timeZone)}T00:00:00.000Z`)
    const existing = await prisma.checkIn.findUnique({ where: { habitId_userId_checkInDate: { habitId, userId, checkInDate } } })
    if (existing) {
      await prisma.checkIn.delete({ where: { id: existing.id } })
      return { done: false, note: '' }
    }
    const created = await prisma.checkIn.create({ data: { habitId, userId, checkInDate, note: note || '' } })
    return { done: true, note: created.note }
  }

  async updateCheckInNote({ userId, groupId, habitId, note }) {
    // cambia la nota del check-in de hoy dentro del grupo indicado.
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { timeZone: true } })
    const checkInDate = new Date(`${localDateKey(group.timeZone)}T00:00:00.000Z`)
    const result = await prisma.checkIn.updateMany({ where: { habitId, userId, checkInDate, habit: { groupId } }, data: { note } })
    if (!result.count) throw httpError('Primero completa el hábito para añadir una nota', 409)
  }

  async sendMessage({ userId, groupId, content }) {
    // confirma membresia antes de guardar un mensaje en el chat.
    if (!(await groupRepository.findMembership(groupId, userId))) throw httpError('No tienes acceso a este grupo', 403)
    const message = await prisma.message.create({ data: { groupId, userId, content }, include: { user: { select: { id: true, name: true } } } })
    return { id: message.id, kind: 'user', authorId: message.userId, text: message.content, sentAt: message.createdAt.toISOString() }
  }
}

module.exports = new GroupService()
