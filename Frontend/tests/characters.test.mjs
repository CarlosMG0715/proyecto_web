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
const { useCharacterStore, CHARACTERS, CHARACTER_THEMES } = loadStore('../src/stores/characters.ts', { './session': sessionModule })
function fresh() { setActivePinia(createPinia()); return { characters: useCharacterStore(), session: sessionModule.useSessionStore() } }

test('los seis personajes seleccionan su icono y tema correspondiente', () => {
  storage.clear()
  const { characters } = fresh()
  assert.equal(CHARACTERS.length, 6)
  assert.equal(CHARACTER_THEMES.length, 6)
  assert.equal(characters.selected, null)
  for (const c of CHARACTERS) {
    characters.select(c.id)
    assert.equal(characters.selected.id, c.id)
    assert.equal(characters.theme.id, c.id)
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
  assert.equal(characters.selected.name, 'Aviador')
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
  assert.equal(characters.selected, null)
  characters.select('pilot')
  session.setUser({ id: 'a', name: 'A', email: 'a@example.test' })
  assert.equal(characters.selected.id, 'fox')
  assert.equal(characters.theme.id, 'music')
})

test('preferencias corruptas usan valores seguros', () => {
  storage.set('kordia:characters', '{invalid')
  storage.set('kordia:themes', '["unknown"]')
  const { characters } = fresh()
  assert.equal(characters.selected, null)
  assert.equal(characters.current.id, 'sprout')
  assert.equal(characters.theme.id, 'sprout')
})
