// fabrica middleware para validar el cuerpo de una peticion con un esquema zod.
const validate = (schema) => (req, _res, next) => {
  // safeparse no lanza excepcion; devuelve el resultado valido o los problemas encontrados.
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const error = new Error(result.error.issues.map((i) => i.message).join('. '))
    error.status = 400
    return next(error)
  }
  req.body = result.data
  next()
}

module.exports = { validate }
