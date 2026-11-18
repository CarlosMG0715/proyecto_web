// seed para desarrollo: agrega una cuenta inicial sin duplicarla si ya existe.
require('dotenv').config()

const bcrypt = require('bcrypt')
const { prisma } = require('../src/conexionBaseDatos')

async function main() {
  // datos de acceso vienen del entorno y no se escriben dentro del codigo.
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password || password.length < 12) {
    throw new Error(
      'Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (mínimo 12 caracteres) en backend/.env antes de ejecutar el seed.',
    )
  }

  const hashContrasena = await bcrypt.hash(password, 12)
  const user = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      name: process.env.SEED_ADMIN_NAME || 'Admin de desarrollo',
      email,
      hashContrasena,
    },
  })

  const group = await prisma.grupo.upsert({
    where: { codigoInvitacion: 'HABITOS-DEMO' },
    update: {},
    create: {
      name: 'Grupo de demostración',
      codigoInvitacion: 'HABITOS-DEMO',
      timeZone: 'America/Bogota',
      idCreador: user.id,
    },
  })

  await prisma.membresiaGrupo.upsert({
    where: {
      idGrupo_idUsuario: {
        idGrupo: group.id,
        idUsuario: user.id,
      },
    },
    update: { role: 'ADMIN' },
    create: {
      idGrupo: group.id,
      idUsuario: user.id,
      role: 'ADMIN',
    },
  })

  console.log(`Seed listo: usuario ${user.email}, grupo ${group.name}`)
}

main()
  .catch((error) => {
    console.error('Error al ejecutar el seed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
