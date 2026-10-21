const { z } = require('zod')

const createGroupSchema = z.object({
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(60),
  timeZone: z.string().trim().default('America/Bogota'),
})

const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(4).max(20).transform((s) => s.toUpperCase()),
})

module.exports = { createGroupSchema, joinGroupSchema }