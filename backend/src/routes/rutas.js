const { Router } = require('express')
const authRoutes = require('./rutasAcceso')
const groupRoutes = require('./rutasGrupo')

const router = Router()
router.use('/auth', authRoutes)
router.use('/', groupRoutes)

module.exports = router
