const { randomBytes } = require('node:crypto')
const { prisma } = require('../prisma')

function httpError(message, status) { const error = new Error(message); error.status = status; return error }
function inviteCode() { return randomBytes(4).toString('hex').toUpperCase() }

async function list(req, res, next) {
  try {
    const groups = await prisma.group.findMany({
      where: { memberships: { some: { userId: req.user.userId } } },
      include: { memberships: { include: { user: { select: { id: true, name: true, email: true, characterId: true, themeId: true } } } } },
      orderBy: { createdAt: 'asc' },
    })
    return res.json({ groups })
  } catch (error) { return next(error) }
}

async function create(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    const category = typeof req.body.category === 'string' ? req.body.category.trim() : 'General'
    const color = typeof req.body.color === 'string' && /^#[0-9a-f]{6}$/i.test(req.body.color) ? req.body.color : '#8b5cf6'
    if (name.length < 3 || name.length > 50) return res.status(400).json({ error: 'El nombre debe tener entre 3 y 50 caracteres' })
    let code = inviteCode()
    for (let attempt = 0; attempt < 5 && await prisma.group.findUnique({ where: { inviteCode: code } }); attempt++) code = inviteCode()
    const group = await prisma.group.create({
      data: { name, category: category.slice(0, 40) || 'General', color, inviteCode: code, createdById: req.user.userId, memberships: { create: { userId: req.user.userId, role: 'ADMIN' } } },
      include: { memberships: { include: { user: { select: { id: true, name: true, email: true, characterId: true, themeId: true } } } } },
    })
    return res.status(201).json({ group })
  } catch (error) { return next(error) }
}

async function requestJoin(req, res, next) {
  try {
    const code = typeof req.body.inviteCode === 'string' ? req.body.inviteCode.trim().toUpperCase() : ''
    if (!code) return res.status(400).json({ error: 'Escribe el código de invitación' })
    const group = await prisma.group.findUnique({ where: { inviteCode: code }, select: { id: true, name: true } })
    if (!group) return res.status(404).json({ error: 'No encontramos una aventura con ese código' })
    const userId = req.user.userId
    if (await prisma.groupMembership.findUnique({ where: { groupId_userId: { groupId: group.id, userId } } })) {
      return res.status(409).json({ error: 'Ya perteneces a este grupo' })
    }
    const pending = await prisma.groupJoinRequest.findFirst({ where: { groupId: group.id, requesterId: userId, status: 'PENDING' } })
    if (pending) return res.status(200).json({ request: pending, group: { id: group.id, name: group.name }, alreadyPending: true })
    const request = await prisma.groupJoinRequest.create({ data: { groupId: group.id, requesterId: userId }, include: { group: { select: { id: true, name: true } } } })
    return res.status(201).json({ request, group: request.group })
  } catch (error) { return next(error) }
}

async function inbox(req, res, next) {
  try {
    const requests = await prisma.groupJoinRequest.findMany({
      where: { status: 'PENDING', group: { memberships: { some: { userId: req.user.userId, role: 'ADMIN' } } } },
      include: { group: { select: { id: true, name: true, inviteCode: true } }, requester: { select: { id: true, name: true, email: true, characterId: true, themeId: true } } },
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

module.exports = { list, create, requestJoin, inbox, myRequests, decide }
