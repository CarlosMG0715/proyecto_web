<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import StreakReminderHeading from '@/components/ui/StreakReminderHeading.vue'
import { api } from '@/services/api'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import { loadNotifications, type NotificationPreferences } from '@/services/notificationService'

const groups = useGroupsStore()
const session = useSessionStore()
const { hours, minutes, seconds, dayKey } = useMidnightCountdown()
const preferences = ref<NotificationPreferences>()
const dialog = ref<HTMLDialogElement | null>(null)
const reminder = ref({ pending: false, risk: false })
const shown = new Set<string>()
const intervals = [
  { minutes: 240, label: '4 horas' }, { minutes: 120, label: '2 horas' },
  { minutes: 60, label: '1 hora' }, { minutes: 30, label: '30 minutos' },
]
const reminderTime = ref('')
interface StreakPoke { id: string; groupId: string; group: { name: string }; sender: { name: string } }
const pokes = ref<StreakPoke[]>([])
const currentPoke = ref<StreakPoke>()
let pokeTimer: number | undefined

async function loadPokes() {
  if (document.hidden) return
  try {
    const { data } = await api.get<StreakPoke[]>('/streak-pokes')
    pokes.value = data
  } catch { /* Se reintenta en la próxima consulta. */ }
}

function pokeKey(id: string) {
  return 'kordia:streak-poke:' + session.currentUser?.id + ':' + dayKey.value + ':' + id
}

function finishReminder() {
  if (!currentPoke.value) return
  const key = pokeKey(currentPoke.value.id)
  shown.add(key)
  try { localStorage.setItem(key, '1') } catch {}
  currentPoke.value = undefined
}
const chatNotice = ref<{ id: string; name: string; color: string; sender: string; preview: string }>()
let chatTimer: number | undefined
const startedAt = Date.now()
let lastMessageTime = startedAt
const activeGroups = computed(() => groups.groups.filter(group =>
  !group.archivedAt && group.members.some(member => member.isCurrentUser && !member.isFallen),
))

function updatePreferences(event: Event) {
  preferences.value = (event as CustomEvent<NotificationPreferences>).detail
  if (!preferences.value.chat || preferences.value.mutedGroups.includes(chatNotice.value?.id ?? '')) chatNotice.value = undefined
}

onMounted(async () => {
  window.addEventListener('kordia:notifications', updatePreferences)
  void loadPokes()
  pokeTimer = window.setInterval(loadPokes, 15000)
  try {
    const saved = await loadNotifications()
    preferences.value ??= saved
  } catch { /* Sin preferencias confirmadas, no mostramos avisos. */ }
  void groups.refreshRemoteGroups()
})
onUnmounted(() => {
  window.removeEventListener('kordia:notifications', updatePreferences)
  window.clearTimeout(chatTimer)
  window.clearInterval(pokeTimer)
})

watch(dayKey, () => { pokes.value = []; void loadPokes() })

watch([preferences, hours, minutes, seconds, dayKey, activeGroups, dialog, pokes], () => {
  const remaining = hours.value * 60 + minutes.value + seconds.value / 60
  const settings = preferences.value
  if (!dialog.value || dialog.value.open || document.hidden) return
  const poke = pokes.value.find(item => {
    const group = activeGroups.value.find(group => group.id === item.groupId)
    if (!group?.members.some(member => member.isCurrentUser && !member.checkedInToday)) return false
    const key = pokeKey(item.id)
    if (shown.has(key)) return false
    try { return localStorage.getItem(key) !== '1' } catch { return true }
  })
  if (poke) {
    currentPoke.value = poke
    dialog.value.showModal()
    return
  }
  const interval = intervals.find(item => remaining <= item.minutes && remaining > item.minutes - 5)
  if (!settings || !interval) return
  const slot = dayKey.value + ':' + interval.minutes

  const withHabits = activeGroups.value.filter(group => group.habits?.length)
  const pending = settings.midnight && withHabits.some(group =>
    group.members.some(member => member.isCurrentUser && !member.checkedInToday))
  const risk = settings.inactivity && withHabits.some(group =>
    group.streak > 0 && group.members.some(member => !member.isCurrentUser && !member.isFallen && !member.checkedInToday))
  const key = 'kordia:daily-reminder:' + session.currentUser?.id
  const types = [pending ? 'pending' : '', risk ? 'risk' : ''].filter(Boolean)
  let remembered: string[] = []
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (saved?.day === slot && Array.isArray(saved.types)) remembered = saved.types
  } catch { /* La memoria de esta sesión sigue disponible. */ }
  const fresh = types.filter(type => !remembered.includes(type) && !shown.has(slot + type))
  if (!fresh.length) return

  reminderTime.value = interval.label
  reminder.value = { pending: fresh.includes('pending'), risk: fresh.includes('risk') }
  dialog.value.showModal()
  for (const type of fresh) shown.add(slot + type)
  try { localStorage.setItem(key, JSON.stringify({ day: slot, types: [...remembered, ...fresh] })) } catch {}
}, { flush: 'post' })

watch(activeGroups, current => {
  let newest: { id: string; name: string; color: string; sender: string; preview: string } | undefined
  let newestTime = lastMessageTime
  let observedTime = lastMessageTime
  for (const group of current) {
    for (const message of group.messages) {
      const time = Date.parse(message.sentAt)
      if (message.kind !== 'user' || message.authorId === session.currentUser?.id || time <= lastMessageTime || !Number.isFinite(time)) continue
      observedTime = Math.max(observedTime, time)
      if (time <= newestTime || preferences.value?.mutedGroups.includes(group.id)) continue
      newest = {
        id: group.id,
        name: group.name,
        color: group.color,
        sender: group.members.find(member => member.id === message.authorId)?.name ?? 'Tu equipo',
        preview: message.text,
      }
      newestTime = time
    }
  }
  lastMessageTime = observedTime
  if (!newest || !preferences.value?.chat || document.hidden) return
  chatNotice.value = newest
  window.clearTimeout(chatTimer)
  chatTimer = window.setTimeout(() => { chatNotice.value = undefined }, 7000)
})
</script>

<template>
  <dialog ref="dialog" class="streak-reminder-dialog" aria-labelledby="team-reminder-title" @close="finishReminder">
    <StreakReminderHeading
      title-id="team-reminder-title"
      :title="currentPoke || reminder.pending ? 'Recordatorio de racha' : 'La racha de tu equipo está en riesgo'"
    />
    <p v-if="currentPoke"><strong>{{ currentPoke.sender.name }}</strong> te dio un toque para que registres tu aporte de hoy en <strong>{{ currentPoke.group.name }}</strong>.</p>
    <p v-else>Recordatorio de {{ reminderTime }} antes de medianoche.</p>
    <p v-if="!currentPoke && reminder.pending">Tienes aportes pendientes.</p>
    <p v-if="!currentPoke && reminder.risk">Algunos compañeros aún no han registrado su aporte.</p>
    <form method="dialog" class="streak-reminder-actions">
      <button type="submit" :class="currentPoke ? 'streak-reminder-secondary' : 'streak-reminder-primary'">Entendido</button>
      <RouterLink v-if="currentPoke" class="streak-reminder-primary" :to="{ name: 'grupo', params: { groupId: currentPoke.groupId } }" @click="dialog?.close()">Ir al grupo</RouterLink>
    </form>
  </dialog>
  <aside v-if="chatNotice" class="chat-notice" role="status">
    <span class="notice-sparkle" aria-hidden="true">✦</span>
    <RouterLink :to="{ name: 'grupo', params: { groupId: chatNotice.id } }" :style="{ '--notice-color': chatNotice.color }" @click="chatNotice = undefined">
      <span class="notice-icon"><AppIcon name="message" :size="19" /></span>
      <span class="notice-copy"><small>{{ chatNotice.name }}</small><strong>{{ chatNotice.sender }} escribió</strong><span>{{ chatNotice.preview }}</span></span>
      <span class="notice-open">Abrir <b>›</b></span>
    </RouterLink>
    <button class="notice-close" type="button" aria-label="Cerrar aviso" @click="chatNotice = undefined">×</button>
  </aside>
</template>

<style scoped>
.chat-notice{color:#faf0ff}
.chat-notice button{border:0}
.chat-notice{position:fixed;right:22px;bottom:88px;z-index:30;width:min(390px,calc(100vw - 32px));box-sizing:border-box;padding:8px 42px 8px 8px;overflow:hidden;border-radius:19px;background:linear-gradient(120deg,#382746,#241d31 75%);box-shadow:0 16px 44px #09061199;animation:notice-arrive .24s ease-out}
.chat-notice:before{content:'';position:absolute;inset:0 0 auto;height:3px;background:var(--notice-color,#c69bf0)}
.chat-notice>a{position:relative;display:flex;align-items:center;gap:12px;min-height:68px;color:inherit;text-decoration:none}
.notice-icon{display:grid;place-items:center;flex:none;width:46px;height:46px;border-radius:15px;background:color-mix(in srgb,var(--notice-color,#c69bf0) 28%,#2b2037);color:var(--notice-color,#c69bf0)}
.notice-copy{display:grid;gap:3px;min-width:0;flex:1}.notice-copy small{font-size:10px;color:#cdb5df}.notice-copy strong{font-size:13px}.notice-copy>span{overflow:hidden;color:#ddd0e6;font-size:12px;text-overflow:ellipsis;white-space:nowrap}
.notice-open{display:grid;justify-items:center;gap:0;color:#d9baf4;font-size:10px}.notice-open b{font-size:22px;line-height:15px}
.notice-close{position:absolute;top:9px;right:9px;width:26px;height:26px;border-radius:9px!important;background:#ffffff14!important;color:#e8d9f0!important;padding:0!important;font-size:18px}
.notice-sparkle{position:absolute;top:9px;right:45px;color:#f4d791;font-size:13px}
@keyframes notice-arrive{from{opacity:0;transform:translateY(9px) scale(.98)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.chat-notice{animation:none}}
</style>
