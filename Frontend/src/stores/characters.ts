import { computed, ref } from 'vue'
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
export type Character = typeof CHARACTERS[number]
export const CHARACTER_THEMES = [
  { id: 'sprout', name: 'Lavanda', color: '#a88ad9', dark: '#49365e', sky: '#c9c2df', mountain: '#9f93b8', grass: '#94ab7b' },
  { id: 'fox', name: 'Atardecer', color: '#eaa057', dark: '#68402d', sky: '#f2d4b2', mountain: '#c6a081', grass: '#afba7d' },
  { id: 'music', name: 'Bosque', color: '#a9bf66', dark: '#3d5236', sky: '#bfdcbd', mountain: '#84ab8b', grass: '#8fb473' },
  { id: 'pilot', name: 'Glaciar', color: '#8ab8d9', dark: '#304f68', sky: '#c7e5ed', mountain: '#8bb7c4', grass: '#a5c8bc' },
  { id: 'royal', name: 'Anochecer', color: '#b28ce8', dark: '#493163', sky: '#c6b9dc', mountain: '#9281ae', grass: '#9aab8d' },
  { id: 'cap', name: 'Laguna', color: '#7ec6ae', dark: '#2c544a', sky: '#b5dccb', mountain: '#82afa0', grass: '#95b975' },
] as const
const STORAGE_KEY = 'kordia:characters'
function read(): Record<string, string> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    return Object.fromEntries(Object.entries(data).filter(([, value]) => CHARACTERS.some(c => c.id === value)))
  } catch { return {} }
}
export const useCharacterStore = defineStore('characters', () => {
  const session = useSessionStore()
  const choices = ref(read())
  const themeChoices = ref<Record<string, string>>((() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem('kordia:themes') ?? '{}')
      if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
      return Object.fromEntries(Object.entries(data).filter(([, value]) => CHARACTER_THEMES.some(t => t.id === value)))
    } catch { return {} }
  })())
  const accountKey = computed(() => session.currentUser?.id ?? 'demo')
  const selected = computed(() => CHARACTERS.find(c => c.id === choices.value[accountKey.value]) ?? null)
  const current = computed(() => selected.value ?? CHARACTERS[0])
  const error = ref('')
  const theme = computed(() => CHARACTER_THEMES.find(t => t.id === themeChoices.value[accountKey.value]) ?? CHARACTER_THEMES.find(t => t.id === current.value.id) ?? CHARACTER_THEMES[0])
  function selectTheme(id: string) {
    if (!CHARACTER_THEMES.some(t => t.id === id)) return
    themeChoices.value = { ...themeChoices.value, [accountKey.value]: id }
    try { localStorage.setItem('kordia:themes', JSON.stringify(themeChoices.value)); error.value = '' }
    catch { error.value = 'El tema se aplicó, pero no pudo guardarse en este navegador.' }
  }
  function select(id: string) {
    if (!CHARACTERS.some(c => c.id === id)) return
    choices.value = { ...choices.value, [accountKey.value]: id }
    selectTheme(id)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(choices.value)); error.value = '' }
    catch { error.value = 'La selección se aplicó, pero no pudo guardarse en este navegador.' }
  }
  function forMember(id: string, isMe = false): Character {
    if (isMe) return current.value
    if (id.toLowerCase().includes('carlos')) return CHARACTERS[1]
    let hash = 0
    for (const char of id) hash += char.charCodeAt(0)
    return CHARACTERS[hash % CHARACTERS.length] ?? CHARACTERS[1]
  }
  return { selected, current, select, forMember, error, theme, selectTheme }
})
