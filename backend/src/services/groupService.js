const crypto = require('crypto')
const groupRepository = require('../repositories/groupRepository')

const httpError = (message, status) => Object.assign(new Error(message), { status })
const newInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase()

class GroupService {
  async create({ userId, name, timeZone }) {
    // Reintenta si el código de invitación choca (muy improbable)
    for (let i = 0; i < 3; i++) {
      try {
        return await groupRepository.createWithAdmin({
          name, timeZone, userId, inviteCode: newInviteCode(),
        })
      } catch (err) {
        if (err.code !== 'P2002') throw err
      }
    }
    throw httpError('No se pudo generar el código de invitación', 500)
  }

  listMine(userId) {
    return groupRepository.listByUser(userId)
  }

  async join({ userId, inviteCode }) {
    const group = await groupRepository.findByInviteCode(inviteCode)
    if (!group) throw httpError('Código de invitación inválido', 404)

    const existing = await groupRepository.findMembership(group.id, userId)
    if (existing) throw httpError('Ya perteneces a este grupo', 409)

    await groupRepository.addMember(group.id, userId)
    return group
  }

  // Ownership: solo los miembros ven el grupo
  async getForMember({ userId, groupId }) {
    const membership = await groupRepository.findMembership(groupId, userId)
    if (!membership) throw httpError('No tienes acceso a este grupo', 403)
    const group = await groupRepository.findByIdWithMembers(groupId)
    return { ...group, myRole: membership.role }
  }
}

module.exports = new GroupService()