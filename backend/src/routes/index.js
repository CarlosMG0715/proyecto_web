const { Router } = require('express')
const authRoutes = require('./authRoutes')
const groupRoutes = require('./groupRoutes')

const router = Router()

router.use('/auth', authRoutes)
router.use('/', groupRoutes)

module.exports = router
