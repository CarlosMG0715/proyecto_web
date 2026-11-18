import { defineStore } from 'pinia'
import type { User } from '@/types/acceso'

export interface EstadoSesion {
  tokenAcceso: string | null
  user: User | null
  estaCargando: boolean
  error: string | null
  initialized: boolean
}

export const usarAlmacenSesion = defineStore('session', {
  state: (): EstadoSesion => ({
    tokenAcceso: null,
    user: null,
    estaCargando: false,
    error: null,
    initialized: false,
  }),

  getters: {
    estaAutenticado: (state): boolean =>
      Boolean(state.tokenAcceso && state.user),
    usuarioActual: (state): User | null => state.user,
  },

  actions: {
    guardarSesion(token: string, user: User): void {
      this.tokenAcceso = token
      this.user = user
      this.error = null
    },
    guardarUsuario(user: User): void {
      this.user = user
    },
    setLoading(loading: boolean): void {
      this.estaCargando = loading
    },
    setError(mensajeError: string | null): void {
      this.error = mensajeError
    },
    setInitialized(value: boolean): void {
      this.initialized = value
    },
    limpiarSesion(): void {
      this.tokenAcceso = null
      this.user = null
      this.error = null
    },
  },
})
