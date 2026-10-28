// reglas de grupos y conversion del modelo de prisma al formato que consume vue.
const crypto = require('crypto')
const { prisma } = require('../prisma')
const groupRepository = require('../repositories/groupRepository')

const httpError = (message, status) => Object.assign(new Error(message), { status })
const newInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase()

// Convierte la fila de Prisma en el contrato `Group` del frontend (types/group.ts)
function toGroupDto(group, currentUserId) {
  // combina miembros, checks de hoy, habitos y mensajes en un solo objeto de respuesta.
  const today = localDateKey(group.timeZone || 'America/Bogota')
  const habits = (group.habits || []).filter((habit) => habit.isActive).map((habit) => ({
    id: habit.id,
    name: habit.name,
    icon: habit.icon,
    description: habit.description,
    checks: Object.fromEntries((habit.checkIns || []).filter((check) => check.checkInDate.toISOString().slice(0, 10) === today).map((check) => [check.userId, {
      done: true, note: check.note || '',
    }])),
  }))
  const members = group.memberships.map((m) => {
    const completed = habits.reduce((count, habit) => count + (habit.checks[m.user.id]?.done ? 1 : 0), 0)
    return {
      id: m.user.id,
      name: m.user.name,
      avatarUrl: null,
      role: m.role,
      habit: habits.map((h) => h.name).join(', '),
      daysCompleted: completed,
      daysTotal: habits.length,
      streak: 0,
      checkedInToday: habits.length > 0 && completed === habits.length,
      isCurrentUser: m.user.id === currentUserId,
      isOnline: false,
    }
  })
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    category: group.category,
    inviteCode: group.inviteCode,
    color: group.color,
    streak: 0,
    health: 100,
    completionHistory: [],
    timeZone: group.timeZone,
    habits,
    members,
    messages: (group.messages || []).map((m) => ({
      id: m.id, kind: m.type.toLowerCase(), authorId: m.userId,
      text: m.content, sentAt: m.createdAt.toISOString(),
    })),
  }
}

function localDateKey(timeZone) {
  // usa el calendario del grupo porque su dia puede diferir del dia utc del servidor.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

const groupInclude = () => ({
  memberships: { include: { user: { select: { id: true, name: true } } }, orderBy: { joinedAt: 'asc' } },
  habits: { include: { checkIns: { where: { checkInDate: { gte: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) } } } } },
  messages: { orderBy: { createdAt: 'asc' }, take: 100 },
})

class GroupService {
  async create({ userId, ...data }) {
    // genera un codigo unico y agrega al creador con rol de admin.
    for (let i = 0; i < 3; i++) {
      try {
        const group = await groupRepository.createWithAdmin({
          ...data, userId, inviteCode: newInviteCode(),
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
