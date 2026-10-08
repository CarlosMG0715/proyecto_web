import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useSessionStore } from '@/stores/session'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Interceptor de peticiones: inyecta el Access Token en memoria
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useSessionStore().accessToken

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
})

// Bandera para evitar bucles infinitos de reintento
let isRefreshing = false

// Interceptor de respuestas: reintento automático si el token expiró (401)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Si es error 401 y no hemos reintentado ya esta petición ni es login/refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return Promise.reject(error)
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Solicitar nuevo Access Token usando la Cookie segura con el Refresh Token
        const refreshResponse = await axios.post<{ accessToken: string }>(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        )

        const newToken = refreshResponse.data.accessToken
        useSessionStore().setAccessToken(newToken)

        originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
        return api(originalRequest)
      } catch (refreshError) {
        useSessionStore().clearSession()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)
