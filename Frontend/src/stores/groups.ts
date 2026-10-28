import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DEMO_GROUPS, toDateKey } from '@/mocks/demoGroups'
import { useCharacterStore } from './characters'
import { useSessionStore } from './session'
import type { ActivityItem, CreateGroupPayload, Group, GroupMember } from '@/types/group'
import { groupService, type RemoteGroup } from '@/services/groupService'
import {
  createHabitRequest,
  deleteHabitRequest,
  fetchCheckInHistory,
  leaveGroupRequest,
  sendGroupMessageRequest,
  toggleCheckInRequest,
  updateGroupRequest,
  updateHabitRequest,
} from '@/services/groupsService'

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
  let loadedForUserId: string | null = null
  let loadingForUserId: string | null = null
  let loadSequence = 0

  function fromRemote(remote: RemoteGroup, previous?: Group): Group {
    characters.rememberProfiles(remote.memberships.map(membership => membership.user))
    const priorMembers = new Map(previous?.members.map(member => [member.id, member]) ?? [])
    const remoteMembers = new Map((remote.members ?? []).map(member => [member.id, member]))
    return {
      id: remote.id,
      name: remote.name,
      description: remote.description ?? '',
      category: remote.category,
      inviteCode: remote.inviteCode,
      color: remote.color,
      streak: remote.streak ?? previous?.streak ?? 0,
      health: remote.health ?? previous?.health ?? 100,
      completionHistory: remote.completionHistory ?? previous?.completionHistory ?? [0, 0, 0, 0, 0, 0, 0],
      habits: remote.habits ?? previous?.habits ?? [],
      timeZone: remote.timeZone ?? previous?.timeZone ?? 'America/Bogota',
      members: remote.memberships.map((membership) => {
        const old = priorMembers.get(membership.user.id)
        const current = remoteMembers.get(membership.user.id)
        return {
          id: membership.user.id,
          name: membership.user.name,
          avatarUrl: null,
          role: membership.role,
          habit: current?.habit ?? old?.habit ?? 'Definir hábito diario',
          daysCompleted: current?.daysCompleted ?? old?.daysCompleted ?? 0,
          daysTotal: current?.daysTotal ?? old?.daysTotal ?? 0,
          streak: current?.streak ?? old?.streak ?? 0,
          checkedInToday: current?.checkedInToday ?? old?.checkedInToday ?? false,
          isCurrentUser: membership.user.id === session.currentUser?.id,
          isOnline: current?.isOnline ?? old?.isOnline ?? false,
          characterId: membership.user.characterId,
          themeId: membership.user.themeId,
        }
      }),
      messages: remote.messages ?? previous?.messages ?? [],
    }
  }

  async function refreshRemoteGroups(): Promise<void> {
    const userId = session.currentUser?.id
    if (!userId || (isLoading.value && loadingForUserId === userId)) return
    const sequence = ++loadSequence
    loadingForUserId = userId
    isLoading.value = true
    try {
      const remote = await groupService.list()
      if (session.currentUser?.id !== userId || sequence !== loadSequence) return
      const remoteHistory = await fetchCheckInHistory()
      if (session.currentUser?.id !== userId || sequence !== loadSequence) return
      userProgressMap.value[userId] = {
        ...userProgressMap.value[userId],
        checkInHistory: remoteHistory,
        activity: userProgressMap.value[userId]?.activity ?? [],
      }
      const previousById = new Map(allGroups.value.map((group) => [group.id, group]))
      const remoteGroups = remote.map((group) => fromRemote(group, previousById.get(group.id)))
      allGroups.value = remoteGroups
      loadedForUserId = userId
      persistAll()
      error.value = null
    } catch {
      if (sequence === loadSequence) error.value = 'No pudimos actualizar los miembros del grupo.'
    } finally {
      if (sequence === loadSequence) {
        isLoading.value = false
        loadingForUserId = null
      }
    }
  }

  watch(() => session.currentUser?.id, (userId) => {
    if (!userId) {
      loadSequence++
      loadingForUserId = null
      isLoading.value = false
      loadedForUserId = null
      return
    }
    if (loadedForUserId !== userId) void refreshRemoteGroups()
  }, { immediate: true })

  /** Identificador único de la cuenta activa */
  const accountKey = computed(
    () => session.currentUser?.id ?? session.currentUser?.email ?? 'valeria',
  )

  const currentUserName = computed(() => session.currentUser?.name ?? 'vayeya')

  function matchesCurrentUser(member: GroupMember): boolean {
    return member.id === accountKey.value
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
    return characters.userDirectory[m.id]?.name ?? m.name
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

  async function toggleMyCheckIn(groupId: string): Promise<void> {
    const rawGroup = allGroups.value.find((g) => g.id === groupId)
    const me = rawGroup?.members.find((m) => matchesCurrentUser(m))
    if (!rawGroup || !me) return

    const habits = rawGroup.habits ?? []
    if (Array.isArray(rawGroup.habits) && habits.length === 0) {
      error.value = 'Este grupo todavía no tiene hábitos. Pídele al admin que agregue uno antes del check-in.'
      throw new Error(error.value)
    }
    const shouldComplete = !me.checkedInToday
    if (habits.length) {
      try {
        for (const habit of habits) {
          const current = Boolean(habit.checks[me.id]?.done)
          if (current === shouldComplete) continue
          const result = await toggleCheckInRequest(groupId, habit.id, habit.checks[me.id]?.note ?? '')
          habit.checks[me.id] = { done: result.done, note: result.note }
        }
        me.checkedInToday = shouldComplete
      } catch (cause) {
        error.value = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
          ?? 'No pudimos guardar el check-in en el servidor.'
        await refreshRemoteGroups()
        throw cause
      }
    }

    const myData = ensureMyData()
    const todayKey = toDateKey(new Date())
    if (!habits.length) me.checkedInToday = !me.checkedInToday

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

  async function sendMessage(groupId: string, text: string): Promise<void> {
    const rawGroup = allGroups.value.find((g) => g.id === groupId)
    const me = rawGroup?.members.find((m) => matchesCurrentUser(m))
    const clean = text.trim()
    if (!rawGroup || !me || !clean) return
    try {
      const message = await sendGroupMessageRequest(groupId, clean)
      rawGroup.messages.push(message)
    } catch (cause) {
      error.value = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No pudimos enviar el mensaje.'
      throw cause
    }
    persistAll()
  }

  async function updateGroup(groupId: string, changes: { name?: string; category?: string; description?: string; color?: string }): Promise<void> {
    error.value = null
    try {
      await updateGroupRequest(groupId, changes)
      await refreshRemoteGroups()
    } catch (cause) {
      error.value = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No pudimos guardar los datos del grupo.'
      throw cause
    }
  }

  async function createGroupHabit(groupId: string, name: string, icon = '🎯'): Promise<void> {
    error.value = null
    try {
      await createHabitRequest(groupId, name, icon)
      await refreshRemoteGroups()
    } catch (cause) {
      error.value = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No pudimos agregar el hábito.'
      throw cause
    }
  }

  async function editGroupHabit(groupId: string, habitId: string, name: string, icon = '🎯'): Promise<void> {
    error.value = null
    try {
      const currentIcon = allGroups.value.find((group) => group.id === groupId)?.habits?.find((habit) => habit.id === habitId)?.icon
      await updateHabitRequest(groupId, habitId, { name, icon: currentIcon ?? icon })
      await refreshRemoteGroups()
    } catch (cause) {
      error.value = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No pudimos actualizar el hábito.'
      throw cause
    }
  }

  async function removeGroupHabit(groupId: string, habitId: string): Promise<void> {
    error.value = null
    try {
      await deleteHabitRequest(groupId, habitId)
      await refreshRemoteGroups()
    } catch (cause) {
      error.value = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No pudimos quitar el hábito.'
      throw cause
    }
  }

  function createGroup(payload: CreateGroupPayload, ownerName: string, persisted?: { id: string; inviteCode: string }): Group {
    const id = persisted?.id ?? `grp-${Date.now()}`
    const name = payload.name.trim()
    const requestedCode = payload.inviteCode?.trim().toUpperCase()
    const inviteCode =
      persisted?.inviteCode ?? (requestedCode && !isInviteCodeTaken(requestedCode)
        ? requestedCode
        : generateUniqueInviteCode(name)
      )

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

  async function requestGroupJoin(rawCode: string): Promise<{ ok: true; groupName: string } | { ok: false; message: string }> {
    try {
      const result = await groupService.requestJoin(rawCode.trim().toUpperCase())
      return { ok: true, groupName: result.group.name }
    } catch (cause) {
      const message = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
      return { ok: false, message: message ?? 'No se pudo enviar la solicitud. Revisa el código e inténtalo de nuevo.' }
    }
  }

  async function leaveGroup(groupId: string): Promise<void> {
    error.value = null
    try {
      await leaveGroupRequest(groupId)
      allGroups.value = allGroups.value.filter((group) => group.id !== groupId)
      persistAll()
    } catch (cause) {
      error.value = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No pudimos salir del grupo.'
      throw cause
    }
  }

  return {
    groups,
    catalogGroups,
    isLoading,
    refreshRemoteGroups,
    activity,
    checkInHistory,
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
    updateGroup,
    createGroupHabit,
    editGroupHabit,
    removeGroupHabit,
    sendMessage,
    createGroup,
    requestGroupJoin,
    leaveGroup,
    persist: persistAll,
  }
})
