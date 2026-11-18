export interface User {
  id: string
  name: string
  email: string
  idPersonaje: string
  idTema: string
}
export interface RespuestaAcceso {
  tokenAcceso: string
  user: User
}
export interface CredencialesAcceso {
  email: string
  password: string
}
export interface DatosRegistro extends CredencialesAcceso {
  name: string
}
export interface RespuestaErrorApi {
  error: string
  idCorrelacion?: string
}
