const { Router } = require('express')
const { authenticateToken } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validate')
const profile = require('../controllers/profileController')
const groups = require('../controllers/groupController')
const streakPokes = require('../services/streakPokes')
const groupService = require('../services/groupService')
const { setTyping, listTyping } = require('../services/chatTyping')
const { z } = require('zod')
const { createGroupSchema, updateGroupSchema, createHabitSchema, updateHabitSchema, checkInSchema, messageSchema } = require('../validators/groupValidators')

const router = Router()
router.use(authenticateToken)

router.get('/profile/preferences', profile.getPreferences)
router.put('/profile/preferences', profile.updatePreferences)
router.patch('/profile/preferences', profile.updatePreferences)

router.get('/groups', groups.listMine)
router.post('/groups', validate(createGroupSchema), groups.create)
router.post('/groups/join-requests', groups.requestJoin)
router.post('/groups/join', groups.requestJoin)
router.get('/groups/join-requests/inbox', groups.inbox)
router.get('/groups/join-requests/mine', groups.myRequests)
router.patch('/groups/join-requests/:requestId', groups.decide)
router.get('/groups/history', groups.checkInHistory)
router.get('/streak-pokes', async (req, res) => {
  res.json(await streakPokes.list(req.user.userId))
})
router.get('/groups/:groupId', groups.getOne)
router.get('/groups/:groupId/typing', async (req, res) => {
  await groupService.assertStanding(req.params.groupId, req.user.userId)
  res.set('Cache-Control', 'no-store').json({ userIds: listTyping(req.params.groupId, req.user.userId) })
})
router.put('/groups/:groupId/typing', validate(z.object({ active: z.boolean() })), async (req, res) => {
  await groupService.assertStanding(req.params.groupId, req.user.userId)
  setTyping(req.params.groupId, req.user.userId, req.body.active)
  res.sendStatus(204)
})
router.delete('/groups/:groupId/membership', async (req, res, next) => {
  await groupService.assertStanding(req.params.groupId, req.user.userId)
  return groups.leaveGroup(req, res, next)
})
router.patch('/groups/:groupId/members/:memberId', async (req, res, next) => {
  await groupService.assertActive(req.params.groupId)
  return groups.setMemberRole(req, res, next)
})
router.use('/groups/:groupId', async (req, _res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    await groupService.assertActive(req.params.groupId)
    await groupService.assertStanding(req.params.groupId, req.user.userId)
  }
  next()
})
router.post('/groups/:groupId/members/:memberId/revive', async (req, res) => {
  const group = await groupService.reviveMember({ ...req.params, userId: req.user.userId })
  res.json({ group })
})
router.patch('/groups/:groupId', validate(updateGroupSchema), groups.updateGroup)
router.delete('/groups/:groupId/members/:memberId', groups.removeGroupMember)
router.post('/groups/:groupId/habits', validate(createHabitSchema), groups.createHabit)
router.put('/groups/:groupId/daily-check', groups.dailyCheck)
router.put('/groups/:groupId/habits/:habitId/participation', groups.joinHabit)
router.patch('/groups/:groupId/habits/:habitId', validate(updateHabitSchema), groups.updateHabit)
router.delete('/groups/:groupId/habits/:habitId', groups.deleteHabit)
router.put('/groups/:groupId/habits/:habitId/check-in', validate(checkInSchema), groups.checkIn)
router.put('/groups/:groupId/habits/:habitId/check-in/note', validate(checkInSchema), groups.updateCheckInNote)
router.post('/groups/:groupId/members/:memberId/streak-poke', async (req, res) => {
  await streakPokes.send(req.params.groupId, req.user.userId, req.params.memberId)
  res.sendStatus(204)
})
router.post('/groups/:groupId/messages', validate(messageSchema), groups.sendMessage)

module.exports = router
