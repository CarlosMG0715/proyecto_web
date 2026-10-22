import { api } from '@/services/api'

export interface RemoteGroup {
  id: string
  name: string
  category: string
  color: string
  inviteCode: string
  memberships: Array<{
    role: 'ADMIN' | 'MIEMBRO'
    user: { id: string; name: string; email: string; characterId: string; themeId: string }
  }>
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
    return data.groups
  },
  async create(payload: { name: string; category: string; color: string }) {
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
