const { cookieName } = require('../config')

function readCookie(req, name) {
  if (req.cookies && req.cookies[name]) {
    return req.cookies[name]
  }

  const rawCookie = req.headers.cookie
  if (!rawCookie) return null

  const match = rawCookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

function extractRefreshToken(req) {
  return readCookie(req, cookieName)
}

module.exports = { readCookie, extractRefreshToken }
