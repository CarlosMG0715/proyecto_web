// Límites de los campos. El backend los verifica aunque se omita la validación del formulario.
const { z } = require('zod')
const name = z
  .string()
  .trim()
  .min(1, 'Escribe un nombre')
  .max(80, 'Máximo 80 caracteres')
const color = z.enum([
  '#ec4899',
  '#8b5cf6',
  '#22c55e',
  '#f5a524',
  '#38bdf8',
  '#f43f5e',
])
const esquemaCrearGrupo = z
  .object({ name, color: color.default('#8b5cf6') })
  .strict()
const esquemaActualizarGrupo = esquemaCrearGrupo
const esquemaUnirseGrupo = z
  .object({ code: z.string().trim().toUpperCase().min(4).max(40) })
  .strict()
const esquemaCrearHabito = z
  .object({
    name,
    description: z.string().trim().max(300).default(''),
    diasMeta: z.number().int().min(1).max(365).default(30),
  })
  .strict()
const esquemaRegistrarHabito = z.object({ completed: z.boolean() }).strict()
const esquemaMensaje = z
  .object({ content: z.string().trim().min(1).max(1000) })
  .strict()
module.exports = {
  esquemaCrearGrupo,
  esquemaActualizarGrupo,
  esquemaUnirseGrupo,
  esquemaCrearHabito,
  esquemaRegistrarHabito,
  esquemaMensaje,
}
