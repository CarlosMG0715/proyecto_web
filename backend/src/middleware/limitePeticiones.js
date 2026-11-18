// Límite sencillo en memoria para frenar intentos masivos de login/registro.
const attempts = new Map()
const windowMs = 15 * 60 * 1000
setInterval(() => {
  for (const [key, value] of attempts)
    if (value.until < Date.now()) attempts.delete(key)
}, windowMs).unref()
function limitarPeticionesAcceso(req, res, next) {
  const key = req.ip
  let entry = attempts.get(key)
  if (!entry || entry.until < Date.now()) {
    entry = { count: 0, until: Date.now() + windowMs }
    attempts.set(key, entry)
  }
  if (++entry.count > 30)
    return res
      .status(429)
      .json({ error: 'Demasiados intentos. Espera unos minutos.' })
  next()
}
module.exports = { limitarPeticionesAcceso }
