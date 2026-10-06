require('dotenv').config()

const bcrypt = require('bcrypt')
const { prisma } = require('../src/prisma')

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password || password.length < 12) {
    throw new Error(
      'Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (mínimo 12 caracteres) en backend/.env antes de ejecutar el seed.',
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: process.env.SEED_ADMIN_NAME || 'Admin de desarrollo',
      email,
      passwordHash,
    },
  })

  const group = await prisma.group.upsert({
    where: { inviteCode: 'HABITOS-DEMO' },
    update: {},
    create: {
      name: 'Grupo de demostración',
      inviteCode: 'HABITOS-DEMO',
      timeZone: 'America/Bogota',
      createdById: user.id,
    },
  })

  await prisma.groupMembership.upsert({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: user.id,
      },
    },
    update: { role: 'ADMIN' },
    create: {
      groupId: group.id,
      userId: user.id,
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
