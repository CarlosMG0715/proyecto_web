// funciones para leer cookies aunque express no tenga parser de cookies instalado.
const { nombreCookie } = require('../configuracion')

function leerCookie(req, name) {
  // primero intenta la cookie ya analizada; luego revisa el header crudo.
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

function extraerTokenRenovacion(req) {
  return leerCookie(req, nombreCookie)
}

module.exports = { leerCookie, extraerTokenRenovacion }
