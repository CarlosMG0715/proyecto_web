import { defineStore } from 'pinia'
import { DEMO_ACTIVITY, DEMO_CHECKIN_HISTORY, DEMO_GROUPS, toDateKey } from '@/mocks/demoGroups'
import type { ActivityItem, CreateGroupPayload, Group, GroupMember } from '@/types/group'

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
const GROUP_COLORS = ['#8b5cf6', '#22c55e', '#f5a524', '#38bdf8', '#f43f5e']

function todayCompletion(group: Group): number {
  if (group.members.length === 0) return 0
  const done = group.members.filter((m) => m.checkedInToday).length
  return Math.round((done / group.members.length) * 100)
}

function generateInviteCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'GRP'
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`
}

export const useGroupsStore = defineStore('groups', {
  state: (): GroupsState => ({
    groups: structuredClone(DEMO_GROUPS),
    activity: structuredClone(DEMO_ACTIVITY),
    checkInHistory: [...DEMO_CHECKIN_HISTORY],
    isLoading: false,
    error: null,
  }),

  getters: {
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
    /**
     * Marca / desmarca el check-in del usuario actual en un grupo.
     * (Con backend: POST /api/habits/:id/check-in dentro de una transacción ACID)
     */
    toggleMyCheckIn(groupId: string): void {
      const group = this.groups.find((g) => g.id === groupId)
      const me = group?.members.find((m) => m.isCurrentUser)
      if (!group || !me) return

      const todayKey = toDateKey(new Date())
      me.checkedInToday = !me.checkedInToday

      if (me.checkedInToday) {
        me.streak += 1
        me.daysCompleted += 1
        group.health = Math.min(100, group.health + 4)
        if (!this.checkInHistory.includes(todayKey)) this.checkInHistory.push(todayKey)
        this.activity.unshift({
          id: `act-${Date.now()}`,
          kind: 'check-in',
          groupId,
          text: `Tú completaste «${me.habit}»`,
          at: new Date().toISOString(),
        })
      } else {
        me.streak = Math.max(0, me.streak - 1)
        me.daysCompleted = Math.max(0, me.daysCompleted - 1)
        group.health = Math.max(0, group.health - 4)
        const stillDoneSomewhere = this.groups.some((g) =>
          g.members.some((m) => m.isCurrentUser && m.checkedInToday),
        )
        if (!stillDoneSomewhere) {
          this.checkInHistory = this.checkInHistory.filter((k) => k !== todayKey)
        }
      }
    },

    sendMessage(groupId: string, text: string): void {
      const group = this.groups.find((g) => g.id === groupId)
      const me = group?.members.find((m) => m.isCurrentUser)
      const clean = text.trim()
      if (!group || !me || !clean) return
      group.messages.push({
        id: `msg-${Date.now()}`,
        kind: 'user',
        authorId: me.id,
        text: clean,
        sentAt: new Date().toISOString(),
      })
    },

    /** Crea un grupo local (con backend: POST /api/groups) y devuelve su id */
    createGroup(payload: CreateGroupPayload, ownerName: string): string {
      const id = `grp-${Date.now()}`
      const name = payload.name.trim()
      this.groups.push({
        id,
        name,
        description: '',
        category: payload.category.trim() || 'General',
        inviteCode: generateInviteCode(name),
        color: GROUP_COLORS[this.groups.length % GROUP_COLORS.length] ?? '#8b5cf6',
        streak: 0,
        health: 100,
        completionHistory: [],
        members: [
          {
            id: 'me',
            name: ownerName,
            avatarUrl: null,
            role: 'ADMIN',
            habit: 'Define tu hábito',
            daysCompleted: 0,
            daysTotal: 0,
            streak: 0,
            checkedInToday: false,
            isCurrentUser: true,
            isOnline: true,
          },
        ],
        messages: [
          {
            id: `msg-${Date.now()}`,
            kind: 'system',
            authorId: null,
            text: `Creaste el grupo «${name}». Comparte el código de invitación para sumar gente.`,
            sentAt: new Date().toISOString(),
          },
        ],
      })
      this.activity.unshift({
        id: `act-${Date.now()}`,
        kind: 'join',
        groupId: id,
        text: `Creaste el grupo ${name}`,
        at: new Date().toISOString(),
      })
      return id
    },
  },
})
