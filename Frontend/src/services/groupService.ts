import { api } from '@/services/api'

export interface RemoteGroup {
  id: string
  name: string
  description?: string
  category: string
  color: string
  inviteCode: string
  memberships: Array<{
    role: 'ADMIN' | 'MIEMBRO'
    user: { id: string; name: string; email: string; characterId: string; themeId: string }
  }>
  members?: Array<{
    id: string; name: string; role: 'ADMIN' | 'MIEMBRO'; characterId?: string; themeId?: string
    habit?: string; daysCompleted?: number; daysTotal?: number; streak?: number; checkedInToday?: boolean; isCurrentUser?: boolean; isOnline?: boolean
  }>
  streak?: number
  health?: number
  completionHistory?: number[]
  messages?: Array<{ id: string; kind: 'user' | 'system'; authorId: string | null; text: string; sentAt: string }>
  habits?: Array<{ id: string; name: string; icon?: string; description: string | null; checks: Record<string, { done: boolean; note: string }> }>
  timeZone?: string
}

export interface JoinRequest {
  id: string
  createdAt: string
  group: { id: string; name: string; inviteCode?: string }
  requester: { id: string; name: string; email: string; characterId: string }
}

export const groupService = {
  async list() {
    const { data } = await api.get<{ groups: RemoteGroup[] }>('/groups')
    return data.groups.map((group) => {
      if (group.memberships) return group
      return {
        ...group,
        memberships: (group.members ?? []).map((member) => ({
          role: member.role,
          user: {
            id: member.id,
            name: member.name,
            email: '',
            characterId: member.characterId ?? 'sprout',
            themeId: member.themeId ?? 'sprout',
          },
        })),
      }
    })
  },
  async create(payload: { name: string; category: string; color: string; initialHabit: { name: string; icon: string } }) {
    const { data } = await api.post<{ group: RemoteGroup }>('/groups', payload)
    return data.group
  },
  async requestJoin(inviteCode: string) {
    const { data } = await api.post<{ request: { id: string }; group: { id: string; name: string }; alreadyPending?: boolean }>(
      '/groups/join-requests', { inviteCode },
    )
    return data
  },
  async inbox() {
    const { data } = await api.get<{ requests: JoinRequest[] }>('/groups/join-requests/inbox')
    return data.requests
  },
  async decide(requestId: string, action: 'ACCEPTED' | 'REJECTED') {
    return api.patch(`/groups/join-requests/${requestId}`, { action })
  },
}
