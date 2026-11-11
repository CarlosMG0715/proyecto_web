const { Router } = require('express')
const authController = require('../controllers/authController')
const { authenticateToken } = require('../middlewares/authMiddleware')
const { validate } = require('../middlewares/validate')
const { registerSchema, loginSchema, logoutAllSchema, verifyEmailSchema, accountSchema } = require('../validators/authValidators')
const authService = require('../services/authService')

const { cookieName, cookieOptions } = require('../config')
const { z } = require('zod')
const { prisma } = require('../prisma')
const { notificationDefaults } = require('../services/dailyReminder')

const router = Router()
const notificationSchema = z.object({
  midnight: z.boolean(),
  email: z.boolean(),
  chat: z.boolean(),
  inactivity: z.boolean(),
  mutedGroups: z.array(z.string().min(1).max(64)).max(500).default([]),
})

router.get('/notifications', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.userId }, select: { notificationPreferences: true },
  })
  const saved = user.notificationPreferences ?? {}
  res.json(Object.fromEntries(Object.entries(notificationDefaults).map(([key, fallback]) => [key, saved[key] ?? fallback])))
})

router.put('/notifications', authenticateToken, validate(notificationSchema), async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.userId }, data: { notificationPreferences: req.body },
  })
  res.json(req.body)
})

router.delete('/account', authenticateToken, validate(z.object({
  password: z.string().min(1, 'Escribe tu contraseña.'),
})), async (req, res) => {
  await authService.deleteAccount(req.user.userId, req.body.password)
  const { maxAge, ...clearOptions } = cookieOptions
  res.clearCookie(cookieName, clearOptions)
  res.sendStatus(204)
})

router.patch('/account', authenticateToken, validate(accountSchema), async (req, res) => {
  res.json(await authService.updateAccount(req.user, req.body))
})

router.post('/register', validate(registerSchema), (req, res, next) => authController.register(req, res, next))
router.post('/login', validate(loginSchema), (req, res, next) => authController.login(req, res, next))
router.post('/verify-email', validate(verifyEmailSchema), (req, res, next) => authController.verifyEmail(req, res, next))
router.post('/resend-verification', validate(loginSchema), (req, res, next) => authController.resendVerification(req, res, next))
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next))
router.post('/logout', (req, res, next) => authController.logout(req, res, next))
router.post('/logout-all', authenticateToken, validate(logoutAllSchema), (req, res, next) => authController.logoutAll(req, res, next))
router.get( '/sessions', authenticateToken, (req, res, next) => authController.listSessions(req, res, next),)
router.get('/me', authenticateToken, (req, res) => authController.me(req, res))
router.delete('/sessions/:sessionId', authenticateToken, (req, res, next) => authController.revokeSession(req, res, next))

module.exports = router
