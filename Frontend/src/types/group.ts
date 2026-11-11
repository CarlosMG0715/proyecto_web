export type MemberRole = 'ADMIN' | 'MIEMBRO'

export interface DailyCheckReport {
  habitIds: string[]
  note: string
  energy: number
}

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
  dailyReport?: DailyCheckReport | null
  isFallen?: boolean
  fallenAt?: string | null
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
  habitId?: string
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
  joined?: boolean
  id: string
  name: string
  icon?: string
  description: string | null
  targetDays: 30 | 90 | 120
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
  targetDays?: 30 | 90 | 120 | null
  archivedAt?: string | null
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
