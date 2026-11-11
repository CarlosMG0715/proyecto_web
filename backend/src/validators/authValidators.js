const { z } = require('zod')

const email = z.string('Escribe un correo válido')
  .trim()
  .email('Escribe un correo válido')
  .max(254, 'El correo es demasiado largo')

const password = z.string('Escribe tu contraseña')
  .min(1, 'Escribe tu contraseña')
  .max(1024, 'La contraseña es demasiado larga')

const registerSchema = z.object({
  name: z.string('Escribe tu nombre').trim().min(1, 'Escribe tu nombre').max(80),
  email,
  password: password.min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72,
      'La contraseña supera el tamaño admitido de 72 bytes'),
})

const loginSchema = z.object({ email, password })
const logoutAllSchema = z.object({ password })
const verifyEmailSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'El enlace de verificación no es válido'),
})

const accountSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('name'), name: registerSchema.shape.name }),
  z.object({ action: z.literal('password'), password, newPassword: registerSchema.shape.password }),
])

module.exports = { registerSchema, loginSchema, logoutAllSchema, verifyEmailSchema, accountSchema }
