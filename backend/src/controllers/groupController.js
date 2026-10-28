// controlador de grupos: toma el usuario del middleware y delega las reglas al servicio.
const groupService = require('../services/groupService')

class GroupController {
  async create(req, res, next) {
    // la identidad sale del token, no de un campo que pueda enviar el navegador.
    try {
      const group = await groupService.create({ userId: req.user.userId, ...req.body })
      res.status(201).json({ group })
    } catch (e) { next(e) }
  }

  async listMine(req, res, next) {
    try {
      res.json({ groups: await groupService.listMine(req.user.userId) })
    } catch (e) { next(e) }
  }

  async checkInHistory(req, res, next) {
    try { res.json({ dates: await groupService.checkInHistory(req.user.userId) }) }
    catch (e) { next(e) }
  }

  async join(req, res, next) {
    try {
      const group = await groupService.join({ userId: req.user.userId, ...req.body })
      res.status(200).json({ group })
    } catch (e) { next(e) }
  }

  async getOne(req, res, next) {
    // el servicio confirma que la persona puede ver este grupo.
    try {
      const group = await groupService.getForMember({
        userId: req.user.userId, groupId: req.params.groupId,
      })
      res.json({ group })
    } catch (e) { next(e) }
  }

  async createHabit(req, res, next) {
    // devuelve 201 cuando el nuevo habito ya se guardo.
    try { res.status(201).json({ habit: await groupService.createHabit({ userId: req.user.userId, groupId: req.params.groupId, ...req.body }) }) }
    catch (e) { next(e) }
  }

  async updateHabit(req, res, next) {
    try { res.json({ habit: await groupService.updateHabit({ userId: req.user.userId, groupId: req.params.groupId, habitId: req.params.habitId, ...req.body }) }) }
    catch (e) { next(e) }
  }

  async checkIn(req, res, next) {
    // entrega el resultado de marcar o quitar el check de hoy.
    try { res.json(await groupService.checkIn({ userId: req.user.userId, groupId: req.params.groupId, habitId: req.params.habitId, ...req.body })) }
    catch (e) { next(e) }
  }

  async updateCheckInNote(req, res, next) {
    try { await groupService.updateCheckInNote({ userId: req.user.userId, groupId: req.params.groupId, habitId: req.params.habitId, ...req.body }); res.json({ ok: true }) }
    catch (e) { next(e) }
  }

  async sendMessage(req, res, next) {
    // guarda el texto y devuelve el mensaje para agregarlo a la interfaz.
    try { res.status(201).json({ message: await groupService.sendMessage({ userId: req.user.userId, groupId: req.params.groupId, ...req.body }) }) }
    catch (e) { next(e) }
  }
}

module.exports = new GroupController()
