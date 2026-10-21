const { Router } = require('express')
const controller = require('../controllers/groupController')
const { authenticateToken } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validate')
const { createGroupSchema, joinGroupSchema } = require('../validators/groupValidators')

const router = Router()
router.use(authenticateToken)

router.get('/', (req, res, next) => controller.listMine(req, res, next))
router.post('/', validate(createGroupSchema), (req, res, next) => controller.create(req, res, next))
router.post('/join', validate(joinGroupSchema), (req, res, next) => controller.join(req, res, next))
router.get('/:groupId', (req, res, next) => controller.getOne(req, res, next))

module.exports = router