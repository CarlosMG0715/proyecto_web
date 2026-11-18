import axios, { type InternalAxiosRequestConfig } from 'axios'
import { usarAlmacenSesion } from '@/stores/sesion'
import type { RespuestaAcceso } from '@/types/acceso'

let onSessionExpired: (() => void) | null = null
export const alExpirarSesion = (fn: () => void): void => {
  onSessionExpired = fn
}

const urlBaseApi = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

export const api = axios.create({ baseURL: urlBaseApi, withCredentials: true })
// cliente sin interceptores: evita que el refresh se llame a si mismo en bucle.
const bare = axios.create({ baseURL: urlBaseApi, withCredentials: true })

let refreshPromise: Promise<RespuestaAcceso> | null = null

// Una sola llamada de refresh a la vez (evita el falso positivo de reutilización)
export function renovarSesion(): Promise<RespuestaAcceso> {
  refreshPromise ??= bare
    .post<RespuestaAcceso>('/auth/refresh')
    .then((res) => {
      usarAlmacenSesion().guardarSesion(res.data.tokenAcceso, res.data.user)
      return res.data
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

api.interceptors.request.use((config) => {
  const { tokenAcceso } = usarAlmacenSesion()
  if (tokenAcceso) config.headers.Authorization = `Bearer ${tokenAcceso}`
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    // ante un 401 intenta renovar una vez; si falla, limpia la sesion y avisa a la app.
    if (!axios.isAxiosError(error) || !error.config) throw error
    const original = error.config as RetriableConfig
    const isAuthCall = /^\/auth\/(login|register|refresh|logout)$/.test(
      original.url ?? '',
    )

    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        await renovarSesion()
        return api(original)
      } catch (refreshError) {
        if (
          axios.isAxiosError(refreshError) &&
          (refreshError.response?.status === 401 ||
            refreshError.response?.status === 403)
        ) {
          usarAlmacenSesion().limpiarSesion()
          onSessionExpired?.()
        }
        throw refreshError
      }
    }
    throw error
  },
)
