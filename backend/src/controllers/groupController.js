const { prisma } = require('../prisma')
const groupService = require('../services/groupService')

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
    const group = await prisma.group.findUnique({ where: { inviteCode: code }, select: { id: true, name: true } })
    if (!group) return res.status(404).json({ error: 'No encontramos una aventura con ese código' })
    const memberCount = await prisma.groupMembership.count({ where: { groupId: group.id } })
    if (memberCount === 0) return res.status(410).json({ error: 'Esta aventura quedó archivada y ya no recibe solicitudes' })
    const userId = req.user.userId
    if (await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId } } })) {
      return res.status(409).json({ error: 'Ya perteneces a este grupo' })
    }
    const pending = await prisma.groupJoinRequest.findFirst({ where: { groupId: group.id, requesterId: userId, status: 'PENDING' } })
    if (pending) return res.status(200).json({ request: pending, group, alreadyPending: true })
    const request = await prisma.groupJoinRequest.create({ data: { groupId: group.id, requesterId: userId }, include: { group: { select: { id: true, name: true } } } })
    return res.status(201).json({ request, group: request.group })
  } catch (error) { return next(error) }
}

async function inbox(req, res, next) {
  try {
    const requests = await prisma.groupJoinRequest.findMany({
      where: { status: 'PENDING', group: { memberships: { some: { userId: req.user.userId, role: 'ADMIN' } } } },
      include: { group: { select: { id: true, name: true, inviteCode: true } }, requester: { select: selectUser } },
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
    if (!['ACCEPTED', 'REJECTED'].includes(action)) return res.status(400).json({ error: 'La decisión debe ser aceptar o rechazar' })
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.groupJoinRequest.findUnique({ where: { id: req.params.requestId }, include: { group: true } })
      if (!request) throw httpError('La solicitud ya no existe', 404)
      const admin = await tx.groupMembership.findUnique({ where: { groupId_userId: { groupId: request.groupId, userId: req.user.userId } } })
      if (!admin || admin.role !== 'ADMIN') throw httpError('Solo quien administra esta aventura puede responder', 403)
      if (request.status !== 'PENDING') throw httpError('Esta solicitud ya fue respondida', 409)
      const updated = await tx.groupJoinRequest.update({ where: { id: request.id }, data: { status: action, decidedAt: new Date(), decidedById: req.user.userId } })
      if (action === 'ACCEPTED') {
        await tx.groupMembership.upsert({ where: { groupId_userId: { groupId: request.groupId, userId: request.requesterId } }, update: {}, create: { groupId: request.groupId, userId: request.requesterId, role: 'MIEMBRO' } })
      }
      return { request: updated, group: { id: request.group.id, name: request.group.name } }
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

module.exports = { list: listMine, listMine, create, requestJoin, inbox, myRequests, decide, checkInHistory, getOne, updateGroup, leaveGroup, createHabit, updateHabit, deleteHabit, checkIn, updateCheckInNote, sendMessage }
