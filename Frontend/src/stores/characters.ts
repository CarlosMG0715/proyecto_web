import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useSessionStore } from './session'
import { api } from '@/services/api'

export const CHARACTERS = [
  { id: 'sprout', name: 'Brote', color: '#a88ad9', dark: '#49365e', body: '#d9b36a', x: 0, y: 0 },
  { id: 'fox', name: 'Chispa', color: '#eaa057', dark: '#68402d', body: '#f1a15c', x: 50, y: 0 },
  { id: 'music', name: 'Lima', color: '#a9bf66', dark: '#3d5236', body: '#c4d77c', x: 100, y: 0 },
  { id: 'pilot', name: 'Aviador', color: '#e28e9d', dark: '#603849', body: '#a6a1d5', x: 0, y: 100 },
  { id: 'royal', name: 'Violeta', color: '#b28ce8', dark: '#493163', body: '#bd9bea', x: 50, y: 100 },
  { id: 'cap', name: 'Explorador', color: '#7ec6ae', dark: '#2c544a', body: '#efb66a', x: 100, y: 100 },
] as const

export type Character = (typeof CHARACTERS)[number]

export const CHARACTER_THEMES = [
  { id: 'sprout', name: 'Lavanda', color: '#b9a2f1', dark: '#393654', sky: '#d9d2f2', mountain: '#aaa5ce', grass: '#a0b38d' },
  { id: 'fox', name: 'Atardecer', color: '#f39b50', dark: '#63402e', sky: '#f3d5b6', mountain: '#c78a69', grass: '#b0a66e' },
  { id: 'music', name: 'Bosque', color: '#9fbd62', dark: '#3c5134', sky: '#c4ddb9', mountain: '#85a77b', grass: '#86a65f' },
  { id: 'pilot', name: 'Glaciar', color: '#77c4df', dark: '#304e68', sky: '#c6e9f4', mountain: '#8bbdcc', grass: '#a3c9bf' },
  { id: 'royal', name: 'Anochecer', color: '#8d5bc4', dark: '#281b3d', sky: '#65517e', mountain: '#635276', grass: '#596b64' },
  { id: 'cap', name: 'Laguna', color: '#65c7ac', dark: '#2c544a', sky: '#b5e3d4', mountain: '#82afa0', grass: '#82b596' },
  { id: 'red', name: 'Volcán', color: '#f07167', dark: '#612f3b', sky: '#f4c5b8', mountain: '#bd7771', grass: '#a69872' },
  { id: 'pink', name: 'Fresa', color: '#f17eae', dark: '#63344f', sky: '#f8d0e2', mountain: '#c984a4', grass: '#a8ad7e' },
] as const

const STORAGE_KEY = 'kordia:characters'
const THEMES_KEY = 'kordia:themes'
const USER_PROFILES_KEY = 'kordia:user-directory'

export interface KnownUserProfile {
  id: string
  name: string
  email: string
  characterId: string
  themeId?: string
}

function readMap(key: string, validValues?: readonly string[]): Record<string, string> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    return Object.fromEntries(
      Object.entries(data).filter(
        ([, value]) =>
          typeof value === 'string' && (!validValues || validValues.includes(value)),
      ),
    )
  } catch {
    return {}
  }
}

function readUserDirectory(): Record<string, KnownUserProfile> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(USER_PROFILES_KEY) ?? '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    return data as Record<string, KnownUserProfile>
  } catch {
    return {}
  }
}

interface Preferences {
  characterId: string
  themeId: string
}

interface PreferenceSync {
  userId: string
  controller: AbortController
  revision: number
  pending: Partial<Preferences>
  running: Promise<void> | null
}

export const useCharacterStore = defineStore('characters', () => {
  const session = useSessionStore()
  const choices = ref(readMap(STORAGE_KEY, CHARACTERS.map(c => c.id)))
  const themeChoices = ref(readMap(THEMES_KEY, CHARACTER_THEMES.map(t => t.id)))
  const userDirectory = ref<Record<string, KnownUserProfile>>(readUserDirectory())
  const error = ref('')
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isSaved = ref(false)
  let activeSync: PreferenceSync | null = null

  const accountKey = computed(() => session.currentUser?.id ?? 'demo')
  const current = computed(() => CHARACTERS.find(c =>
    c.id === (choices.value[accountKey.value] ?? session.currentUser?.characterId),
  ) ?? CHARACTERS[0])
  const theme = computed(() => CHARACTER_THEMES.find(t =>
    t.id === (themeChoices.value[accountKey.value] ?? session.currentUser?.themeId),
  ) ?? CHARACTER_THEMES[0])

  function persistCache() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(choices.value))
      localStorage.setItem(THEMES_KEY, JSON.stringify(themeChoices.value))
      localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(userDirectory.value))
    } catch {
      // La confirmación de guardado depende del servidor, no de esta caché.
    }
  }

  function rememberProfiles(profiles: KnownUserProfile[]) {
    const next = { ...userDirectory.value }
    for (const profile of profiles) {
      if (CHARACTERS.some(c => c.id === profile.characterId)) next[profile.id] = { ...profile }
    }
    userDirectory.value = next
    persistCache()
  }

  function applyPreferences(userId: string, preferences: Partial<Preferences>) {
    if (preferences.characterId) choices.value = { ...choices.value, [userId]: preferences.characterId }
    if (preferences.themeId) themeChoices.value = { ...themeChoices.value, [userId]: preferences.themeId }
    const user = session.currentUser
    if (user?.id === userId) {
      rememberProfiles([{ ...user, characterId: current.value.id, themeId: theme.value.id }])
    } else {
      persistCache()
    }
  }

  function isActive(context: PreferenceSync) {
    return activeSync === context && session.currentUser?.id === context.userId
  }

  async function loadPreferences(context: PreferenceSync) {
    if (!isActive(context)) return
    const revision = context.revision
    isLoading.value = true
    error.value = ''
    try {
      const { data } = await api.get<Preferences>('/profile/preferences', { signal: context.controller.signal })
      if (!isActive(context) || context.revision !== revision) return
      if (!CHARACTERS.some(c => c.id === data.characterId) || !CHARACTER_THEMES.some(t => t.id === data.themeId)) {
        throw new Error('Preferencias inválidas')
      }
      applyPreferences(context.userId, data)
      isSaved.value = true
    } catch {
      if (isActive(context) && context.revision === revision) {
        isSaved.value = false
        error.value = 'No pudimos cargar tu personalización guardada. Vuelve a intentarlo.'
      }
    } finally {
      if (isActive(context)) isLoading.value = false
    }
  }

  function savePending(context: PreferenceSync): Promise<void> {
    if (context.running) return context.running
    isSaving.value = true
    isSaved.value = false
    error.value = ''
    context.running = (async () => {
      while (isActive(context) && Object.keys(context.pending).length) {
        const patch = { ...context.pending }
        const revision = context.revision
        context.pending = {}
        try {
          const { data } = await api.patch<Preferences>('/profile/preferences', patch, { signal: context.controller.signal })
          if (!isActive(context)) return
          if (context.revision === revision) applyPreferences(context.userId, data)
          isSaved.value = Object.keys(context.pending).length === 0
          error.value = ''
        } catch {
          if (isActive(context)) {
            context.pending = { ...patch, ...context.pending }
            error.value = 'El cambio se ve aquí, pero no se guardó en tu cuenta. Reintenta para verlo en otros dispositivos.'
            isSaved.value = false
          }
          return
        }
      }
    })().finally(() => {
      context.running = null
      if (isActive(context)) isSaving.value = false
    })
    return context.running
  }

  function updatePreferences(patch: Partial<Preferences>) {
    applyPreferences(accountKey.value, patch)
    const context = activeSync
    if (!context || !session.isAuthenticated) return
    context.revision++
    context.pending = { ...context.pending, ...patch }
    void savePending(context)
  }

  function selectTheme(id: string) {
    if (CHARACTER_THEMES.some(t => t.id === id)) updatePreferences({ themeId: id })
  }

  function select(id: string) {
    if (CHARACTERS.some(c => c.id === id)) updatePreferences({ characterId: id, themeId: id })
  }

  async function retrySync() {
    const context = activeSync
    if (!context) return
    if (Object.keys(context.pending).length) await savePending(context)
    else await loadPreferences(context)
  }

  async function refreshPreferences() {
    const context = activeSync
    if (!context || isLoading.value || isSaving.value || Object.keys(context.pending).length) return
    await loadPreferences(context)
  }

  watch(() => session.currentUser?.id, userId => {
    activeSync?.controller.abort()
    activeSync = null
    isLoading.value = false
    isSaving.value = false
    isSaved.value = false
    error.value = ''
    if (!userId) return
    const context: PreferenceSync = { userId, controller: new AbortController(), revision: 0, pending: {}, running: null }
    activeSync = context
    const user = session.currentUser!
    if (user.characterId && user.themeId) applyPreferences(userId, { characterId: user.characterId, themeId: user.themeId })
    void loadPreferences(context)
  }, { immediate: true, flush: 'sync' })

  function forMember(id: string, isMe = false, _memberName?: string): Character {
    if (isMe || id === session.currentUser?.id) return current.value
    // Los datos recibidos del servidor tienen prioridad sobre selecciones antiguas de este navegador.
    const characterId = userDirectory.value[id]?.characterId ?? choices.value[id]
    const character = CHARACTERS.find(c => c.id === characterId)
    if (character) return character
    if (id === 'carlos') return CHARACTERS[1]
    return CHARACTERS[0]
  }

  return {
    selected: current, current, theme, userDirectory, select, selectTheme, forMember,
    rememberProfiles, refreshPreferences, retrySync, error, isLoading, isSaving, isSaved,
  }
})
