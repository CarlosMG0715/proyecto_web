const cors = require('cors')
const express = require('express')
const { allowedOrigins } = require('./config')
const { correlationId } = require('./middlewares/correlation')
const { notFound, errorHandler } = require('./middlewares/errorHandler')
const apiRoutes = require('./routes')

const app = express()

app.use(correlationId)
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'habitos-api',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api', apiRoutes)
app.use(notFound)
app.use(errorHandler)

module.exports = app
