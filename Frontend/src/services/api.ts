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
    const isAuthCall = /^\/auth\/(login|register|refresh|logout|verify-email|resend-verification)$/.test(original.url ?? '')

    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        await refreshSession()
        return api(original)
      } catch (refreshError) {
        if (axios.isAxiosError(refreshError) &&
            (refreshError.response?.status === 401 || refreshError.response?.status === 403)) {
          useSessionStore().clearSession()
          onSessionExpired?.()
        }
        throw refreshError
      }
    }
    throw error
  },
)
