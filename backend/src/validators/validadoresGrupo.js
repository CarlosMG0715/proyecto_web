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
const descripcion = z.string().trim().max(300).default('')
const insignia = z.enum(['target', 'flame', 'globe', 'heart', 'activity', 'moon', 'code', 'monitor', 'shield', 'trophy', 'flag', 'message']).default('target')
const primerHabito = z.object({ name, description: descripcion, insignia }).strict()
const esquemaCrearGrupo = z
  .object({ name, color: color.default('#8b5cf6'), descripcion, primerHabito })
  .strict()
const esquemaActualizarGrupo = z.object({ name, color, descripcion: descripcion.optional() }).strict()
const esquemaUnirseGrupo = z
  .object({ code: z.string().trim().toUpperCase().min(4).max(40) })
  .strict()
const esquemaCrearHabito = z
  .object({
    name,
    description: z.string().trim().max(300).default(''),
    insignia,
    diasMeta: z.number().int().min(1).max(365).default(30),
  })
  .strict()
const esquemaRegistrarHabito = z.object({ completed: z.boolean() }).strict()
const esquemaMensaje = z
  .object({ content: z.string().trim().min(1).max(1000) })
  .strict()
const esquemaCheckGrupal = z.object({
  idHabitos: z.array(z.string().min(1)).min(1).max(100),
  mensaje: z.string().trim().max(300).default(''),
}).strict()
module.exports = {
  esquemaCheckGrupal,
  esquemaCrearGrupo,
  esquemaActualizarGrupo,
  esquemaUnirseGrupo,
  esquemaCrearHabito,
  esquemaRegistrarHabito,
  esquemaMensaje,
}
