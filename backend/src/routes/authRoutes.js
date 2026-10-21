const { Router } = require('express')
const authController = require('../controllers/authController')
const { authenticateToken } = require('../middlewares/authMiddleware')

const router = Router()

router.post('/register', (req, res, next) => authController.register(req, res, next))
router.post('/login', (req, res, next) => authController.login(req, res, next))
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next))
router.post('/logout', (req, res, next) => authController.logout(req, res, next))
router.post('/logout-all', authenticateToken, (req, res, next) => authController.logoutAll(req, res, next))
router.get('/me', authenticateToken, (req, res) => authController.me(req, res))

module.exports = router
