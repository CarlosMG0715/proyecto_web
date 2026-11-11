const { emailTemplate } = require('./verificationEmailTemplate')
const { prisma } = require('../prisma')
const { demoEmail, getVerificationEmailConfig } = require('./verificationEmail')

const notificationDefaults = { midnight: true, email: false, chat: true, inactivity: true, mutedGroups: [] }

async function sendDueReminders(config) {
  const email = demoEmail()
  if (!email) return
  // Bogota usa UTC-5 durante todo el ano.
  const bogota = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const remaining = 1440 - bogota.getUTCHours() * 60 - bogota.getUTCMinutes()
  const thresholds = [
    // Conserva las claves existentes y su orden cronológico para evitar reenvíos.
    { key: '0a', minutes: 480, label: '8 horas' },
    { key: '0b', minutes: 360, label: '6 horas' },
    { key: '1', minutes: 240, label: '4 horas' },
    { key: '2', minutes: 120, label: '2 horas' },
    { key: '3', minutes: 60, label: '1 hora' },
    { key: '4', minutes: 30, label: '30 minutos' },
  ]
  const threshold = thresholds.find(({ minutes }) => remaining <= minutes && remaining > minutes - 5)
  if (!threshold) return

  const day = bogota.toISOString().slice(0, 10)
  const localDate = new Date(day)
  const slot = day + '/' + threshold.key
  const subject = 'Kordia · Recordatorio de ' + threshold.label
  const users = await prisma.user.findMany({
    where: {
      email,
      emailVerifiedAt: { not: null },
      notificationPreferences: { path: ['email'], equals: true },
      OR: [{ lastReminderDay: null }, { lastReminderDay: { lt: slot } }],
      memberships: { some: { fallenAt: null, group: { archivedAt: null, habits: { some: { isActive: true } } } } },
    },
    select: {
      id: true, email: true,
      dailyGroupChecks: { where: { localDate }, select: { groupId: true } },
      memberships: {
        where: { fallenAt: null, group: { archivedAt: null, habits: { some: { isActive: true } } } },
        select: { groupId: true },
      },
    },
  })
  for (const user of users) {
    const checked = new Set(user.dailyGroupChecks.map(check => check.groupId))
    if (user.memberships.every(member => checked.has(member.groupId))) continue
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: 'Bearer ' + config.apiKey,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'daily-reminder/' + user.id + '/' + slot,
        },
        body: JSON.stringify({
          from: config.from,
          to: [user.email],
          subject,
          ...emailTemplate(config.appUrl, 'reminder'),
          text: 'Aún tienes aportes pendientes. Regístralos antes de medianoche (hora de Colombia).\n' + config.appUrl,
        }),
      })
      if (!response.ok) {
        console.warn('No se pudo enviar un recordatorio de Kordia', response.status)
        continue
      }
      await prisma.user.updateMany({ where: { id: user.id, OR: [{ lastReminderDay: null }, { lastReminderDay: { lt: slot } }] }, data: { lastReminderDay: slot } })
    } catch (error) {
      console.warn('Falló un recordatorio de Kordia', error.code ?? error.name)
    }
  }
}

function startDailyReminders() {
  let config
  try { config = getVerificationEmailConfig() } catch { return () => {} }
  if (config.consoleOnly) return () => {}

  let running = false
  async function tick() {
    if (running) return
    running = true
    try { await sendDueReminders(config) }
    catch (error) { console.warn('Falló la revisión de recordatorios', error.code ?? error.name) }
    finally { running = false }
  }
  void tick()
  const timer = setInterval(tick, 60_000)
  timer.unref()
  return () => clearInterval(timer)
}

module.exports = { notificationDefaults, startDailyReminders }
