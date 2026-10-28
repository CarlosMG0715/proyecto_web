// urls de grupo; primero se valida token y despues el cuerpo de cada peticion.
const { Router } = require('express')
const controller = require('../controllers/groupController')
const { authenticateToken } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validate')
const { createGroupSchema, joinGroupSchema, createHabitSchema, checkInSchema, messageSchema } = require('../validators/groupValidators')

const router = Router()
router.use(authenticateToken) // desde aqui todas las acciones requieren una cuenta activa.

router.get('/', (req, res, next) => controller.listMine(req, res, next))
router.post('/', validate(createGroupSchema), (req, res, next) => controller.create(req, res, next))
router.post('/join', validate(joinGroupSchema), (req, res, next) => controller.join(req, res, next))
router.get('/history', (req, res, next) => controller.checkInHistory(req, res, next))
router.get('/:groupId', (req, res, next) => controller.getOne(req, res, next))
router.post('/:groupId/habits', validate(createHabitSchema), (req, res, next) => controller.createHabit(req, res, next))
router.put('/:groupId/habits/:habitId/check-in', validate(checkInSchema), (req, res, next) => controller.checkIn(req, res, next))
router.put('/:groupId/habits/:habitId/check-in/note', validate(checkInSchema), (req, res, next) => controller.updateCheckInNote(req, res, next))
router.post('/:groupId/messages', validate(messageSchema), (req, res, next) => controller.sendMessage(req, res, next))

module.exports = router
