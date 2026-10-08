const { Router } = require('express')
const authRoutes = require('./authRoutes')

const router = Router()

// Montar submódulos de la API
router.use('/auth', authRoutes)

module.exports = router
