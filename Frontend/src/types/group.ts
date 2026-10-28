export type MemberRole = 'ADMIN' | 'MIEMBRO'

export interface GroupMember {
  id: string
  name: string
  avatarUrl: string | null
  role: MemberRole
  habit: string
  daysCompleted: number
  daysTotal: number
  streak: number
  checkedInToday: boolean
  isCurrentUser: boolean
  isOnline: boolean
  characterId?: string
  themeId?: string
}

export type ChatMessageKind = 'user' | 'system'

export interface ChatMessage {
  id: string
  kind: ChatMessageKind
  authorId: string | null
  text: string
  sentAt: string
}

export type ActivityKind = 'check-in' | 'join' | 'streak' | 'alert'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  groupId: string
  text: string
  at: string
}

export interface GroupHabit {
  id: string
  name: string
  icon?: string
  description: string | null
  checks: Record<string, { done: boolean; note: string }>
}

export interface Group {
  id: string
  name: string
  description: string
  category: string
  inviteCode: string
  color: string
  streak: number
  health: number
  completionHistory: number[]
  members: GroupMember[]
  messages: ChatMessage[]
  habits?: GroupHabit[]
  timeZone?: string
}

export interface CreateGroupPayload {
  name: string
  category: string
  habit?: string
  color?: string
  inviteCode?: string
  description?: string
  timeZone?: string
  initialHabit?: { name: string; icon: string }
}
