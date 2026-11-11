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
  const timeZone = group.timeZone || 'America/Bogota'
  const today = localDateKey(timeZone)
  const activeHabits = (group.habits || []).filter((habit) => habit.isActive)
  const habits = activeHabits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    icon: habit.icon,
    description: habit.description,
    targetDays: habit.targetDays,
    joined: Boolean(habit.participants?.some((entry) => entry.userId === currentUserId)),
    checks: Object.fromEntries((habit.checkIns || []).filter((check) => check.checkInDate.toISOString().slice(0, 10) === today).map((check) => [check.userId, {
      done: true, note: check.note || '',
    }])),
  }))
  const dateKeys = recentDateKeys(timeZone, 30)
  const firstActiveHabitDay = activeHabits.map(habit => localDateKey(timeZone, habit.createdAt)).sort()[0]
  const archivedDay = group.archivedAt ? localDateKey(timeZone, group.archivedAt) : null
  const returnsByMember = new Map()
  for (const request of group.joinRequests || []) {
    const stats = returnsByMember.get(request.requesterId) ?? { count: 0, revived: 0, pending: false }
    stats.count++
    if (request.status === 'ACCEPTED') stats.revived++
    stats.pending ||= request.status === 'PENDING'
    returnsByMember.set(request.requesterId, stats)
  }
  const checksByMember = new Map()
  for (const check of group.dailyChecks || []) {
    if (!checksByMember.has(check.userId)) checksByMember.set(check.userId, new Map())
    checksByMember.get(check.userId).set(check.localDate.toISOString().slice(0, 10), check)
  }
  const didCheck = (userId, date) => checksByMember.get(userId)?.has(date) ?? false
  const members = group.memberships.map((m) => {
    const todayCheck = checksByMember.get(m.user.id)?.get(today)
    const joinedDay = localDateKey(timeZone, m.joinedAt)
    const eligibleDates = dateKeys.filter((date) => date >= joinedDay)
    const daysTotal = eligibleDates.length
    const daysCompleted = eligibleDates.filter((date) => didCheck(m.user.id, date)).length
    const memberStreak = consecutiveDays(today, (date) => didCheck(m.user.id, date))
    const recentActivity = dateKeys.slice(1, 8).reverse().map(date => ({
      date,
      completed: firstActiveHabitDay && date >= joinedDay && date >= firstActiveHabitDay && (!archivedDay || date < archivedDay)
        ? didCheck(m.user.id, date)
        : null,
    }))
    const missedDays = recentActivity.filter(day => day.completed === false).length
    const returns = returnsByMember.get(m.user.id)
    return {
      id: m.user.id,
      name: m.user.name,
      avatarUrl: null,
      characterId: m.user.characterId,
      themeId: m.user.themeId,
      role: m.role,
      isFallen: Boolean(m.fallenAt),
      fallenAt: m.fallenAt,
      missedDaysLastWeek: missedDays,
      recentActivity,
      bestGroupStreak: longestStreak(checksByMember.get(m.user.id)),
      returnRequests: returns?.count ?? 0,
      revivalCount: returns?.revived ?? 0,
      hasPendingReturn: returns?.pending ?? false,
      dropoutRiskMissedDays: !group.archivedAt && missedDays >= 3 && !returns?.pending ? missedDays : 0,
      habit: habits.map((h) => h.name).join(', '),
      daysCompleted,
      daysTotal,
      streak: memberStreak,
      checkedInToday: Boolean(todayCheck),
      dailyReport: todayCheck ? dailyReport(todayCheck) : null,
      isCurrentUser: m.user.id === currentUserId,
      isOnline: false,
    }
  })
  const lastMiss = group.closures?.[0]?.localDate.toISOString().slice(0, 10) ?? ''
  const groupStreak = consecutiveDays(today, (date) => date > lastMiss &&
    group.memberships.length > 0 && group.memberships.every((member) => didCheck(member.userId, date)))
  const closedDates = dateKeys.slice(1, 7).reverse()
  const completionHistory = closedDates.map((date) => {
    const expected = group.memberships.length
    if (!expected) return 0
    const done = group.memberships.filter((member) => didCheck(member.userId, date)).length
    return Math.round((done / expected) * 100)
  })
  return {
    id: group.id,
    name: group.name,
    targetDays: group.targetDays,
    description: group.description,
    category: group.category,
    inviteCode: group.inviteCode,
    color: group.color,
    streak: groupStreak,
    archivedAt: group.archivedAt,
    health: group.archivedAt ? 0 : Math.max(0, 100 - 20 * members.filter((member) => member.isFallen).length),
    completionHistory,
    timeZone: group.timeZone,
    habits,
    members,
    messages: (group.memberships.some((member) => member.userId === currentUserId && member.fallenAt) ? [] : group.messages || []).slice().reverse().map((m) => ({
      id: m.id, kind: m.type.toLowerCase(), authorId: m.userId,
      text: m.content, sentAt: m.createdAt.toISOString(),
      habitId: m.contextType === 'HABIT_CREATED' ? m.contextId : undefined,
    })),
  }
}

function dailyReport(check) {
  return {
    habitIds: check.completedHabitIds,
    note: check.note ?? '',
    energy: Math.max(1, check.completedHabitIds.length),
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

function consecutiveDays(today, didCheck) {
  const date = new Date(`${today}T00:00:00.000Z`)
  if (!didCheck(today)) date.setUTCDate(date.getUTCDate() - 1)
  let streak = 0
  while (didCheck(date.toISOString().slice(0, 10))) {
    streak++
    date.setUTCDate(date.getUTCDate() - 1)
  }
  return streak
}

function longestStreak(checks) {
  let longest = 0
  let streak = 0
  let previous
  for (const date of [...(checks?.keys() ?? [])].sort()) {
    const day = Date.parse(date)
    streak = day - previous === 86_400_000 ? streak + 1 : 1
    longest = Math.max(longest, streak)
    previous = day
  }
  return longest
}

const groupInclude = () => ({
  memberships: { include: { user: { select: { id: true, name: true, characterId: true, themeId: true } } }, orderBy: { joinedAt: 'asc' } },
  habits: { include: { participants: { select: { userId: true } } } },
  dailyChecks: { select: { userId: true, localDate: true, completedHabitIds: true, note: true } },
  joinRequests: { where: { isReturn: true }, select: { requesterId: true, status: true } },
  closures: { where: { penaltyApplied: true }, orderBy: { localDate: 'desc' }, take: 1 },
  messages: { orderBy: { createdAt: 'desc' }, take: 100 },
})

async function closeYesterday(group) {
  if (group.archivedAt) return false
  // Recupera grupos que ya tienen a todos sus miembros caídos, incluso si
  // ese estado quedó guardado antes de que existiera el cierre automático.
  if (group.memberships.length > 0 && group.memberships.every((member) => member.fallenAt)) {
    await prisma.group.updateMany({
      where: {
        id: group.id, archivedAt: null,
        memberships: { some: {}, none: { fallenAt: null } },
      },
      data: { archivedAt: new Date() },
    })
    return true
  }
  const zone = group.timeZone || 'America/Bogota'
  const yesterday = recentDateKeys(zone, 2)[1]
  const localDate = new Date(`${yesterday}T00:00:00.000Z`)
  if (!group.habits.some((habit) => habit.isActive && localDateKey(zone, habit.createdAt) <= yesterday)) return false
  const members = group.memberships.filter((member) =>
    !member.fallenAt && localDateKey(zone, member.joinedAt) <= yesterday)
  if (!members.length) return false

  const missed = members.filter((member) => !group.dailyChecks.some((check) =>
    check.userId === member.userId && check.localDate.getTime() === localDate.getTime()))
  const completed = members.length - missed.length

  return prisma.$transaction(async (tx) => {
    const claim = await tx.dailyClosure.createMany({
      data: { groupId: group.id, localDate, expectedCheckIns: members.length,
        completedCheckIns: completed, completionRate: completed / members.length,
        penaltyApplied: missed.length > 0 },
      skipDuplicates: true,
    })
    if (!claim.count) return missed.length > 0
    const closure = await tx.dailyClosure.findUniqueOrThrow({
      where: { groupId_localDate: { groupId: group.id, localDate } },
    })
    const fallenMembers = []
    for (const member of missed) {
      const changed = await tx.groupMembership.updateMany({
        where: { id: member.id, fallenAt: null },
        data: { fallenAt: new Date() },
      })
      if (!changed.count) continue
      fallenMembers.push(member)
    }

    // La aventura termina solo cuando ya no queda ningún miembro en pie.
    const standingMembers = await tx.groupMembership.count({
      where: { groupId: group.id, fallenAt: null },
    })
    const adventureClosed = group.memberships.length > 0 && standingMembers === 0
    if (adventureClosed) {
      await tx.group.updateMany({
        where: { id: group.id, archivedAt: null },
        data: { archivedAt: new Date() },
      })
    }

    for (const member of fallenMembers) {
      const penalty = await tx.penalty.create({
        data: { groupId: group.id, userId: member.userId, closureId: closure.id,
          idempotencyKey: `missed:${group.id}:${member.userId}:${yesterday}`,
          reason: 'Aporte diario pendiente al cierre' },
      })
      await tx.message.create({
        data: { groupId: group.id, type: 'SYSTEM', contextType: 'PENALTY', contextId: penalty.id,
          content: adventureClosed
            ? `${member.user.name} no completó su aporte. La aventura quedó cerrada porque todo el equipo cayó.`
            : `${member.user.name} cayó al cierre del día. El admin puede revivirlo o expulsarlo.` },
      })
    }
    return missed.length > 0 || adventureClosed
  })
}

class GroupService {
  async closeDailyGroups() {
    let cursor
    let processed = 0
    const since = new Date(Date.now() - 3 * 86_400_000)
    for (;;) {
      const groups = await prisma.group.findMany({
        where: { archivedAt: null, memberships: { some: {} } },
        orderBy: { id: 'asc' },
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          archivedAt: true,
          timeZone: true,
          memberships: { include: { user: { select: { name: true } } } },
          habits: { select: { isActive: true, createdAt: true } },
          dailyChecks: { where: { localDate: { gte: since } }, select: { userId: true, localDate: true } },
        },
      })
      if (!groups.length) return processed
      for (const group of groups) {
        await closeYesterday(group)
        processed++
      }
      cursor = groups.at(-1).id
    }
  }

  async assertStanding(groupId, userId) {
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    if (membership.fallenAt) throw httpError('Necesitas aprobación para volver a la aventura', 403)
  }

  async assertActive(groupId) {
    const group = await prisma.group.findUnique({ where: { id: groupId }, include: groupInclude() })
    if (!group) throw httpError('Grupo no encontrado', 404)
    const archived = group.archivedAt || ((await closeYesterday(group)) &&
      (await prisma.group.findUnique({ where: { id: groupId }, select: { archivedAt: true } }))?.archivedAt)
    if (archived) throw httpError('Esta aventura terminó. Crea un grupo nuevo para continuar.', 410)
  }

  async reviveMember({ userId, groupId, memberId }) {
    const admin = await groupRepository.findMembership(groupId, userId)
    if (!admin || admin.role !== 'ADMIN' || userId === memberId) throw httpError('Otro admin debe aprobar el regreso', 403)
    await prisma.$transaction(async (tx) => {
      const restored = await tx.groupMembership.updateMany({
        where: { groupId, userId: memberId, fallenAt: { not: null } },
        data: { fallenAt: null },
      })
      if (!restored.count) throw httpError('Esa persona no está caída', 409)
      await tx.penalty.updateMany({ where: { groupId, userId: memberId, status: 'PENDING' }, data: { status: 'RESOLVED' } })
      const accepted = await tx.groupJoinRequest.updateMany({
        where: { groupId, requesterId: memberId, isReturn: true, status: 'PENDING' },
        data: { status: 'ACCEPTED', decidedById: userId, decidedAt: new Date() },
      })
      if (!accepted.count) {
        await tx.groupJoinRequest.create({
          data: { groupId, requesterId: memberId, isReturn: true, status: 'ACCEPTED', decidedById: userId, decidedAt: new Date() },
        })
      }
    })
    return this.getForMember({ userId, groupId })
  }
  async create({ userId, replaceArchivedGroupId, ...data }) {
    // genera un codigo unico y agrega al creador con rol de admin.
    const requestedInviteCode = data.inviteCode?.startsWith(`${inviteCodePrefix(data.name)}-`)
      ? data.inviteCode
      : null
    for (let i = 0; i < 10; i++) {
      try {
        const payload = {
          ...data,
          userId,
          inviteCode: i === 0 && requestedInviteCode ? requestedInviteCode : newInviteCode(data.name),
        }
        const group = replaceArchivedGroupId
          ? await prisma.$transaction(async (tx) => {
            const removed = await tx.groupMembership.deleteMany({
              where: { groupId: replaceArchivedGroupId, userId, group: { archivedAt: { not: null } } },
            })
            if (!removed.count) throw httpError('La aventura cerrada ya no está en tus grupos.', 409)
            return groupRepository.createWithAdmin(payload, tx)
          })
          : await groupRepository.createWithAdmin(payload)
        return this.getForMember({ userId, groupId: group.id })
      } catch (err) {
        if (err.code !== 'P2002') throw err
      }
    }
    throw httpError('No se pudo generar el código de invitación', 500)
  }

  async listMine(userId) {
    const groups = await prisma.group.findMany({
      where: { memberships: { some: { userId } } }, include: groupInclude(),
      orderBy: { createdAt: 'asc' },
    })
    return Promise.all(groups.map(async (group) => {
      if (!(await closeYesterday(group))) return toGroupDto(group, userId)
      const updated = await prisma.group.findUnique({ where: { id: group.id }, include: groupInclude() })
      return toGroupDto(updated ?? group, userId)
    }))
  }

  async checkInHistory(userId) {
    const [dailyChecks, legacyChecks] = await Promise.all([
      prisma.groupDailyCheck.findMany({
        where: { userId }, select: { localDate: true }, orderBy: { localDate: 'asc' },
      }),
      prisma.checkIn.findMany({
        where: { userId }, select: { checkInDate: true }, orderBy: { checkInDate: 'asc' },
      }),
    ])
    return [...new Set([
      ...dailyChecks.map((item) => item.localDate.toISOString().slice(0, 10)),
      ...legacyChecks.map((item) => item.checkInDate.toISOString().slice(0, 10)),
    ])].sort()
  }

  async getForMember({ userId, groupId }) {
    // no permite ver un grupo si la cuenta no tiene membresia.
    if (!(await groupRepository.findMembership(groupId, userId))) {
      throw httpError('No tienes acceso a este grupo', 403)
    }
    const group = await prisma.group.findUnique({ where: { id: groupId }, include: groupInclude() })
    if (!group) throw httpError('Grupo no encontrado', 404)
    if (!(await closeYesterday(group))) return toGroupDto(group, userId)
    const updated = await prisma.group.findUnique({ where: { id: groupId }, include: groupInclude() })
    return toGroupDto(updated ?? group, userId)
  }

  async updateGroup({ userId, groupId, ...changes }) {
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    if (membership.role !== 'ADMIN') throw httpError('Solo quien administra el grupo puede editarlo', 403)
    const group = await prisma.group.update({ where: { id: groupId }, data: changes })
    return this.getForMember({ userId, groupId: group.id })
  }

  async setMemberRole({ userId, groupId, memberId, role }) {
    const actor = await groupRepository.findMembership(groupId, userId)
    if (!actor || actor.role !== 'ADMIN') throw httpError('Solo un admin puede administrar miembros', 403)
    if (memberId === userId) throw httpError('No puedes cambiar tu propio rol desde aquí', 400)
    if (!['ADMIN', 'MIEMBRO'].includes(role)) throw httpError('El rol no es válido', 400)
    const target = await groupRepository.findMembership(groupId, memberId)
    if (!target) throw httpError('No encontramos a esa persona en el grupo', 404)
    if (actor.fallenAt && (role !== 'ADMIN' || target.fallenAt)) {
      throw httpError('Solo puedes nombrar admin a alguien que siga en pie', 403)
    }
    if (target.role === 'ADMIN' && role === 'MIEMBRO') {
      const admins = await prisma.groupMembership.count({ where: { groupId, role: 'ADMIN' } })
      if (admins <= 1) throw httpError('El grupo debe conservar al menos un admin', 409)
    }
    await prisma.groupMembership.update({ where: { id: target.id }, data: { role } })
    return this.getForMember({ userId, groupId })
  }

  async removeGroupMember({ userId, groupId, memberId }) {
    const actor = await groupRepository.findMembership(groupId, userId)
    if (!actor || actor.role !== 'ADMIN') throw httpError('Solo un admin puede administrar miembros', 403)
    if (memberId === userId) throw httpError('Usa “Salir del grupo” para quitarte del grupo', 400)
    const target = await groupRepository.findMembership(groupId, memberId)
    if (!target) throw httpError('No encontramos a esa persona en el grupo', 404)
    await prisma.$transaction(async (tx) => {
      await tx.groupJoinRequest.updateMany({
        where: { groupId, requesterId: memberId, isReturn: true, status: 'PENDING' },
        data: { status: 'REJECTED', decidedAt: new Date(), decidedById: userId },
      })
      await tx.groupMembership.delete({ where: { id: target.id } })
    })
    return this.getForMember({ userId, groupId })
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

  async createHabit({ userId, groupId, name, description, icon, targetDays }) {
    // comprueba el rol en el servidor; ocultar el boton en vue no es seguridad.
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    if (membership.role !== 'ADMIN') throw httpError('Solo un administrador puede crear hábitos', 403)
    const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId }, select: { targetDays: true } })
    targetDays = group.targetDays ?? targetDays
    const habit = await prisma.$transaction(async (tx) => {
      const created = await tx.habit.create({ data: { groupId, createdById: userId, name, icon, description: description || null, targetDays } })
      await tx.message.create({
        data: { groupId, type: 'SYSTEM', contextType: 'HABIT_CREATED', contextId: created.id,
          content: `Nueva misión: ${created.name}` },
      })
      return created
    })
    return { id: habit.id, name: habit.name, icon: habit.icon, description: habit.description, targetDays: habit.targetDays, checks: {} }
  }

  async updateHabit({ userId, groupId, habitId, ...data }) {
    // solo administradores pueden editar habitos activos de su grupo.
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    if (membership.role !== 'ADMIN') throw httpError('Solo un administrador puede editar hábitos', 403)
    const existing = await prisma.habit.findFirst({ where: { id: habitId, groupId, isActive: true } })
    if (!existing) throw httpError('Hábito no encontrado', 404)
    const habit = await prisma.habit.update({ where: { id: habitId }, data })
    return { id: habit.id, name: habit.name, icon: habit.icon, description: habit.description, targetDays: habit.targetDays, checks: {} }
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

  async setDailyCheck({ userId, groupId, done, habitIds, note }) {
    const group = await this.getForMember({ userId, groupId })
    if (group.members.find((member) => member.id === userId)?.isFallen) {
      throw httpError('Necesitas aprobación para volver a la aventura', 403)
    }
    const localDate = new Date(`${localDateKey(group.timeZone)}T00:00:00.000Z`)
    const check = { groupId, userId, localDate }
    if (!done) {
      await prisma.groupDailyCheck.deleteMany({ where: check })
      return { done, report: null }
    }
    if (!Array.isArray(habitIds) || !habitIds.length || habitIds.length > group.habits.length) {
      throw httpError('Selecciona al menos un hábito que completaste hoy', 400)
    }
    const activeIds = new Set(group.habits.map((habit) => habit.id))
    if (!habitIds.every((id) => activeIds.has(id))) throw httpError('Alguno de esos hábitos ya no está activo', 400)
    if (note !== undefined && (typeof note !== 'string' || note.trim().length > 140)) {
      throw httpError('La nota puede tener hasta 140 caracteres', 400)
    }
    const details = { completedHabitIds: [...new Set(habitIds)], note: note?.trim() || null }
    const saved = await prisma.groupDailyCheck.upsert({
      where: { groupId_userId_localDate: check },
      create: { ...check, ...details },
      update: details,
    })
    return { done, report: dailyReport(saved) }
  }

  async joinHabit({ userId, groupId, habitId }) {
    const group = await this.getForMember({ userId, groupId })
    if (group.members.find((member) => member.id === userId)?.isFallen) {
      throw httpError('Necesitas aprobación para volver a la aventura', 403)
    }
    if (!group.habits.some((habit) => habit.id === habitId)) throw httpError('Esta misión ya no está activa', 404)
    await prisma.habitParticipation.createMany({ data: { habitId, userId }, skipDuplicates: true })
  }

  async checkIn({ userId, groupId, habitId, note }) {
    // si ya existe el check de hoy lo quita; si no, crea el registro diario.
    await this.getForMember({ userId, groupId })
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    if (membership.fallenAt) throw httpError('Necesitas aprobación para volver a la aventura', 403)
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
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { timeZone: true } })
    const checkInDate = new Date(`${localDateKey(group.timeZone)}T00:00:00.000Z`)
    const result = await prisma.checkIn.updateMany({ where: { habitId, userId, checkInDate, habit: { groupId } }, data: { note } })
    if (!result.count) throw httpError('Primero completa el hábito para añadir una nota', 409)
  }

  async sendMessage({ userId, groupId, content }) {
    if (!(await groupRepository.findMembership(groupId, userId))) throw httpError('No tienes acceso a este grupo', 403)
    const message = await prisma.message.create({ data: { groupId, userId, content }, include: { user: { select: { id: true, name: true } } } })
    return { id: message.id, kind: 'user', authorId: message.userId, text: message.content, sentAt: message.createdAt.toISOString() }
  }
}

module.exports = new GroupService()
