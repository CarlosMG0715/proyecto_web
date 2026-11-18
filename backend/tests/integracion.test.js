const assert = require('node:assert/strict')
const test = require('node:test')
const { once } = require('node:events')
const { createServer } = require('node:http')
require('dotenv').config({ quiet: true })
const { prisma } = require('../src/conexionBaseDatos')

test(
  'flujo completo: acceso, permisos, hábitos, chat, cierre y cuenta',
  { skip: process.env.KORDIA_INTEGRATION !== '1' },
  async () => {
    const { conectarTiempoReal } = require('../src/tiempoReal')
    const { cerrarDia } = require('../src/services/servicioCierreDiario')
    const { claveFecha, convertirAFecha, desplazarDia } = require('../src/utils/fechas')
    const {
      io: client,
    } = require('../../frontend/node_modules/socket.io-client')
    const server = createServer(require('../src/aplicacion'))
    const io = conectarTiempoReal(server)
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const base = `http://127.0.0.1:${server.address().port}`
    const suffix = Date.now()
    const users = [],
      groups = [],
      sockets = []
    const password = 'Prueba-kordia-2026!'
    async function request(method, path, body, token, cookie) {
      const response = await fetch(base + '/api' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
      return {
        status: response.status,
        data,
        cookie: response.headers.get('set-cookie'),
      }
    }
    async function account(name) {
      const email = `kordia-test-${name}-${suffix}@example.com`
      const registered = await request('POST', '/auth/register', {
        name,
        email,
        password,
      })
      assert.equal(registered.status, 201)
      users.push(registered.data.user.id)
      const login = await request('POST', '/auth/login', { email, password })
      assert.equal(login.status, 200)
      assert.match(login.cookie, /HttpOnly/i)
      return {
        id: registered.data.user.id,
        email,
        token: login.data.tokenAcceso,
        cookie: login.cookie.split(';')[0],
      }
    }
    try {
      const a = await account('Admin'),
        b = await account('Miembro'),
        c = await account('Externo')
      const created = await request(
        'POST',
        '/groups',
        { name: 'Prueba de integración', color: '#8b5cf6' },
        a.token,
      )
      assert.equal(created.status, 201)
      const group = created.data
      groups.push(group.id)
      const route = '/groups/' + group.id
      assert.equal(
        (
          await request(
            'POST',
            '/groups/join',
            { code: group.codigoInvitacion },
            b.token,
          )
        ).status,
        200,
      )
      assert.equal(
        (await request('GET', route, undefined, c.token)).status,
        403,
      )
      assert.equal(
        (
          await request(
            'PATCH',
            route,
            { name: 'Intruso', color: '#8b5cf6' },
            b.token,
          )
        ).status,
        403,
      )
      assert.equal(
        (
          await request(
            'POST',
            route + '/habits',
            { name: 'x'.repeat(81) },
            a.token,
          )
        ).status,
        400,
      )
      assert.equal(
        (
          await request(
            'POST',
            route + '/habits',
            { name: 'Leer', description: 'Diez páginas', diasMeta: 7 },
            a.token,
          )
        ).status,
        204,
      )
      let detail = (await request('GET', route, undefined, a.token)).data
      const idHabito = detail.habits[0].id
      const checkRoute = route + '/habits/' + idHabito + '/check-in'
      assert.equal(
        (await request('PUT', checkRoute, { completed: true }, b.token)).status,
        204,
      )
      assert.equal(
        (await request('PUT', checkRoute, { completed: true }, b.token)).status,
        204,
      )
      assert.equal(
        await prisma.registroHabito.count({ where: { idHabito, idUsuario: b.id } }),
        1,
      )
      assert.equal(
        (await request('PUT', checkRoute, { completed: false }, b.token))
          .status,
        204,
      )
      assert.equal(
        (
          await request(
            'PATCH',
            '/profile/preferences',
            { idPersonaje: 'fox' },
            b.token,
          )
        ).status,
        200,
      )
      assert.equal(
        (
          await request(
            'PATCH',
            '/profile/preferences',
            { idPersonaje: 'no-existe' },
            b.token,
          )
        ).status,
        400,
      )

      const socket = client(base, {
        auth: { token: b.token },
        transports: ['websocket'],
      })
      sockets.push(socket)
      await once(socket, 'connect')
      const joined = await socket
        .timeout(3000)
        .emitWithAck('watch-group', group.id)
      assert.equal(joined.ok, true)
      const changed = once(socket, 'group-changed')
      assert.equal(
        (
          await request(
            'POST',
            route + '/messages',
            { content: '¡Vamos equipo!' },
            a.token,
          )
        ).status,
        204,
      )
      assert.equal(
        (
          await Promise.race([
            changed,
            new Promise((_, reject) => {
              const timer = setTimeout(
                () => reject(new Error('Sin evento de chat')),
                3000,
              )
              timer.unref()
            }),
          ])
        )[0],
        group.id,
      )
      detail = (await request('GET', route, undefined, b.token)).data
      assert.ok(
        detail.messages.some((message) => message.content === '¡Vamos equipo!'),
      )
      const stranger = client(base, {
        auth: { token: c.token },
        transports: ['websocket'],
      })
      sockets.push(stranger)
      await once(stranger, 'connect')
      assert.equal(
        (await stranger.timeout(3000).emitWithAck('watch-group', group.id)).ok,
        false,
      )

      // Solo envejece los datos de estas cuentas de prueba para comprobar medianoche.
      const today = claveFecha(),
        first = desplazarDia(today, -3)
      await prisma.grupo.update({
        where: { id: group.id },
        data: { creadoEn: convertirAFecha(desplazarDia(first, -1)) },
      })
      await prisma.habito.update({
        where: { id: idHabito },
        data: { creadoEn: convertirAFecha(desplazarDia(first, -1)) },
      })
      await prisma.membresiaGrupo.updateMany({
        where: { idGrupo: group.id },
        data: { ingresoEn: convertirAFecha(desplazarDia(first, -1)) },
      })
      for (let offset = 0; offset < 3; offset++) {
        const date = desplazarDia(first, offset)
        await prisma.registroHabito.create({
          data: { idHabito, idUsuario: a.id, fechaRegistro: convertirAFecha(date) },
        })
        assert.equal(await cerrarDia(group.id, date), true)
        assert.equal(await cerrarDia(group.id, date), false)
      }
      assert.equal(
        await prisma.penalizacion.count({ where: { idGrupo: group.id } }),
        6,
      )
      detail = (await request('GET', route, undefined, a.token)).data
      assert.equal(detail.streak, 0)
      assert.equal(detail.members.find((m) => m.id === a.id).caidoEn, null)
      assert.ok(detail.members.find((m) => m.id === b.id).caidoEn)
      assert.equal(detail.members.find((m) => m.id === b.id).diasSinCumplir, 3)
      assert.equal(
        (await request('PUT', checkRoute, { completed: true }, b.token)).status,
        409,
      )
      assert.equal(
        (await request('POST', route + '/revive', {}, b.token)).status,
        204,
      )
      assert.equal(
        (await request('PUT', checkRoute, { completed: true }, b.token)).status,
        204,
      )
      assert.equal(
        (await request('PUT', checkRoute, { completed: true }, a.token)).status,
        204,
      )
      assert.equal(
        (await request('GET', route, undefined, a.token)).data.streak,
        1,
      )

      const renewed = await request(
        'POST',
        '/auth/refresh',
        {},
        undefined,
        c.cookie,
      )
      assert.equal(renewed.status, 200)
      assert.notEqual(renewed.cookie.split(';')[0], c.cookie)
      assert.equal(
        (await request('POST', '/auth/refresh', {}, undefined, c.cookie))
          .status,
        401,
      )
      assert.equal(
        (await request('GET', '/groups', undefined, renewed.data.tokenAcceso))
          .status,
        401,
      )
      assert.equal(
        (
          await request(
            'PATCH',
            '/auth/account',
            { action: 'name', name: 'Nuevo apodo' },
            a.token,
          )
        ).status,
        200,
      )
      assert.equal(
        (
          await request(
            'PATCH',
            '/auth/account',
            {
              action: 'password',
              password,
              nuevaContrasena: 'Nueva-password-2026!',
            },
            a.token,
          )
        ).status,
        200,
      )
      assert.equal(
        (await request('POST', '/auth/login', { email: a.email, password }))
          .status,
        401,
      )
      assert.equal(
        (
          await request(
            'DELETE',
            '/auth/account',
            { password: 'Nueva-password-2026!' },
            a.token,
          )
        ).status,
        204,
      )
      detail = (await request('GET', route, undefined, b.token)).data
      assert.equal(detail.members.find((m) => m.id === b.id).role, 'ADMIN')
      assert.equal(
        (await request('DELETE', route, undefined, b.token)).status,
        204,
      )
      assert.equal(
        (await request('POST', '/auth/logout', {}, b.token, b.cookie)).status,
        200,
      )
      assert.equal(
        (await request('GET', '/groups', undefined, b.token)).status,
        401,
      )
    } finally {
      for (const socket of sockets) socket.disconnect()
      await prisma.grupo.deleteMany({ where: { id: { in: groups } } })
      await prisma.usuario.deleteMany({ where: { id: { in: users } } })
      await new Promise((resolve) => io.close(resolve))
      await prisma.$disconnect()
    }
  },
)
