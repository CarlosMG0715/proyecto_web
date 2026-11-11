import { api } from '@/services/api'

export const notificationDefaults = { midnight: true, email: false, chat: true, inactivity: true, mutedGroups: [] as string[] }
export type NotificationPreferences = typeof notificationDefaults

export async function loadNotifications() {
  const { data } = await api.get<NotificationPreferences>('/auth/notifications')
  return data
}

export async function saveNotifications(preferences: NotificationPreferences) {
  const { data } = await api.put<NotificationPreferences>('/auth/notifications', preferences)
  window.dispatchEvent(new CustomEvent('kordia:notifications', { detail: data }))
  return data
}
