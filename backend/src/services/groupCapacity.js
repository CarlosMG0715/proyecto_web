const GROUP_MEMBER_LIMIT = 20

// La transaccion que aprueba la solicitud ya tiene bloqueada la fila del grupo.
async function addGroupMember(tx, groupId, userId) {
  const existing = await tx.groupMembership.findUnique({ where: { groupId_userId: { groupId, userId } } })
  if (existing) return

  const count = await tx.groupMembership.count({ where: { groupId } })
  if (count >= GROUP_MEMBER_LIMIT) {
    throw Object.assign(new Error(`Este grupo ya tiene sus ${GROUP_MEMBER_LIMIT} cupos ocupados`), { status: 409 })
  }
  await tx.groupMembership.create({ data: { groupId, userId, role: 'MIEMBRO' } })
}

module.exports = { GROUP_MEMBER_LIMIT, addGroupMember }
