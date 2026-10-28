// router raiz: agrupa rutas por tema bajo el prefijo /api.
const { Router } = require('express')
const authRoutes = require('./authRoutes')

const router = Router()
const groupRoutes = require('./groupRoutes')
router.use('/groups', groupRoutes)

router.use('/auth', authRoutes)

module.exports = router
