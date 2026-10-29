const { prisma } = require('../prisma')
const CHARACTER_IDS = new Set(['sprout', 'fox', 'music', 'pilot', 'royal', 'cap'])
const THEME_IDS = new Set(['sprout', 'fox', 'music', 'pilot', 'royal', 'cap', 'red', 'pink'])

async function getPreferences(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { characterId: true, themeId: true } })
    if (!user) return res.status(404).json({ error: 'Cuenta no encontrada' })
    return res.json(user)
  } catch (error) { return next(error) }
}

async function updatePreferences(req, res, next) {
  try {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).length === 0 || Object.keys(body).some(key => !['characterId', 'themeId'].includes(key))) {
      return res.status(400).json({ error: 'Envía el personaje o el tema que quieres guardar' })
    }
    const { characterId, themeId } = body
    if (('characterId' in body && !CHARACTER_IDS.has(characterId)) ||
        ('themeId' in body && !THEME_IDS.has(themeId))) {
      return res.status(400).json({ error: 'El personaje o el tema seleccionado no existe' })
    }
    const changes = {}
    if ('characterId' in body) changes.characterId = characterId
    if ('themeId' in body) changes.themeId = themeId
    const preferences = await prisma.user.update({
      where: { id: req.user.userId },
      data: changes,
      select: { characterId: true, themeId: true },
    })
    return res.json(preferences)
  } catch (error) { return next(error) }
}

module.exports = { getPreferences, updatePreferences }
