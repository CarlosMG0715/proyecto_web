const { prisma } = require('../prisma')
const groupService = require('../services/groupService')
const { GROUP_MEMBER_LIMIT, addGroupMember } = require('../services/groupCapacity')

const httpError = (message, status) => Object.assign(new Error(message), { status })
const selectUser = { id: true, name: true, email: true, characterId: true, themeId: true }

async function listMine(req, res, next) {
  try { return res.json({ groups: await groupService.listMine(req.user.userId) }) }
  catch (error) { return next(error) }
}

async function create(req, res, next) {
  try {
    const group = await groupService.create({ userId: req.user.userId, ...req.body })
    return res.status(201).json({ group })
  } catch (error) { return next(error) }
}

async function requestJoin(req, res, next) {
  try {
    const code = typeof req.body.inviteCode === 'string' ? req.body.inviteCode.trim().toUpperCase() : ''
    if (!code) return res.status(400).json({ error: 'Escribe el código de invitación' })
    let group = await prisma.group.findUnique({ where: { inviteCode: code }, select: { id: true, name: true } })
    if (!group && code.includes('-')) {
      group = await prisma.group.findUnique({
        where: { inviteCode: code.replace('-', '') },
        select: { id: true, name: true },
      })
    }
    if (!group) return res.status(404).json({ error: 'No encontramos una aventura con ese código' })
    await groupService.assertActive(group.id)
    const memberCount = await prisma.groupMembership.count({ where: { groupId: group.id } })
    if (memberCount === 0) return res.status(410).json({ error: 'Esta aventura quedó archivada y ya no recibe solicitudes' })
    const userId = req.user.userId
    const membership = await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId } } })
    if (membership && !membership.fallenAt) {
      return res.status(409).json({ error: 'Ya perteneces a este grupo' })
    }
    const pending = await prisma.groupJoinRequest.findFirst({ where: { groupId: group.id, requesterId: userId, status: 'PENDING' } })
    if (pending) return res.status(200).json({ request: pending, group, alreadyPending: true })
    const isReturn = Boolean(membership?.fallenAt)
    if (!isReturn && memberCount >= GROUP_MEMBER_LIMIT) {
      throw httpError(`Este grupo ya tiene sus ${GROUP_MEMBER_LIMIT} cupos ocupados`, 409)
    }
    if (isReturn && !await prisma.groupMembership.count({
      where: { groupId: group.id, role: 'ADMIN', fallenAt: null, userId: { not: userId } },
    })) throw httpError('Otro admin debe aprobar tu regreso. Puedes nombrar a otro admin desde el grupo.', 409)
    const request = await prisma.groupJoinRequest.create({
      data: { groupId: group.id, requesterId: userId, isReturn },
    }).catch(async (error) => {
      if (!isReturn || error.code !== 'P2002') throw error
      const existing = await prisma.groupJoinRequest.findFirst({
        where: { groupId: group.id, requesterId: userId, isReturn: true, status: 'PENDING' },
      })
      if (!existing) throw error
      return existing
    })
    return res.status(201).json({ request, group })
  } catch (error) { return next(error) }
}

async function inbox(req, res, next) {
  try {
    const requests = await prisma.groupJoinRequest.findMany({
      where: { status: 'PENDING', requesterId: { not: req.user.userId }, group: { archivedAt: null, memberships: { some: { userId: req.user.userId, role: 'ADMIN', fallenAt: null } } } },
      include: { group: { select: { id: true, name: true, inviteCode: true, color: true } }, requester: { select: selectUser } },
      orderBy: { createdAt: 'asc' },
    })
    return res.json({ requests })
  } catch (error) { return next(error) }
}

async function myRequests(req, res, next) {
  try {
    const requests = await prisma.groupJoinRequest.findMany({ where: { requesterId: req.user.userId }, include: { group: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } })
    return res.json({ requests })
  } catch (error) { return next(error) }
}

async function decide(req, res, next) {
  try {
    const action = req.body.action
    if (!['ACCEPTED', 'REJECTED', 'EXPELLED'].includes(action)) return res.status(400).json({ error: 'La decisión no es válida' })
    const pendingRequest = await prisma.groupJoinRequest.findUnique({
      where: { id: req.params.requestId }, select: { groupId: true },
    })
    if (!pendingRequest) throw httpError('La solicitud ya no existe', 404)
    await groupService.assertStanding(pendingRequest.groupId, req.user.userId)
    await groupService.assertActive(pendingRequest.groupId)
    const result = await prisma.$transaction(async (tx) => {
      // Serializa las decisiones para que dos admins no ocupen el mismo cupo.
      await tx.$queryRaw`SELECT id FROM groups WHERE id = ${pendingRequest.groupId} FOR UPDATE`
      const request = await tx.groupJoinRequest.findUnique({ where: { id: req.params.requestId }, include: { group: true } })
      if (!request) throw httpError('La solicitud ya no existe', 404)
      if (request.group.archivedAt) throw httpError('Esta aventura ya terminó', 410)
      const admin = await tx.groupMembership.findUnique({ where: { groupId_userId: { groupId: request.groupId, userId: req.user.userId } } })
      if (!admin || admin.role !== 'ADMIN' || admin.fallenAt) throw httpError('Solo un admin en pie puede responder', 403)
      if (request.requesterId === req.user.userId) throw httpError('Otro admin debe responder tu solicitud', 403)
      if (request.status !== 'PENDING') throw httpError('Esta solicitud ya fue respondida', 409)
      if (action === 'EXPELLED' && !request.isReturn) throw httpError('Solo se puede expulsar a un miembro caído', 400)
      const status = action === 'EXPELLED' ? 'REJECTED' : action
      const decision = await tx.groupJoinRequest.updateMany({
        where: { id: request.id, status: 'PENDING' },
        data: { status, decidedAt: new Date(), decidedById: req.user.userId },
      })
      if (!decision.count) throw httpError('Esta solicitud ya fue respondida', 409)
      if (action === 'EXPELLED') {
        const removed = await tx.groupMembership.deleteMany({
          where: { groupId: request.groupId, userId: request.requesterId, fallenAt: { not: null } },
        })
        if (!removed.count) throw httpError('La persona ya no está caída en este grupo', 409)
        await tx.groupExpulsion.create({ data: { userId: request.requesterId, groupName: request.group.name } })
      } else if (action === 'ACCEPTED' && request.isReturn) {
        const restored = await tx.groupMembership.updateMany({
          where: { groupId: request.groupId, userId: request.requesterId, fallenAt: { not: null } },
          data: { fallenAt: null },
        })
        if (!restored.count) throw httpError('La persona ya no puede volver con esta solicitud', 409)
        await tx.penalty.updateMany({
          where: { groupId: request.groupId, userId: request.requesterId, status: 'PENDING' },
          data: { status: 'RESOLVED' },
        })
      } else if (action === 'ACCEPTED') {
        await addGroupMember(tx, request.groupId, request.requesterId)
      }
      return { request: { ...request, status }, group: { id: request.group.id, name: request.group.name } }
    })
    return res.json(result)
  } catch (error) { return next(error) }
}

async function checkInHistory(req, res, next) {
  try { return res.json({ dates: await groupService.checkInHistory(req.user.userId) }) }
  catch (error) { return next(error) }
}

async function getOne(req, res, next) {
  try { return res.json({ group: await groupService.getForMember({ userId: req.user.userId, groupId: req.params.groupId }) }) }
  catch (error) { return next(error) }
}

async function updateGroup(req, res, next) {
  try { return res.json({ group: await groupService.updateGroup({ userId: req.user.userId, groupId: req.params.groupId, ...req.body }) }) }
  catch (error) { return next(error) }
}

async function setMemberRole(req, res, next) {
  try {
    const group = await groupService.setMemberRole({
      userId: req.user.userId,
      groupId: req.params.groupId,
      memberId: req.params.memberId,
      role: req.body.role,
    })
    return res.json({ group })
  } catch (error) { return next(error) }
}

async function removeGroupMember(req, res, next) {
  try {
    const group = await groupService.removeGroupMember({
      userId: req.user.userId,
      groupId: req.params.groupId,
      memberId: req.params.memberId,
    })
    return res.json({ group })
  } catch (error) { return next(error) }
}

async function leaveGroup(req, res, next) {
  try { return res.json(await groupService.leaveGroup({ userId: req.user.userId, groupId: req.params.groupId })) }
  catch (error) { return next(error) }
}

async function createHabit(req, res, next) {
  try { return res.status(201).json({ habit: await groupService.createHabit({ userId: req.user.userId, groupId: req.params.groupId, ...req.body }) }) }
  catch (error) { return next(error) }
}

async function updateHabit(req, res, next) {
  try { return res.json({ habit: await groupService.updateHabit({ userId: req.user.userId, groupId: req.params.groupId, habitId: req.params.habitId, ...req.body }) }) }
  catch (error) { return next(error) }
}

async function deleteHabit(req, res, next) {
  try { return res.json(await groupService.deleteHabit({ userId: req.user.userId, groupId: req.params.groupId, habitId: req.params.habitId })) }
  catch (error) { return next(error) }
}

async function checkIn(req, res, next) {
  try { return res.json(await groupService.checkIn({ userId: req.user.userId, groupId: req.params.groupId, habitId: req.params.habitId, ...req.body })) }
  catch (error) { return next(error) }
}

async function dailyCheck(req, res, next) {
  try {
    if (typeof req.body?.done !== 'boolean') throw httpError('Indica si completaste el aporte', 400)
    return res.json(await groupService.setDailyCheck({
      userId: req.user.userId, groupId: req.params.groupId, done: req.body.done,
      habitIds: req.body.habitIds, note: req.body.note,
    }))
  } catch (error) { return next(error) }
}

async function joinHabit(req, res, next) {
  try {
    await groupService.joinHabit({
      userId: req.user.userId, groupId: req.params.groupId, habitId: req.params.habitId,
    })
    return res.sendStatus(204)
  } catch (error) { return next(error) }
}

async function updateCheckInNote(req, res, next) {
  try {
    await groupService.updateCheckInNote({ userId: req.user.userId, groupId: req.params.groupId, habitId: req.params.habitId, ...req.body })
    return res.json({ ok: true })
  } catch (error) { return next(error) }
}

async function sendMessage(req, res, next) {
  try { return res.status(201).json({ message: await groupService.sendMessage({ userId: req.user.userId, groupId: req.params.groupId, ...req.body }) }) }
  catch (error) { return next(error) }
}

module.exports = { list: listMine, listMine, create, requestJoin, inbox, myRequests, decide, checkInHistory, getOne, updateGroup, setMemberRole, removeGroupMember, leaveGroup, createHabit, updateHabit, deleteHabit, checkIn, updateCheckInNote, sendMessage, dailyCheck, joinHabit }
