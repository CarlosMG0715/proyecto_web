import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DEMO_GROUPS, toDateKey } from '@/mocks/demoGroups'
import { useCharacterStore } from './characters'
import { useSessionStore } from './session'
import type { ActivityItem, CreateGroupPayload, Group, GroupMember } from '@/types/group'

export interface DayProgress {
  key: string
  label: string
  value: number
  isToday: boolean
}

interface UserProgressData {
  checkInHistory: string[]
  activity: ActivityItem[]
}

const CATALOG_KEY = 'kordia:groups-catalog-v2'
const USER_DATA_KEY = 'kordia:user-progress-v2'
const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const GROUP_COLORS = ['#8b5cf6', '#22c55e', '#f5a524', '#38bdf8', '#f43f5e', '#ec4899']

function todayCompletion(group: Group): number {
  if (group.members.length === 0) return 0
  const done = group.members.filter((m) => m.checkedInToday).length
  return Math.round((done / group.members.length) * 100)
}

function normalizePrefix(name: string): string {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
  return (clean.slice(0, 4) || 'KORD').padEnd(4, 'X')
}

function randomSuffix(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let out = ''
  for (let i = 0; i < 4; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return out
}

function loadCatalog(): Group[] {
  try {
    const raw = localStorage.getItem(CATALOG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    /* fallback */
  }
  return structuredClone(DEMO_GROUPS)
}

function loadUserProgressMap(): Record<string, UserProgressData> {
  try {
    const raw = localStorage.getItem(USER_DATA_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch {
    /* fallback */
  }
  return {}
}

export const useGroupsStore = defineStore('groups', () => {
  const session = useSessionStore()
  const characters = useCharacterStore()

  const allGroups = ref<Group[]>(loadCatalog())
  const userProgressMap = ref<Record<string, UserProgressData>>(loadUserProgressMap())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** Identificador único de la cuenta activa */
  const accountKey = computed(
    () => session.currentUser?.id ?? session.currentUser?.email ?? 'valeria',
  )

  const currentUserName = computed(() => session.currentUser?.name ?? 'vayeya')

  function matchesCurrentUser(member: GroupMember): boolean {
    if (member.id === accountKey.value) return true
    const emailLower = (session.currentUser?.email ?? '').toLowerCase()
    const emailPrefix = emailLower.split('@')[0] ?? ''
    const memberIdLower = member.id.toLowerCase()
    const memberNameLower = member.name.toLowerCase()
    const myNameLower = currentUserName.value.toLowerCase()

    // Si es el miembro semilla 'valeria' y la cuenta actual es de Valeria/Vayeya, vincularlo a su cuenta real
    if (
      (memberIdLower === 'valeria' || memberNameLower === 'valeria' || memberNameLower === 'vayeya') &&
      (myNameLower.includes('valeria') ||
        myNameLower.includes('vayeya') ||
        emailLower.includes('valeria'))
    ) {
      return true
    }

    return (
      memberIdLower === myNameLower ||
      memberNameLower === myNameLower ||
      (Boolean(emailPrefix) && memberIdLower === emailPrefix)
    )
  }

  function persistAll(): void {
    try {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(allGroups.value))
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userProgressMap.value))
    } catch {
      /* ignore quota errors */
    }
  }

  // Sincroniza permanentemente el ID y el apodo real del usuario en los grupos guardados
  watch(
    () => session.currentUser,
    (u) => {
      if (!u) return
      let changed = false
      for (const g of allGroups.value) {
        let seenMe = false
        const updatedMembers: GroupMember[] = []
        for (const m of g.members) {
          if (matchesCurrentUser(m)) {
            if (seenMe) {
              changed = true
              continue
            }
            seenMe = true
            if (m.name !== u.name || m.id !== u.id) {
              m.id = u.id
              m.name = u.name
              changed = true
            }
          } else if (m.id.toLowerCase() === 'valeria' && m.name === 'Valeria') {
            m.name = characters.userDirectory['valeria']?.name ?? 'vayeya'
            changed = true
          }
          updatedMembers.push(m)
        }
        g.members = updatedMembers
      }
      if (changed) persistAll()
    },
    { immediate: true },
  )

  function ensureMyData(): UserProgressData {
    const key = accountKey.value
    if (!userProgressMap.value[key]) {
      userProgressMap.value[key] = {
        checkInHistory: [],
        activity: [],
      }
    }
    return userProgressMap.value[key]!
  }

  function resolveMemberDisplayName(m: GroupMember): string {
    const idLower = m.id.toLowerCase()
    const nameLower = m.name.toLowerCase()
    if (idLower === 'valeria' || nameLower === 'valeria') {
      return characters.userDirectory['valeria']?.name ?? 'vayeya'
    }
    return (
      characters.userDirectory[m.id]?.name ??
      characters.userDirectory[nameLower]?.name ??
      m.name
    )
  }

  function normalizeGroupMembers(g: Group): Group {
    let seenMe = false
    const normalizedMembers: GroupMember[] = []
    for (const m of g.members) {
      const isMe = matchesCurrentUser(m)
      if (isMe) {
        if (seenMe) continue
        seenMe = true
        normalizedMembers.push({
          ...m,
          name: currentUserName.value,
          isCurrentUser: true,
        })
      } else {
        normalizedMembers.push({
          ...m,
          name: resolveMemberDisplayName(m),
          isCurrentUser: false,
        })
      }
    }
    return {
      ...g,
      members: normalizedMembers,
    }
  }

  /** Grupos a los que pertenece la cuenta activa, con nombre e `isCurrentUser` sincronizados */
  const groups = computed<Group[]>(() => {
    return allGroups.value
      .filter((g) => g.members.some((m) => matchesCurrentUser(m)))
      .map((g) => normalizeGroupMembers(g))
  })

  /** Todos los grupos existentes en el sistema (para validar códigos únicos y unir cuentas) */
  const catalogGroups = computed(() => allGroups.value)

  const checkInHistory = computed<string[]>(() => {
    return userProgressMap.value[accountKey.value]?.checkInHistory ?? []
  })

  const activity = computed<ActivityItem[]>(() => {
    return userProgressMap.value[accountKey.value]?.activity ?? []
  })

  function groupById(id: string): Group | undefined {
    const found = allGroups.value.find((g) => g.id === id)
    if (!found || !found.members.some(matchesCurrentUser)) return undefined
    return normalizeGroupMembers(found)
  }

  function groupByInviteCode(code: string): Group | undefined {
    const normalized = code.trim().toUpperCase()
    return allGroups.value.find((g) => g.inviteCode.toUpperCase() === normalized)
  }

  function isInviteCodeTaken(code: string): boolean {
    const normalized = code.trim().toUpperCase()
    return allGroups.value.some((g) => g.inviteCode.toUpperCase() === normalized)
  }

  function myMembership(group: Group): GroupMember | undefined {
    return group.members.find((m) => matchesCurrentUser(m))
  }

  const bestStreak = computed<number>(() => {
    return groups.value.reduce((max, g) => {
      const me = g.members.find((m) => m.isCurrentUser)
      return Math.max(max, me?.streak ?? 0)
    }, 0)
  })

  const pendingToday = computed<number>(() => {
    return groups.value.filter((g) => g.members.some((m) => m.isCurrentUser && !m.checkedInToday))
      .length
  })

  const doneToday = computed<number>(() => {
    return groups.value.filter((g) => g.members.some((m) => m.isCurrentUser && m.checkedInToday))
      .length
  })

  const completionRate30 = computed<number>(() => {
    const set = new Set(checkInHistory.value)
    let count = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      if (set.has(toDateKey(d))) count++
    }
    return Math.round((count / 30) * 100)
  })

  const weekProgress = computed<DayProgress[]>(() => {
    const days: DayProgress[] = []
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date()
      d.setDate(d.getDate() - offset)
      const values = groups.value.map((g) => {
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
  })

  function generateUniqueInviteCode(groupName = 'KORD'): string {
    const prefix = normalizePrefix(groupName)
    let candidate = `${prefix}-${randomSuffix()}`
    let attempts = 0
    while (isInviteCodeTaken(candidate) && attempts < 50) {
      candidate = `${prefix}-${randomSuffix()}`
      attempts++
    }
    return candidate
  }

  function toggleMyCheckIn(groupId: string): void {
    const rawGroup = allGroups.value.find((g) => g.id === groupId)
    const me = rawGroup?.members.find((m) => matchesCurrentUser(m))
    if (!rawGroup || !me) return

    const myData = ensureMyData()
    const todayKey = toDateKey(new Date())
    me.checkedInToday = !me.checkedInToday

    if (me.checkedInToday) {
      me.streak += 1
      me.daysCompleted += 1
      rawGroup.streak = Math.max(
        rawGroup.streak,
        Math.min(...rawGroup.members.map((m) => m.streak)),
      )
      rawGroup.health = Math.min(100, rawGroup.health + 4)
      if (!myData.checkInHistory.includes(todayKey)) {
        myData.checkInHistory.push(todayKey)
      }
      myData.activity.unshift({
        id: `act-${Date.now()}`,
        kind: 'check-in',
        groupId,
        text: `Completaste «${me.habit}» (Racha: ${me.streak} ${me.streak === 1 ? 'día' : 'días'})`,
        at: new Date().toISOString(),
      })
    } else {
      me.streak = Math.max(0, me.streak - 1)
      me.daysCompleted = Math.max(0, me.daysCompleted - 1)
      rawGroup.health = Math.max(0, rawGroup.health - 4)
      const stillDoneSomewhere = groups.value.some((g) =>
        g.members.some((m) => m.isCurrentUser && m.checkedInToday),
      )
      if (!stillDoneSomewhere) {
        myData.checkInHistory = myData.checkInHistory.filter((k) => k !== todayKey)
      }
    }
    persistAll()
  }

  function updateMyHabit(groupId: string, newHabit: string): void {
    const rawGroup = allGroups.value.find((g) => g.id === groupId)
    const me = rawGroup?.members.find((m) => matchesCurrentUser(m))
    if (!rawGroup || !me || !newHabit.trim()) return
    me.habit = newHabit.trim()
    persistAll()
  }

  function sendMessage(groupId: string, text: string): void {
    const rawGroup = allGroups.value.find((g) => g.id === groupId)
    const me = rawGroup?.members.find((m) => matchesCurrentUser(m))
    const clean = text.trim()
    if (!rawGroup || !me || !clean) return
    rawGroup.messages.push({
      id: `msg-${Date.now()}`,
      kind: 'user',
      authorId: me.id,
      text: clean,
      sentAt: new Date().toISOString(),
    })
    persistAll()
  }

  function createGroup(payload: CreateGroupPayload, ownerName: string): Group {
    const id = `grp-${Date.now()}`
    const name = payload.name.trim()
    const requestedCode = payload.inviteCode?.trim().toUpperCase()
    const inviteCode =
      requestedCode && !isInviteCodeTaken(requestedCode)
        ? requestedCode
        : generateUniqueInviteCode(name)

    const habit = payload.habit?.trim() || 'Cumplir mi meta diaria'
    const color =
      payload.color || GROUP_COLORS[allGroups.value.length % GROUP_COLORS.length] || '#8b5cf6'

    const newGroup: Group = {
      id,
      name,
      description: '',
      category: payload.category.trim() || 'General',
      inviteCode,
      color,
      streak: 0,
      health: 100,
      completionHistory: [0, 0, 0, 0, 0, 0, 0],
      members: [
        {
          id: accountKey.value,
          name: ownerName,
          avatarUrl: null,
          role: 'ADMIN',
          habit,
          daysCompleted: 0,
          daysTotal: 1,
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
          text: `${ownerName} creó el grupo «${name}». Código de invitación: ${inviteCode}.`,
          sentAt: new Date().toISOString(),
        },
      ],
    }

    allGroups.value.push(newGroup)
    const myData = ensureMyData()
    myData.activity.unshift({
      id: `act-${Date.now()}`,
      kind: 'join',
      groupId: id,
      text: `Creaste el grupo «${name}» (${inviteCode})`,
      at: new Date().toISOString(),
    })
    persistAll()
    return groupById(id) ?? newGroup
  }

  function joinGroupByCode(
    rawCode: string,
    memberName: string,
    habit = 'Cumplir mi hábito diario',
  ): { ok: true; group: Group } | { ok: false; message: string } {
    const code = rawCode.trim().toUpperCase()
    if (code.length < 4) {
      return { ok: false, message: 'Ingresa un código de invitación válido (ej. POW-2026).' }
    }

    const existing = allGroups.value.find((g) => g.inviteCode.toUpperCase() === code)
    if (existing) {
      const alreadyIn = existing.members.some((m) => matchesCurrentUser(m))
      if (!alreadyIn) {
        existing.members.push({
          id: accountKey.value,
          name: memberName,
          avatarUrl: null,
          role: 'MIEMBRO',
          habit: habit.trim() || 'Cumplir mi hábito diario',
          daysCompleted: 0,
          daysTotal: 1,
          streak: 0,
          checkedInToday: false,
          isCurrentUser: true,
          isOnline: true,
        })
        existing.messages.push({
          id: `msg-${Date.now()}`,
          kind: 'system',
          authorId: null,
          text: `${memberName} se unió al grupo con el código de invitación.`,
          sentAt: new Date().toISOString(),
        })
      }
      const myData = ensureMyData()
      myData.activity.unshift({
        id: `act-${Date.now()}`,
        kind: 'join',
        groupId: existing.id,
        text: `Te uniste al grupo «${existing.name}» (${existing.inviteCode})`,
        at: new Date().toISOString(),
      })
      persistAll()
      return { ok: true, group: groupById(existing.id) ?? existing }
    }

    return {
      ok: false,
      message: `No existe ningún grupo con el código «${code}». Revisa que esté bien escrito.`,
    }
  }

  function leaveGroup(groupId: string): void {
    const rawGroup = allGroups.value.find((g) => g.id === groupId)
    if (!rawGroup) return
    const leavingMember = rawGroup.members.find((m) => matchesCurrentUser(m))
    rawGroup.members = rawGroup.members.filter((m) => !matchesCurrentUser(m))
    if (leavingMember?.role === 'ADMIN' && !rawGroup.members.some(m => m.role === 'ADMIN') && rawGroup.members[0]) {
      rawGroup.members[0].role = 'ADMIN'
    }
    if (leavingMember) {
      rawGroup.messages.push({
        id: `msg-${Date.now()}`,
        kind: 'system',
        authorId: null,
        text: `${leavingMember.name} salió del grupo.`,
        sentAt: new Date().toISOString(),
      })
    }
    persistAll()
  }

  return {
    groups,
    catalogGroups,
    activity,
    checkInHistory,
    isLoading,
    error,
    groupById,
    groupByInviteCode,
    isInviteCodeTaken,
    myMembership,
    bestStreak,
    pendingToday,
    doneToday,
    completionRate30,
    weekProgress,
    generateUniqueInviteCode,
    toggleMyCheckIn,
    updateMyHabit,
    sendMessage,
    createGroup,
    joinGroupByCode,
    leaveGroup,
    persist: persistAll,
  }
})
