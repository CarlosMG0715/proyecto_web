const { emailTemplate } = require('./verificationEmailTemplate')

function getVerificationEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  let appUrl
  try {
    appUrl = new URL(process.env.APP_PUBLIC_URL || (
      process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'
    ))
  } catch {
    // La URL debe apuntar al frontend que abrirá el destinatario.
  }

  const isHttps = appUrl?.protocol === 'https:'
  const isLocalHttp = process.env.NODE_ENV !== 'production' && appUrl?.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(appUrl.hostname)
  if (process.env.VERIFICATION_EMAIL_MODE === 'console' && isLocalHttp && !appUrl.username && !appUrl.password) {
    return { appUrl, consoleOnly: true }
  }
  if (!apiKey || !from || (!isHttps && !isLocalHttp) || appUrl.username || appUrl.password) {
    throw Object.assign(new Error('El envío de correos de verificación no está configurado.'), { status: 503 })
  }
  return { apiKey, from, appUrl }
}

async function sendVerificationEmail(config, email, token) {
  const link = new URL('/verificar-correo', config.appUrl)
  link.hash = token
  if (config.consoleOnly) {
    console.info(`[Kordia local] Enlace de verificación: ${link}`)
    return true
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.from,
        to: [email],
        subject: 'Confirma tu correo en Kordia',
        ...emailTemplate(link.toString(), 'verify'),
        text: `${'Confirma tu correo para poder iniciar sesión en Kordia:'}\n${link}\n\nEl enlace vence en 24 horas. Si no hiciste esta solicitud, ignora este correo.`,
      }),
    })
    if (!response.ok) console.warn(JSON.stringify({ event: 'verification_email_failed', status: response.status }))
    return response.ok
  } catch {
    console.warn(JSON.stringify({ event: 'verification_email_unreachable' }))
    return false
  }
}

module.exports = { getVerificationEmailConfig, sendVerificationEmail }
