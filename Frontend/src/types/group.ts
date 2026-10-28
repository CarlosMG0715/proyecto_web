// contratos de grupo, miembro, habito y chat. el dto de express debe respetar estas formas.

export type MemberRole = 'ADMIN' | 'MIEMBRO'

export interface GroupMember {
  // un miembro representa a una cuenta que pertenece al grupo.
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
  // mensaje que el servidor devuelve al cargar o enviar texto al chat.
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
  // objeto principal que consume la vista de detalle y el menu lateral.
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
  habits: GroupHabit[]
  timeZone: string
}

export interface GroupHabit {
  // checks usa el id del usuario como clave para consultar si cumplio y su nota.
  id: string
  name: string
  icon?: string
  description: string | null
  checks: Record<string, { done: boolean; note: string }>
}

export interface CreateGroupPayload {
  // campos que el formulario puede enviar al endpoint de creacion.
  name: string
  category: string
  description?: string
  color?: string
  timeZone?: string
  initialHabit: { name: string; icon: string }
}
