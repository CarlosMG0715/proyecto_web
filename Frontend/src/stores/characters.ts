import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useSessionStore } from './session'

export const CHARACTERS = [
  { id: 'sprout', name: 'Brote', color: '#a88ad9', dark: '#49365e', body: '#d9b36a', x: 0, y: 0 },
  { id: 'fox', name: 'Zorro', color: '#eaa057', dark: '#68402d', body: '#f1a15c', x: 50, y: 0 },
  { id: 'music', name: 'Lima', color: '#a9bf66', dark: '#3d5236', body: '#c4d77c', x: 100, y: 0 },
  { id: 'pilot', name: 'Pingüino', color: '#e28e9d', dark: '#603849', body: '#a6a1d5', x: 0, y: 100 },
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

export const useCharacterStore = defineStore('characters', () => {
  const session = useSessionStore()

  const choices = ref<Record<string, string>>(
    readMap(
      STORAGE_KEY,
      CHARACTERS.map((c) => c.id),
    ),
  )
  const themeChoices = ref<Record<string, string>>(
    readMap(THEMES_KEY, CHARACTER_THEMES.map((t) => t.id)),
  )
  const userDirectory = ref<Record<string, KnownUserProfile>>(readUserDirectory())

  const accountKey = computed(
    () => session.currentUser?.id ?? session.currentUser?.email ?? 'demo',
  )

  /** Personaje actual del usuario */
  const current = computed(() => {
    const byId = choices.value[accountKey.value]
    const byName = session.currentUser?.name
      ? choices.value[session.currentUser.name.toLowerCase()]
      : undefined
    const chosenId = byId ?? byName
    return CHARACTERS.find((c) => c.id === chosenId) ?? CHARACTERS[0]
  })

  const error = ref('')

  const theme = computed(
    () =>
      CHARACTER_THEMES.find((t) => t.id === themeChoices.value[accountKey.value]) ??
      CHARACTER_THEMES.find((t) => t.id === current.value.id) ??
      CHARACTER_THEMES[0],
  )

  function syncCurrentUserToDirectory(charId?: string) {
    const u = session.currentUser
    if (!u) return
    const activeCharId = charId ?? current.value.id
    const nameKey = u.name.trim().toLowerCase()
    const emailKey = u.email.trim().toLowerCase()

    const nextChoices: Record<string, string> = {
      ...choices.value,
      [u.id]: activeCharId,
      [nameKey]: activeCharId,
      [emailKey]: activeCharId,
    }
    // Si esta cuenta es la de Valeria/vayeya, vinculamos también la llave semilla 'valeria'
    if (nameKey.includes('vayeya') || nameKey.includes('valeria') || emailKey.includes('valeria')) {
      nextChoices['valeria'] = activeCharId
    }
    choices.value = nextChoices

    const profileEntry: KnownUserProfile = {
      id: u.id,
      name: u.name,
      email: u.email,
      characterId: activeCharId,
    }
    userDirectory.value = {
      ...userDirectory.value,
      [u.id]: profileEntry,
      [nameKey]: profileEntry,
    }
    if (nameKey.includes('vayeya') || nameKey.includes('valeria') || emailKey.includes('valeria')) {
      userDirectory.value['valeria'] = profileEntry
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(choices.value))
      localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(userDirectory.value))
    } catch {
      /* ignore */
    }
  }

  watch(
    () => session.currentUser,
    (u) => {
      if (u) syncCurrentUserToDirectory()
    },
    { immediate: true },
  )

  function selectTheme(id: string) {
    if (!CHARACTER_THEMES.some((t) => t.id === id)) return
    themeChoices.value = { ...themeChoices.value, [accountKey.value]: id }
    try {
      localStorage.setItem(THEMES_KEY, JSON.stringify(themeChoices.value))
      error.value = ''
    } catch {
      error.value = 'El tema se aplicó, pero no pudo guardarse en este navegador.'
    }
  }

  function select(id: string) {
    if (!CHARACTERS.some((c) => c.id === id)) return
    choices.value = { ...choices.value, [accountKey.value]: id }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(choices.value)) } catch {
      error.value = 'El personaje se aplicó, pero no pudo guardarse.'
    }
    syncCurrentUserToDirectory(id)
    selectTheme(id)
    error.value = ''
  }

  /**
   * Obtiene el personaje real que escogió cualquier miembro del grupo
   * buscando por su ID, su apodo o en el directorio de usuarios registrados.
   */
  function forMember(id: string, isMe = false, memberName?: string): Character {
    if (isMe) return current.value

    const idLower = id.trim().toLowerCase()
    const nameLower = memberName?.trim().toLowerCase() ?? ''

    // 1. Buscar por ID exacto, ID en minúsculas o por apodo en el mapa de elecciones
    const directCharId =
      choices.value[id] ??
      choices.value[idLower] ??
      (nameLower ? choices.value[nameLower] : undefined) ??
      userDirectory.value[id]?.characterId ??
      userDirectory.value[idLower]?.characterId ??
      (nameLower ? userDirectory.value[nameLower]?.characterId : undefined)

    if (directCharId) {
      const found = CHARACTERS.find((c) => c.id === directCharId)
      if (found) return found
    }

    if (idLower.includes('carlos') || nameLower.includes('carlos')) return CHARACTERS[1]

    let hash = 0
    for (const char of id) hash += char.charCodeAt(0)
    return CHARACTERS[hash % CHARACTERS.length] ?? CHARACTERS[1]
  }

  return {
    selected: current,
    current,
    userDirectory,
    select,
    forMember,
    error,
    theme,
    selectTheme,
  }
})
