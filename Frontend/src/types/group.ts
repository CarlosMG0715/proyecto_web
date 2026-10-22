/**
 * Contratos de datos del módulo de Grupos, Hábitos, Check-in y Chat.
 * Hoy los llena el store con datos de ejemplo; cuando exista el backend
 * (/api/groups) las respuestas deben cumplir exactamente estas interfaces.
 */

export type MemberRole = 'ADMIN' | 'MIEMBRO'

export interface GroupMember {
  id: string
  name: string
  avatarUrl: string | null
  role: MemberRole
  habit: string
  /** Días cumplidos del periodo actual */
  daysCompleted: number
  /** Días transcurridos del periodo actual */
  daysTotal: number
  streak: number
  checkedInToday: boolean
  /** true si este miembro es el usuario que tiene la sesión abierta */
  isCurrentUser: boolean
  isOnline: boolean
}

export type ChatMessageKind = 'user' | 'system'

export interface ChatMessage {
  id: string
  kind: ChatMessageKind
  authorId: string | null
  text: string
  /** ISO 8601 */
  sentAt: string
}

export type ActivityKind = 'check-in' | 'join' | 'streak' | 'alert'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  groupId: string
  text: string
  /** ISO 8601 */
  at: string
}

export interface Group {
  id: string
  name: string
  description: string
  category: string
  inviteCode: string
  /** Color de acento del grupo (hex) */
  color: string
  streak: number
  /** 0 - 100 */
  health: number
  /** % de cumplimiento del equipo en los últimos días cerrados (más antiguo primero, termina en ayer) */
  completionHistory: number[]
  members: GroupMember[]
  messages: ChatMessage[]
}

export interface CreateGroupPayload {
  name: string
  category: string
  habit?: string
  color?: string
  inviteCode?: string
}
