import { defineStore } from 'pinia'
import type { User } from '@/types/auth'

export interface SessionState {
  accessToken: string | null
  user: User | null
  isLoading: boolean
  error: string | null
  initialized: boolean
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    accessToken: null,
    user: null,
    isLoading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.accessToken && state.user),
    currentUser: (state): User | null => state.user,
  },

  actions: {
    setSession(token: string, user: User): void {
      this.accessToken = token
      this.user = user
      this.error = null
    },
    setAccessToken(token: string): void {
      this.accessToken = token
    },
    setUser(user: User): void {
      this.user = user
    },
    setLoading(loading: boolean): void {
      this.isLoading = loading
    },
    setError(errorMessage: string | null): void {
      this.error = errorMessage
    },
    setInitialized(value: boolean): void {
      this.initialized = value
    },
    clearSession(): void {
      this.accessToken = null
      this.user = null
      this.error = null
    },
  },
})