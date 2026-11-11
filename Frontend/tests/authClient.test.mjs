import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import axios from 'axios'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function createClient(refreshResult) {
  const session = {
    accessToken: 'expired-token',
    setSession(token) { this.accessToken = token },
    clearSession() { this.accessToken = null },
  }
  let refreshCalls = 0
  const authorizedRequests = []
  const http = {
    isAxiosError: axios.isAxiosError,
    create(options) {
      const client = axios.create(options)
      client.defaults.adapter = async (config) => {
        if (config.url === '/auth/refresh') {
          refreshCalls++
          await Promise.resolve()
          if (refreshResult instanceof Error) throw refreshResult
          return { data: refreshResult, status: 200, statusText: 'OK', headers: {}, config }
        }
        authorizedRequests.push(config.headers.Authorization)
        if (config.headers.Authorization === 'Bearer expired-token') {
          throw new axios.AxiosError('Expired', 'ERR_BAD_REQUEST', config, null, {
            status: 401, data: {}, statusText: 'Unauthorized', headers: {}, config,
          })
        }
        return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
      }
      return client
    },
  }
  const source = readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8')
    .replace('import.meta.env.VITE_API_URL', 'undefined')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  const dependencies = {
    axios: { ...http, default: http },
    '@/stores/session': { useSessionStore: () => session },
  }
  new Function('require', 'module', 'exports', outputText)(
    name => dependencies[name] ?? require(name), module, module.exports,
  )
  return { ...module.exports, session, authorizedRequests, refreshCalls: () => refreshCalls }
}

test('dos peticiones vencidas comparten la renovación y reintentan con el token nuevo', async () => {
  const client = createClient({ accessToken: 'new-token', user: { id: 'user-1' } })
  const responses = await Promise.all([client.api.get('/groups'), client.api.get('/auth/sessions')])
  assert.equal(client.refreshCalls(), 1)
  assert.equal(client.session.accessToken, 'new-token')
  assert.equal(responses.every(response => response.data.ok), true)
  assert.equal(client.authorizedRequests.filter(header => header === 'Bearer new-token').length, 2)
})

test('una interrupción de red al renovar conserva la sesión para poder reintentar', async () => {
  const client = createClient(new axios.AxiosError('Sin conexión', 'ERR_NETWORK'))
  await assert.rejects(client.api.get('/groups'), /Sin conexión/)
  assert.equal(client.session.accessToken, 'expired-token')
  assert.equal(client.refreshCalls(), 1)
})

test('un refresh rechazado cierra la sesión y avisa una vez', async () => {
  const rejection = new axios.AxiosError('Sesión revocada', 'ERR_BAD_REQUEST', undefined, null, { status: 401 })
  const client = createClient(rejection)
  let expired = 0
  client.setSessionExpiredHandler(() => { expired++ })
  await assert.rejects(client.api.get('/groups'), /Sesión revocada/)
  assert.equal(client.session.accessToken, null)
  assert.equal(expired, 1)
})
