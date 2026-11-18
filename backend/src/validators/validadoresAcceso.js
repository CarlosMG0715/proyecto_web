const { z } = require('zod')

const email = z
  .string('Escribe un correo válido')
  .trim()
  .email('Escribe un correo válido')
  .max(254, 'El correo es demasiado largo')

const password = z
  .string('Escribe tu contraseña')
  .min(1, 'Escribe tu contraseña')
  .max(1024, 'La contraseña es demasiado larga')

const esquemaRegistro = z.object({
  name: z
    .string('Escribe tu nombre')
    .trim()
    .min(1, 'Escribe tu nombre')
    .max(80),
  email,
  password: password
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= 72,
      'La contraseña supera el tamaño admitido de 72 bytes',
    ),
})

const esquemaInicioSesion = z.object({ email, password })

const accountSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('name'), name: esquemaRegistro.shape.name }),
  z.object({
    action: z.literal('password'),
    password,
    nuevaContrasena: esquemaRegistro.shape.password,
  }),
])

module.exports = { esquemaRegistro, esquemaInicioSesion, accountSchema }
