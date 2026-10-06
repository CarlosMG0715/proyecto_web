import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useSessionStore } from '@/stores/session'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useSessionStore().accessToken

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
})
