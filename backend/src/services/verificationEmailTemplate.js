const fs = require('node:fs')
const path = require('node:path')

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

const messages = {
  verify: {
    title: 'Tu aventura empieza aquí',
    description: 'Confirma tu correo para entrar a Kordia.',
    action: 'Confirmar mi correo',
    note: 'El enlace vence en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.',
  },
  reminder: {
    title: 'Aún estás a tiempo',
    description: 'Te quedan aportes pendientes. Regístralos antes de medianoche, hora de Colombia.',
    action: 'Ir a Kordia',
    note: 'Puedes cambiar estos recordatorios en Configuración.',
  },
}

const banners = new Map()
function emailTemplate(link, kind = 'verify') {
  const href = escapeHtml(link)
  const { title, description, action, note } = messages[kind]
  let bannerAttachment = banners.get(kind)
  if (!bannerAttachment) {
    const file = path.resolve(__dirname, '../../../Frontend/src/assets', kind === 'reminder' ? 'Recordatorio RACHA.png' : 'Banner Recuperacion Verificacion.png')
    try {
      bannerAttachment = {
        filename: 'kordia-banner.png',
        content_id: 'kordia-banner',
        content_type: 'image/png',
        content: fs.readFileSync(file).toString('base64'),
      }
      banners.set(kind, bannerAttachment)
    } catch (error) {
      console.warn('No se pudo cargar el banner de correo de Kordia', error.code)
    }
  }

  // Tablas y estilos en línea para los clientes de correo, incluido Gmail.
  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#15111f;font-family:Arial,Helvetica,sans-serif;color:#f8f2ff;">
  <div style="display:none;max-height:0;overflow:hidden;">${description}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#15111f;">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="width:100%;max-width:520px;background:#282033;border-radius:24px;">
        ${bannerAttachment ? `<tr><td><img src="cid:kordia-banner" width="520" alt="Ilustración de Kordia" style="display:block;width:100%;height:auto;border:0;border-radius:24px 24px 0 0;"></td></tr>` : ''}
        <tr><td align="center" style="padding:28px 28px 24px;">
          <h1 style="margin:0 0 14px;font-size:30px;line-height:1.2;color:#fff4df;">${title}</h1>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#d7cbe1;">${description}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 18px;">
            <tr><td align="center" bgcolor="#c6a6ef" style="border-radius:14px;">
              <a href="${href}" style="display:inline-block;padding:17px 30px;font-size:17px;font-weight:bold;text-decoration:none;color:#281b39;">${action}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 28px;background:#211a2a;border-radius:0 0 24px 24px;">
          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#bcaec9;">Si el botón no abre, copia este enlace en tu navegador:</p>
          <a href="${href}" style="font-size:11px;line-height:1.6;color:#d6b7fb;word-break:break-all;overflow-wrap:anywhere;">${href}</a>
          <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#bcaec9;">${note}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  return bannerAttachment ? { html, attachments: [bannerAttachment] } : { html }
}

module.exports = { emailTemplate }
