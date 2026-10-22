/**
 * DATOS BASE INICIALES (Catálogo semilla de grupos).
 * Las rachas e historiales inician en 0 para que cada cuenta construya
 * y guarde su propio progreso real.
 */
import carlosAvatar from '@/assets/avatars/carlos.jpg'
import valeriaAvatar from '@/assets/avatars/valeria.jpg'
import type { ActivityItem, Group } from '@/types/group'

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

/** YYYY-MM-DD en hora local */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const DEMO_GROUPS: Group[] = [
  {
    id: 'equipo-pow',
    name: 'EQUIPO POW',
    description: 'Programar todos los días para sacar el proyecto final adelante.',
    category: 'Programación',
    inviteCode: 'POW-2026',
    color: '#8b5cf6',
    streak: 0,
    health: 100,
    completionHistory: [0, 0, 0, 0, 0, 0, 0],
    members: [
      {
        id: 'carlos',
        name: 'Carlos',
        avatarUrl: carlosAvatar,
        role: 'ADMIN',
        habit: 'Programar 1 hora',
        daysCompleted: 0,
        daysTotal: 1,
        streak: 0,
        checkedInToday: false,
        isCurrentUser: false,
        isOnline: true,
      },
      {
        id: 'valeria',
        name: 'vayeya',
        avatarUrl: valeriaAvatar,
        role: 'MIEMBRO',
        habit: 'Programar 1 hora',
        daysCompleted: 0,
        daysTotal: 1,
        streak: 0,
        checkedInToday: false,
        isCurrentUser: true,
        isOnline: true,
      },
    ],
    messages: [
      {
        id: 'm1',
        kind: 'system',
        authorId: null,
        text: 'Equipo «EQUIPO POW» listo. ¡Completen su primer check-in hoy para iniciar la racha desde 0!',
        sentAt: minutesAgo(30),
      },
    ],
  },
]

export const DEMO_ACTIVITY: ActivityItem[] = []

/** Días (YYYY-MM-DD) en los que el usuario actual hizo check-in (inicia en 0) */
export const DEMO_CHECKIN_HISTORY: string[] = []
