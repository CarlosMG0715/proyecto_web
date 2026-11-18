import { isAxiosError } from 'axios'
export function mensajeError(error: unknown): string {
  return isAxiosError<{ error?: string }>(error)
    ? (error.response?.data.error ?? 'No pudimos conectar con el servidor.')
    : 'No se pudo completar la acción.'
}
