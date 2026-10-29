// cliente http comun; centraliza token, cookies y renovacion para no repetirlo en cada servicio.
import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useSessionStore } from '@/stores/session'
import type { AuthResponse } from '@/types/auth'

let onSessionExpired: (() => void) | null = null
export const setSessionExpiredHandler = (fn: () => void): void => {
  onSessionExpired = fn
}

const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

export const api = axios.create({ baseURL: apiBaseUrl, withCredentials: true })
// cliente sin interceptores: evita que el refresh se llame a si mismo en bucle.
const bare = axios.create({ baseURL: apiBaseUrl, withCredentials: true })

let refreshPromise: Promise<AuthResponse> | null = null

// Una sola llamada de refresh a la vez (evita el falso positivo de reutilización)
export function refreshSession(): Promise<AuthResponse> {
  // varias peticiones que vencen a la vez comparten una sola renovacion.
  refreshPromise ??= bare
    .post<AuthResponse>('/auth/refresh')
    .then((res) => {
      useSessionStore().setSession(res.data.accessToken, res.data.user)
      return res.data
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

api.interceptors.request.use((config) => {
  // agrega el token de acceso que pinia guarda en memoria.
  const { accessToken } = useSessionStore()
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    // ante un 401 intenta renovar una vez; si falla, limpia la sesion y avisa a la app.
    if (!axios.isAxiosError(error) || !error.config) throw error
    const original = error.config as RetriableConfig
    const isAuthCall = original.url?.startsWith('/auth/')

    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        await refreshSession()
        return api(original)
      } catch {
        useSessionStore().clearSession()
        onSessionExpired?.()
      }
    }
    throw error
  },
)
