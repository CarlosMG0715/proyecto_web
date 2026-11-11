import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import { createPinia, setActivePinia } from 'pinia'
const require = createRequire(import.meta.url)
const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
}
function loadStore(path, overrides = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => overrides[name] ?? require(name), module, module.exports)
  return module.exports
}
const sessionModule = loadStore('../src/stores/session.ts')
const preferencesApi = {
  get: async () => { throw new Error('Sin conexión durante la prueba de caché') },
  patch: async (_path, preferences) => ({ data: preferences }),
}
const { useCharacterStore, CHARACTERS, CHARACTER_THEMES } = loadStore('../src/stores/characters.ts', {
  './session': sessionModule,
  '@/services/api': { api: preferencesApi },
})
function fresh() { setActivePinia(createPinia()); return { characters: useCharacterStore(), session: sessionModule.useSessionStore() } }

test('los seis personajes seleccionan su icono y tema correspondiente', () => {
  storage.clear()
  const { characters } = fresh()
  assert.equal(CHARACTERS.length, 6)
  assert.equal(CHARACTER_THEMES.length, 8)
  assert.equal(characters.current.id, 'sprout')
  for (const c of CHARACTERS) {
    characters.select(c.id)
    assert.equal(characters.selected.id, c.id)
    assert.equal(characters.theme.id, 'sprout')
    assert.equal(characters.forMember('me', true).id, c.id)
  }
  assert.equal(characters.forMember('carlos').id, 'fox')
})

test('el tema independiente y el personaje sobreviven a una recarga', () => {
  storage.clear()
  let { characters } = fresh()
  characters.select('pilot')
  characters.selectTheme('cap')
  characters = fresh().characters
  assert.equal(characters.selected.id, 'pilot')
  assert.equal(characters.theme.name, 'Laguna')
  characters.select('unknown')
  characters.selectTheme('unknown')
  assert.equal(characters.selected.id, 'pilot')
  assert.equal(characters.theme.id, 'cap')
})

test('las preferencias de dos cuentas se mantienen separadas', () => {
  storage.clear()
  const { characters, session } = fresh()
  session.setUser({ id: 'a', name: 'A', email: 'a@example.test' })
  characters.select('fox')
  characters.selectTheme('music')
  session.setUser({ id: 'b', name: 'B', email: 'b@example.test' })
  assert.equal(characters.current.id, 'sprout')
  characters.select('pilot')
  session.setUser({ id: 'a', name: 'A', email: 'a@example.test' })
  assert.equal(characters.selected.id, 'fox')
  assert.equal(characters.theme.id, 'music')
})

test('preferencias corruptas usan valores seguros', () => {
  storage.set('kordia:characters', '{invalid')
  storage.set('kordia:themes', '["unknown"]')
  const { characters } = fresh()
  assert.equal(characters.current.id, 'sprout')
  assert.equal(characters.current.id, 'sprout')
  assert.equal(characters.theme.id, 'sprout')
})


const demoModule = loadStore('../src/mocks/demoGroups.ts', {
  '@/assets/avatars/carlos.jpg': 'carlos.jpg', '@/assets/avatars/valeria.jpg': 'valeria.jpg',
})
const leaveRequests = []
const joinRequests = []
const { useGroupsStore } = loadStore('../src/stores/groups.ts', {
  './session': sessionModule, './characters': { useCharacterStore }, '@/mocks/demoGroups': demoModule,
  '@/services/groupService': {
    groupService: {
      list: async () => [],
      requestJoin: async (code) => {
        joinRequests.push(code)
        return { group: { name: 'Equipo de prueba' }, request: { id: 'pending-request' } }
      },
    },
  },
  '@/services/groupsService': {
    fetchCheckInHistory: async () => [],
    leaveGroupRequest: async (groupId) => { leaveRequests.push(groupId) },
  },
})
test('salir confirma la petición al servidor y volver por código solicita aprobación', async () => {
  storage.clear()
  const { session } = fresh()
  session.setUser({ id: 'test-owner', name: 'Owner', email: 'owner@example.test' })
  const groups = useGroupsStore()
  await groups.refreshRemoteGroups()
  // Deja terminar la carga iniciada por el watcher de la cuenta.
  await new Promise(resolve => setImmediate(resolve))
  const group = groups.createGroup({ name: 'Equipo de prueba', category: 'General' }, 'Owner')
  await groups.leaveGroup(group.id)
  assert.equal(leaveRequests.at(-1), group.id)
  assert.equal(groups.groups.some(g => g.id === group.id), false)
  assert.equal(groups.groupById(group.id), undefined)
  const result = await groups.requestGroupJoin(group.inviteCode.toLowerCase())
  assert.equal(result.ok, true)
  assert.equal(joinRequests.at(-1), group.inviteCode.toUpperCase())
  assert.equal(groups.groupById(group.id), undefined)
})
