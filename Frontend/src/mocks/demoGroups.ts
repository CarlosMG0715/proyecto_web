/**
 * DATOS DE EJEMPLO (solo para diseñar y probar la interfaz).
 *
 * Cuando el backend tenga /api/groups, este archivo se borra y el store
 * `stores/groups.ts` pedirá los datos reales con un service.
 * Las fechas se calculan relativas a "ahora" para que siempre se vean frescas.
 */
import carlosAvatar from '@/assets/avatars/carlos.jpg'
import valeriaAvatar from '@/assets/avatars/valeria.jpg'
import type { ActivityItem, Group } from '@/types/group'

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function daysAgoAt(days: number, hours: number, minutes: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

/** YYYY-MM-DD en hora local */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayKeyAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toDateKey(d)
}

export const DEMO_GROUPS: Group[] = [
  {
    id: 'equipo-pow',
    name: 'EQUIPO POW',
    description: 'Programar todos los días para sacar el proyecto final adelante.',
    category: 'Programación',
    inviteCode: 'POW-2026',
    color: '#8b5cf6',
    streak: 6,
    health: 88,
    // % de cumplimiento del equipo en los últimos 7 días (de hace 7 días a ayer)
    completionHistory: [50, 100, 100, 100, 100, 100, 100],
    members: [
      {
        id: 'carlos',
        name: 'Carlos',
        avatarUrl: carlosAvatar,
        role: 'ADMIN',
        habit: 'Programar 1 hora',
        daysCompleted: 8,
        daysTotal: 8,
        streak: 8,
        checkedInToday: true,
        isCurrentUser: false,
        isOnline: true,
      },
      {
        id: 'valeria',
        name: 'Valeria',
        avatarUrl: valeriaAvatar,
        role: 'MIEMBRO',
        habit: 'Programar 1 hora',
        daysCompleted: 7,
        daysTotal: 8,
        streak: 6,
        checkedInToday: false,
        isCurrentUser: true,
        isOnline: true,
      },
    ],
    messages: [
      {
        id: 'm1',
        kind: 'user',
        authorId: 'carlos',
        text: 'Listo mi check-in de hoy. Ya quedaron corriendo las migraciones de Prisma 🚀',
        sentAt: daysAgoAt(1, 21, 10),
      },
      {
        id: 'm2',
        kind: 'user',
        authorId: 'valeria',
        text: '¡Yo también! Terminé el login con doble token, ya refresca solito.',
        sentAt: daysAgoAt(1, 21, 42),
      },
      {
        id: 'm3',
        kind: 'system',
        authorId: null,
        text: 'Cierre del día: todos cumplieron. Racha del equipo: 6 días.',
        sentAt: daysAgoAt(0, 0, 0),
      },
      {
        id: 'm4',
        kind: 'user',
        authorId: 'carlos',
        text: 'Buenas. Hoy me pongo con el cron job de medianoche, ¿cómo vas con los grupos?',
        sentAt: minutesAgo(95),
      },
      {
        id: 'm5',
        kind: 'user',
        authorId: 'carlos',
        text: 'Ya hice mi check-in ✅',
        sentAt: minutesAgo(94),
      },
      {
        id: 'm6',
        kind: 'user',
        authorId: 'valeria',
        text: 'Arrancando con el dashboard, en un rato marco el mío.',
        sentAt: minutesAgo(40),
      },
      {
        id: 'm7',
        kind: 'user',
        authorId: 'carlos',
        text: 'Dale, que no se nos caiga la racha 🔥',
        sentAt: minutesAgo(38),
      },
    ],
  },
]

export const DEMO_ACTIVITY: ActivityItem[] = [
  { id: 'a1', kind: 'check-in', groupId: 'equipo-pow', text: 'Carlos completó «Programar 1 hora»', at: minutesAgo(94) },
  { id: 'a2', kind: 'streak', groupId: 'equipo-pow', text: 'EQUIPO POW llegó a 6 días de racha', at: daysAgoAt(0, 0, 0) },
  { id: 'a3', kind: 'check-in', groupId: 'equipo-pow', text: 'Tú completaste «Programar 1 hora»', at: daysAgoAt(1, 21, 40) },
  { id: 'a4', kind: 'check-in', groupId: 'equipo-pow', text: 'Carlos completó «Programar 1 hora»', at: daysAgoAt(1, 21, 8) },
]

/** Días (YYYY-MM-DD) en los que el usuario actual hizo check-in */
export const DEMO_CHECKIN_HISTORY: string[] = [1, 2, 3, 4, 5, 6, 8].map(dayKeyAgo)
// datos de demostracion y funciones de fecha que algunas vistas reutilizan.
