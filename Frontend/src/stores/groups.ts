// store que comparte los grupos entre el menu, el inicio, el calendario y el detalle.
import axios from 'axios'
import { defineStore } from 'pinia'
import { toDateKey } from '@/mocks/demoGroups'
import { createGroupRequest, createHabitRequest, fetchCheckInHistory, fetchGroup as fetchGroupRequest, fetchMyGroups, joinGroupRequest, saveCheckInNoteRequest, sendGroupMessageRequest, toggleCheckInRequest, updateHabitRequest } from '@/services/groupsService'
import type { ActivityItem, CreateGroupPayload, Group, GroupHabit, GroupMember } from '@/types/group'

export interface DayProgress {
  key: string
  label: string
  value: number
  isToday: boolean
}

export interface GroupsState {
  groups: Group[]
  activity: ActivityItem[]
  /** Días (YYYY-MM-DD) en los que el usuario actual hizo al menos un check-in */
  checkInHistory: string[]
  isLoading: boolean
  error: string | null
}

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function todayCompletion(group: Group): number {
  // calcula el porcentaje de miembros que tienen todos sus habitos de hoy completos.
  if (group.members.length === 0) return 0
  const done = group.members.filter((m) => m.checkedInToday).length
  return Math.round((done / group.members.length) * 100)
}

function extractError(err: unknown, fallback: string): string {
  // convierte errores de axios en un mensaje corto que la interfaz puede mostrar.
  if (axios.isAxiosError<{ error?: string; message?: string }>(err)) {
    return err.response?.data?.error ?? err.response?.data?.message ?? fallback
  }
  return fallback
}

export const useGroupsStore = defineStore('groups', {
  state: (): GroupsState => ({
    groups: [],
    activity: [],
    checkInHistory: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    // getters son valores derivados; pinia los recalcula cuando cambia el store.
    groupById:
      (state) =>
      (id: string): Group | undefined =>
        state.groups.find((g) => g.id === id),

    /** Miembro que representa al usuario con sesión, dentro de cada grupo */
    myMembership:
      () =>
      (group: Group): GroupMember | undefined =>
        group.members.find((m) => m.isCurrentUser),

    bestStreak(state): number {
      return state.groups.reduce((max, g) => {
        const me = g.members.find((m) => m.isCurrentUser)
        return Math.max(max, me?.streak ?? 0)
      }, 0)
    },

    pendingToday(state): number {
      return state.groups.filter((g) => g.members.some((m) => m.isCurrentUser && !m.checkedInToday)).length
    },

    doneToday(state): number {
      return state.groups.filter((g) => g.members.some((m) => m.isCurrentUser && m.checkedInToday)).length
    },

    /** % de días con check-in en los últimos 30 días */
    completionRate30(state): number {
      const set = new Set(state.checkInHistory)
      let count = 0
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        if (set.has(toDateKey(d))) count++
      }
      return Math.round((count / 30) * 100)
    },

    /** Promedio de cumplimiento de todos tus grupos en los últimos 7 días (incluye hoy en vivo) */
    weekProgress(state): DayProgress[] {
      const days: DayProgress[] = []
      for (let offset = 6; offset >= 0; offset--) {
        const d = new Date()
        d.setDate(d.getDate() - offset)
        const values = state.groups.map((g) => {
          if (offset === 0) return todayCompletion(g)
          const idx = g.completionHistory.length - offset
          return idx >= 0 ? (g.completionHistory[idx] ?? 0) : 0
        })
        const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
        days.push({
          key: toDateKey(d),
          label: offset === 0 ? 'Hoy' : (WEEKDAY_LABELS[d.getDay()] ?? ''),
          value: avg,
          isToday: offset === 0,
        })
      }
      return days
    },
  },

  actions: {
    // acciones async consultan la api y despues reemplazan el estado con datos persistidos.
    async fetchGroups(): Promise<void> {
      this.isLoading = true
      this.error = null
      try {
        this.groups = await fetchMyGroups()
        this.checkInHistory = await fetchCheckInHistory()
      } catch (err) {
        this.error = extractError(err, 'No se pudieron cargar los grupos')
      } finally {
        this.isLoading = false
      }
    },

    async fetchGroup(groupId: string): Promise<void> {
      // refresca un solo grupo y lo agrega o reemplaza en la lista actual.
      this.isLoading = true
      this.error = null
      try {
        const group = await fetchGroupRequest(groupId)
        const index = this.groups.findIndex((item) => item.id === groupId)
        if (index < 0) this.groups.push(group)
        else this.groups[index] = group
      } catch (err) {
        this.error = extractError(err, 'No se pudo cargar el grupo')
        throw err
      } finally { this.isLoading = false }
    },

    async createGroup(payload: CreateGroupPayload): Promise<string> {
      // devuelve el id real creado por el servidor, no uno inventado en el navegador.
      this.error = null
      try {
        const group = await createGroupRequest(payload)
        this.groups.push(group)
        return group.id
      } catch (err) {
        this.error = extractError(err, 'No se pudo crear el grupo')
        throw err
      }
    },

    async joinGroup(inviteCode: string): Promise<string> {
      // une al usuario y agrega a la lista el grupo devuelto por la api.
      this.error = null
      try {
        const group = await joinGroupRequest(inviteCode)
        this.groups.push(group)
        return group.id
      } catch (err) {
        this.error = extractError(err, 'No se pudo unir al grupo')
        throw err
      }
    },

    async createHabit(groupId: string, name: string, icon: string): Promise<GroupHabit> {
      // crea el habito y vuelve a cargar el grupo para ver los miembros y checks actualizados.
      const habit = await createHabitRequest(groupId, name, icon)
      await this.fetchGroup(groupId)
      return habit
    },

    async updateHabit(groupId: string, habitId: string, name: string, icon: string): Promise<GroupHabit> {
      const habit = await updateHabitRequest(groupId, habitId, { name, icon })
      await this.fetchGroup(groupId)
      return habit
    },

    async toggleCheckIn(groupId: string, habitId: string, note: string): Promise<void> {
      // actualiza el check-in y tambien el historial usado por el calendario.
      await toggleCheckInRequest(groupId, habitId, note)
      await this.fetchGroup(groupId)
      this.checkInHistory = await fetchCheckInHistory()
    },

    async saveCheckInNote(groupId: string, habitId: string, note: string): Promise<void> {
      // guarda la nota y refresca el detalle para mostrar el valor confirmado por la api.
      await saveCheckInNoteRequest(groupId, habitId, note)
      await this.fetchGroup(groupId)
    },

    async sendMessage(groupId: string, text: string): Promise<void> {
      // agrega al chat solo el mensaje que el servidor confirmo como guardado.
      const message = await sendGroupMessageRequest(groupId, text.trim())
      const group = this.groups.find((g) => g.id === groupId)
      if (group) group.messages.push(message)
    },
  },
})
