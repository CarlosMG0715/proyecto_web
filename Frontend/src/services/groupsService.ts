// capa http de grupos: cada funcion conoce una url y el tipo de respuesta esperado.
import { api } from '@/services/api'
import type { CreateGroupPayload, Group, GroupHabit, ChatMessage } from '@/types/group'

export async function fetchMyGroups(): Promise<Group[]> {
  // trae los grupos donde la persona tiene membresia.
  const { data } = await api.get<{ groups: Group[] }>('/groups')
  return data.groups
}

export async function fetchCheckInHistory(): Promise<string[]> {
  // trae las fechas persistidas para dibujar el calendario personal.
  const { data } = await api.get<{ dates: string[] }>('/groups/history')
  return data.dates
}

export async function createGroupRequest(payload: CreateGroupPayload): Promise<Group> {
  // crea el grupo; el servidor genera el codigo de invitacion y agrega al admin.
  const { data } = await api.post<{ group: Group }>('/groups', payload)
  return data.group
}

export async function joinGroupRequest(inviteCode: string): Promise<Group> {
  // intenta unirse usando el codigo escrito en el modal.
  const { data } = await api.post<{ group: Group }>('/groups/join', { inviteCode })
  return data.group
}

export async function fetchGroup(groupId: string): Promise<Group> {
  // trae el detalle del grupo, incluso si se abre un enlace directo.
  const { data } = await api.get<{ group: Group }>(`/groups/${groupId}`)
  return data.group
}

export async function updateGroupRequest(groupId: string, updates: { name?: string; category?: string; description?: string; color?: string }): Promise<Group> {
  const { data } = await api.patch<{ group: Group }>(`/groups/${groupId}`, updates)
  return data.group
}

export async function leaveGroupRequest(groupId: string): Promise<{ groupId: string; groupDeleted: boolean; groupArchived?: boolean; promotedMemberId: string | null }> {
  const { data } = await api.delete<{ groupId: string; groupDeleted: boolean; groupArchived?: boolean; promotedMemberId: string | null }>(`/groups/${groupId}/membership`)
  return data
}

export async function createHabitRequest(groupId: string, name: string, icon: string): Promise<GroupHabit> {
  // solicita crear un habito; el backend verifica que quien lo pide sea admin.
  const { data } = await api.post<{ habit: GroupHabit }>(`/groups/${groupId}/habits`, { name, icon })
  return data.habit
}

export async function updateHabitRequest(groupId: string, habitId: string, updates: { name: string; icon: string }): Promise<GroupHabit> {
  // envia los cambios del habito; el servidor limita esta operacion a administradores.
  const { data } = await api.patch<{ habit: GroupHabit }>(`/groups/${groupId}/habits/${habitId}`, updates)
  return data.habit
}

export async function deleteHabitRequest(groupId: string, habitId: string): Promise<void> {
  await api.delete(`/groups/${groupId}/habits/${habitId}`)
}

export async function toggleCheckInRequest(groupId: string, habitId: string, note: string): Promise<{ done: boolean; note: string }> {
  // alterna el check-in de hoy y devuelve el estado que quedo guardado.
  const { data } = await api.put<{ done: boolean; note: string }>(`/groups/${groupId}/habits/${habitId}/check-in`, { note })
  return data
}

export async function saveCheckInNoteRequest(groupId: string, habitId: string, note: string): Promise<void> {
  // actualiza la nota del check-in que ya existe para hoy.
  await api.put(`/groups/${groupId}/habits/${habitId}/check-in/note`, { note })
}

export async function sendGroupMessageRequest(groupId: string, content: string): Promise<ChatMessage> {
  // envia el mensaje para guardarlo y recibe el registro creado.
  const { data } = await api.post<{ message: ChatMessage }>(`/groups/${groupId}/messages`, { content })
  return data.message
}
