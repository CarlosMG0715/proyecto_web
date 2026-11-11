const rooms = new Map()

function setTyping(groupId, userId, active) {
  let room = rooms.get(groupId)
  clearTimeout(room?.get(userId))
  if (!active) {
    room?.delete(userId)
    if (!room?.size) rooms.delete(groupId)
    return
  }
  if (!room) {
    room = new Map()
    rooms.set(groupId, room)
  }
  const expiry = setTimeout(() => setTyping(groupId, userId, false), 6000)
  expiry.unref()
  room.set(userId, expiry)
}

function listTyping(groupId, userId) {
  return [...(rooms.get(groupId)?.keys() ?? [])].filter(id => id !== userId)
}

module.exports = { setTyping, listTyping }
