const groupService = require('../services/groupService')

class GroupController {
  async create(req, res, next) {
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

  async join(req, res, next) {
    try {
      const group = await groupService.join({ userId: req.user.userId, ...req.body })
      res.status(200).json({ group })
    } catch (e) { next(e) }
  }

  async getOne(req, res, next) {
    try {
      const group = await groupService.getForMember({
        userId: req.user.userId, groupId: req.params.groupId,
      })
      res.json({ group })
    } catch (e) { next(e) }
  }
}

module.exports = new GroupController()