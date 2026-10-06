import { defineStore } from 'pinia'

interface SessionState {
  accessToken: string | null
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    accessToken: null,
  }),
  actions: {
    setAccessToken(token: string): void {
      this.accessToken = token
    },
    clearSession(): void {
      this.accessToken = null
    },
  },
})
