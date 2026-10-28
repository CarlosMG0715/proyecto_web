// esquemas que describen los datos permitidos y sus limites antes de entrar al servicio.
const { z } = require('zod')

const validTimeZone = (value) => {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true }
  catch { return false }
}

const createGroupSchema = z.object({
  // zod limpia espacios, valida formatos y agrega valores por defecto.
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(60),
  category: z.string().trim().max(40).default('General'),
  description: z.string().trim().max(200).default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#8b5cf6'),
  timeZone: z.string().trim().refine(validTimeZone, 'La zona horaria no es válida').default('America/Bogota'),
  initialHabit: z.object({
    name: z.string().trim().min(1, 'El grupo debe tener al menos un hábito').max(80),
    icon: z.string().trim().min(1).max(12).default('🎯'),
  }),
})
const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(4).max(20).transform((s) => s.toUpperCase()),
})
const createHabitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().min(1).max(12).default('🎯'),
  description: z.string().trim().max(300).optional().default(''),
})
const updateHabitSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  icon: z.string().trim().min(1).max(12).optional(),
  description: z.string().trim().max(300).nullable().optional(),
}).refine((data) => Object.values(data).some((value) => value !== undefined), 'Debes enviar al menos un campo para actualizar')
const checkInSchema = z.object({ note: z.string().trim().max(500).optional().default('') })
const messageSchema = z.object({ content: z.string().trim().min(1).max(2000) })

module.exports = { createGroupSchema, joinGroupSchema, createHabitSchema, updateHabitSchema, checkInSchema, messageSchema }
