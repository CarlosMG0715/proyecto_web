const { randomUUID } = require('node:crypto')

function correlationId(req, res, next) {
  const suppliedId = req.get('x-correlation-id')
  const id =
    suppliedId && /^[a-zA-Z0-9._-]{1,128}$/.test(suppliedId) ? suppliedId : randomUUID()

  req.correlationId = id
  res.setHeader('x-correlation-id', id)
  next()
}

module.exports = { correlationId }
