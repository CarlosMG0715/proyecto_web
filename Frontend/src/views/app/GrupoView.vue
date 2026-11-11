<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import AdventureCharacter from '@/components/ui/AdventureCharacter.vue'
import AdventureTombstone from '@/components/ui/AdventureTombstone.vue'
import streakLostBanner from '@/assets/Racha perdida.png'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import StreakReminderHeading from '@/components/ui/StreakReminderHeading.vue'
import PokePaw from '@/components/ui/PokePaw.vue'
import GroupChat from '@/components/group/GroupChat.vue'
import { groupService } from '@/services/groupService'
import { api } from '@/services/api'
import { useCreateGroupModal } from '@/composables/useCreateGroupModal'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import { useGroupsStore } from '@/stores/groups'
import { GROUP_CATEGORIES } from '@/constants/groupCategories'
import { GROUP_BANNER_THEMES, getGroupBannerTheme } from '@/constants/groupBanners'
import { getThemeBackground } from '@/constants/themeBackgrounds'
import { useCharacterStore } from '@/stores/characters'
import { useSessionStore } from '@/stores/session'
import type { GroupHabit, GroupMember } from '@/types/group'
import '@/assets/styles/game-views.css'

const route = useRoute()
const router = useRouter()
const createGroup = useCreateGroupModal()
const store = useGroupsStore()
const characters = useCharacterStore()
const session = useSessionStore()
const { hours, minutes, seconds, dayKey } = useMidnightCountdown()
const countdownMinutes = computed(() => hours.value * 60 + minutes.value)
const countdownUrgency = computed(() => {
  if (me.value?.isFallen || !me.value) return 'calm'
  if (me.value.checkedInToday) return 'complete'
  if (countdownMinutes.value <= 60) return 'urgent'
  if (countdownMinutes.value <= 180) return 'warning'
  return 'calm'
})

const group = computed(() => store.groupById(String(route.params.groupId)))
const selectedId = ref('')
const selectedMember = computed(
  () =>
    group.value?.members.find((m) => m.id === selectedId.value) ??
    group.value?.members.find((m) => m.isCurrentUser) ??
    group.value?.members[0],
)
const me = computed(() => group.value?.members.find((m) => m.isCurrentUser))
const teammates = computed(() => group.value?.members.filter(member => !member.isCurrentUser) ?? [])
const scenePage = ref(0)
const teammatesPerPage = 2
const lastScenePage = computed(() => Math.max(0, Math.ceil(teammates.value.length / teammatesPerPage) - 1))
const sceneMembers = computed(() => {
  const start = scenePage.value * teammatesPerPage
  const page = teammates.value.slice(start, start + teammatesPerPage)
  return me.value ? [me.value, ...page] : page
})
watch(() => group.value?.id, () => { scenePage.value = 0 })
watch(lastScenePage, last => { scenePage.value = Math.min(last, scenePage.value) })

const celebrationMembers = computed(() => [
  ...(me.value ? [me.value] : []),
  ...teammates.value.filter(member => !member.isFallen),
].slice(0, 5))

const isAdmin = computed(() => !group.value?.archivedAt && me.value?.role === 'ADMIN' && !me.value.isFallen)
const adminCandidates = computed(() => me.value?.isFallen && me.value.role === 'ADMIN'
  ? group.value?.members.filter(member => !member.isFallen && member.role !== 'ADMIN') ?? []
  : [])
const promotingAdmin = ref(false)
const promotionNotice = ref('')

async function promoteFromTomb(memberId: string) {
  const current = group.value
  if (!current || promotingAdmin.value || !adminCandidates.value.some(member => member.id === memberId)) return
  promotingAdmin.value = true
  promotionNotice.value = ''
  try {
    await store.setGroupMemberRole(current.id, memberId, 'ADMIN')
    promotionNotice.value = 'Ya hay otro admin que puede aprobar tu regreso.'
  } catch {
    promotionNotice.value = 'No pudimos nombrar al admin. Intenta de nuevo.'
  } finally {
    promotingAdmin.value = false
  }
}
const fallenMembers = computed(() => group.value?.members.filter((member) => member.isFallen) ?? [])
const penaltyDialog = ref<HTMLDialogElement | null>(null)
const penaltyNames = ref<string[]>([])
const shownPenalties = new Set<string>()
function showGroupPenalty() {
  const dialog = penaltyDialog.value
  const user = session.currentUser
  const current = group.value
  if (!dialog || dialog.open || !user || !current || !me.value || me.value.isFallen || current.archivedAt) return
  const notices = fallenMembers.value.map(member => ({
    name: nameOf(member),
    key: `kordia:penalty:${user.id}:${current.id}:${member.id}:${member.fallenAt}`,
  })).filter(({ key }) => {
    if (shownPenalties.has(key)) return false
    try { return !localStorage.getItem(key) } catch { return true }
  })
  if (!notices.length) return
  penaltyNames.value = notices.map(notice => notice.name)
  dialog.showModal()
  for (const { key } of notices) {
    shownPenalties.add(key)
    try { localStorage.setItem(key, '1') } catch { /* El aviso ya se mostró en esta pestaña. */ }
  }
}
watch([penaltyDialog, fallenMembers, me], showGroupPenalty, { flush: 'post' })

async function reviveMember(memberId: string) {
  if (!group.value || !isAdmin.value) return
  try {
    await api.post(`/groups/${group.value.id}/members/${memberId}/revive`)
    await store.refreshRemoteGroups()
    notice.value = 'El personaje volvió a la aventura.'
  } catch {
    notice.value = 'No pudimos revivir al personaje. Actualiza el grupo e inténtalo de nuevo.'
  }
}
const nameOf = (m: { name: string; isCurrentUser: boolean }) =>
  m.isCurrentUser ? session.currentUser?.name ?? m.name : m.name
const done = computed(() => group.value?.members.filter((m) => m.checkedInToday).length ?? 0)
const teamCelebration = ref<HTMLDialogElement | null>(null)
const celebratedGoal = ref<number | null>(null)
const celebrationKeys = new Set<string>()
watch([group, teamCelebration], ([current, dialog]) => {
  if (!current || !dialog || current.archivedAt || dialog.open) return
  if (!current.members.some((member) => member.isCurrentUser && !member.isFallen)) return
  const goal = missionDays.value
  const goalKey = `kordia:group-goal:${session.currentUser?.id}:${current.id}:${goal}`
  if (current.streak >= goal && !celebrationKeys.has(goalKey)) {
    let alreadyShown = false
    try { alreadyShown = localStorage.getItem(goalKey) === '1' } catch { /* Usa el estado de la vista. */ }
    celebrationKeys.add(goalKey)
    if (!alreadyShown) {
      celebratedGoal.value = goal
      dialog.showModal()
      try { localStorage.setItem(goalKey, '1') } catch { /* El aviso ya se mostró. */ }
      return
    }
  }
  if (current.members.length < 2 || current.streak === goal) return
  if (!current.members.every((member) => member.checkedInToday && !member.isFallen)) return
  const day = new Intl.DateTimeFormat('es-CO', { timeZone: current.timeZone ?? 'America/Bogota', dateStyle: 'short' }).format()
  const key = `kordia:team-check:${session.currentUser?.id}:${current.id}:${day}`
  if (celebrationKeys.has(key) || dialog.open) return
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // La celebración también funciona cuando el navegador bloquea el almacenamiento.
  }
  celebrationKeys.add(key)
  celebratedGoal.value = null
  dialog.showModal()
}, { flush: 'post' })
const energy = computed(() => group.value?.members.reduce((total, member) =>
  total + (member.checkedInToday ? member.dailyReport?.energy ?? 1 : 0), 0) ?? 0)
const habitIds = ref<string[]>([])
const dailyNote = ref('')
const missionHabits = computed(() => group.value?.habits ?? [])
const selectedHabits = computed(() => missionHabits.value.filter((habit) => habitIds.value.includes(habit.id)))
watch(() => group.value?.id, () => {
  habitIds.value = []
  dailyNote.value = ''
})
const missionDays = computed<30 | 90 | 120>(() => {
  if (group.value?.targetDays) return group.value.targetDays
  const days = Math.max(...(group.value?.habits ?? []).map((habit) => habit.targetDays), 30)
  return days >= 120 ? 120 : days >= 90 ? 90 : 30
})
const missionRank = computed(() => ({
  30: { name: 'Expedición', icon: 'flag' as const, copy: 'Una ruta corta para fortalecer al equipo.' },
  90: { name: 'Gran travesía', icon: 'globe' as const, copy: 'Un recorrido largo que exige constancia.' },
  120: { name: 'Aventura legendaria', icon: 'trophy' as const, copy: 'La campaña más difícil del valle.' },
}[missionDays.value]))

const isChatOpen = ref(false)
const isRosterOpen = ref(false)
watch(() => route.params.groupId, () => {
  isRosterOpen.value = false
  isChatOpen.value = false
})
/** true = Chat grande slideado al lado derecho; false = Chat minimizado como estaba abajo */
const isChatExpanded = ref(true)
const editing = ref(false)
const editingGroup = ref(false)
const confirmingLeave = ref(false)
const draft = ref('')
const habitIconDraft = ref('target')
const habitDescriptionDraft = ref('')
const editingHabitId = ref<string | null>(null)
const groupNameDraft = ref('')
const groupCategoryDraft = ref('')
const groupDescriptionDraft = ref('')
const groupColorDraft = ref('#ec4899')
const activeBannerTheme = computed(() => getGroupBannerTheme(group.value?.color))
const draftBannerTheme = computed(() => getGroupBannerTheme(groupColorDraft.value))
const lifeTokenKind = computed<'mushroom' | 'star' | 'sun' | 'flame' | 'heart'>(() => {
  const bannerId = activeBannerTheme.value.id
  if (bannerId === 'green') return 'mushroom'
  if (bannerId === 'blue' || bannerId === 'purple') return 'star'
  if (bannerId === 'amber') return 'sun'
  if (bannerId === 'red') return 'flame'
  return 'heart'
})
const activeGroupIcon = computed(() => GROUP_CATEGORIES.find((category) => category.label === group.value?.category)?.icon ?? 'target')
const groupCategoryIcon = computed(
  () => GROUP_CATEGORIES.find((category) => category.label === groupCategoryDraft.value)?.icon ?? 'target',
)
const saving = ref(false)
const notice = ref('')
const pokeFeedback = ref('')
const pokeSending = ref(false)
const sentPokes = ref(new Set<string>())
const pokeDialog = ref<HTMLDialogElement>()
const memberPanel = ref<HTMLElement>()
const pokeTarget = ref<{ id: string; name: string }>()
function canPokeMember(member: GroupMember | undefined) {
  return !!(group.value?.habits?.length && !group.value.archivedAt && me.value && !me.value.isFallen
    && member && !member.isCurrentUser && !member.isFallen && !member.checkedInToday)
}
const canPoke = computed(() => canPokeMember(selectedMember.value))

async function selectCharacter(memberId: string) {
  selectedId.value = memberId
  if (me.value?.id === memberId) return
  await nextTick()
  memberPanel.value?.scrollIntoView({ block: 'nearest' })
}

function openPokeDialog(member: GroupMember | undefined) {
  if (!member || !canPokeMember(member) || sentPokes.value.has(pokeKey(member.id))) return
  pokeFeedback.value = ''
  pokeTarget.value = { id: member.id, name: nameOf(member) }
  pokeDialog.value?.showModal()
}

watch(() => group.value?.id, () => pokeDialog.value?.close())

function pokeKey(memberId: string) {
  return dayKey.value + ':' + group.value?.id + ':' + memberId
}

async function givePoke(memberId: string) {
  if (!group.value || pokeSending.value) return
  const key = pokeKey(memberId)
  pokeSending.value = true
  pokeFeedback.value = ''
  try {
    await api.post('/groups/' + group.value.id + '/members/' + memberId + '/streak-poke')
    sentPokes.value.add(key)
    pokeFeedback.value = '¡Toque enviado!'
  } catch (error) {
    pokeFeedback.value = (error as { response?: { data?: { error?: string } } }).response?.data?.error
      ?? 'No pudimos enviar el toque.'
  } finally {
    pokeSending.value = false
  }
}
const codeCopied = ref(false)
const copyError = ref(false)
let copyReset: number | undefined

async function copyGroupCode() {
  if (!group.value) return
  window.clearTimeout(copyReset)
  codeCopied.value = false
  copyError.value = false
  try {
    await navigator.clipboard.writeText(group.value.inviteCode)
    codeCopied.value = true
    copyReset = window.setTimeout(() => { codeCopied.value = false }, 2000)
  } catch {
    copyError.value = true
  }
}
onUnmounted(() => window.clearTimeout(copyReset))

const pending = computed(() => group.value?.members.filter((m) => !m.isFallen && !m.checkedInToday) ?? [])
const returnNotice = ref('')
const requestingReturn = ref(false)

async function requestReturn() {
  if (!group.value || requestingReturn.value) return
  requestingReturn.value = true
  try {
    await groupService.requestJoin(group.value.inviteCode)
    returnNotice.value = 'Tu solicitud está pendiente de aprobación.'
  } catch (error) {
    returnNotice.value = (error as { response?: { data?: { error?: string } } })
      .response?.data?.error ?? 'No pudimos enviar la solicitud. Intenta de nuevo.'
  } finally {
    requestingReturn.value = false
  }
}

watch(() => group.value?.id, () => { returnNotice.value = '' })
watch(countdownMinutes, (current, previous) => {
  if (current > previous) void store.refreshRemoteGroups()
})

let returnRefreshTimer: number | undefined
onMounted(() => {
  void store.refreshRemoteGroups()
  returnRefreshTimer = window.setInterval(() => {
    if (!document.hidden) void store.refreshRemoteGroups()
  }, 30000)
})
onUnmounted(() => window.clearInterval(returnRefreshTimer))
const healthHearts = computed(() => {
  const health = group.value?.health ?? 0
  const alive = Math.ceil(health / 20)
  return Array.from({ length: 5 }, (_, index) => ({
    index,
    alive: health >= (index + 1) * 20,
    threatened: pending.value.length > 0 && index < alive && index >= Math.max(0, alive - pending.value.length),
  }))
})
const alert = computed(() =>
  pending.value.length
    ? `Pendientes: ${pending.value.map(nameOf).join(', ')}. Cierre a medianoche.`
    : 'Equipo completo: todos registraron su hábito hoy.',
)
const lastMessage = computed(() =>
  group.value?.messages.filter((m) => m.authorId === selectedMember.value?.id).at(-1),
)
const milestones = computed(() => {
  if (missionDays.value === 120) return [1, 14, 30, 60, 120]
  if (missionDays.value === 90) return [1, 7, 30, 60, 90]
  return [1, 3, 7, 14, 30]
})
const habitIcons = ['target', 'flame', 'globe', 'heart', 'activity', 'moon', 'code', 'monitor', 'shield', 'trophy', 'flag', 'message'] as const
const habitIconMap: Record<string, (typeof habitIcons)[number]> = {
  '🎯': 'target', '🔥': 'flame', '📚': 'globe', '💧': 'heart', '🏃': 'activity', '🧘': 'moon',
  '🌱': 'globe', '🎨': 'target', '💤': 'moon', '💪': 'activity', '🎵': 'message', '✨': 'trophy',
}
function habitIconName(icon?: string) {
  if (habitIcons.includes(icon as (typeof habitIcons)[number])) return icon as (typeof habitIcons)[number]
  return habitIconMap[icon ?? ''] ?? 'target'
}

watch(
  () => group.value?.id,
  () => {
    selectedId.value = ''
    editing.value = false
    confirmingLeave.value = false
    notice.value = ''
  },
)

const isCheckingIn = ref(false)
async function toggle() {
  if (!group.value || !me.value || isCheckingIn.value) return
  const groupId = group.value.id
  isCheckingIn.value = true
  notice.value = ''
  try {
    const result = await store.toggleMyCheckIn(groupId, selectedHabits.value.map((habit) => habit.id), dailyNote.value)
    if (group.value?.id !== groupId) return
    notice.value = result.done ? `¡Sumaste ${result.report?.energy ?? 1} de energía al equipo!` : 'Aporte diario retirado'
  } catch (error) {
    if (group.value?.id === groupId) {
      notice.value = error instanceof Error ? error.message : 'No se pudo guardar el aporte.'
    }
  } finally {
    isCheckingIn.value = false
  }
}

function openEditor(habit?: GroupHabit) {
  notice.value = ''
  draft.value = habit?.name ?? ''
  habitIconDraft.value = habitIconName(habit?.icon)
  habitDescriptionDraft.value = habit?.description ?? ''
  editingHabitId.value = habit?.id ?? null
  editing.value = true
}

async function saveHabit() {
  if (!group.value || !draft.value.trim() || !isAdmin.value) return
  saving.value = true
  try {
    if (editingHabitId.value) {
      await store.editGroupHabit(
        group.value.id,
        editingHabitId.value,
        draft.value.trim(),
        habitDescriptionDraft.value.trim(),
        habitIconDraft.value,
      )
    } else {
      await store.createGroupHabit(
        group.value.id,
        draft.value.trim(),
        habitIconDraft.value,
        habitDescriptionDraft.value.trim(),
      )
    }
    editing.value = false
    editingHabitId.value = null
  } catch {
    notice.value = store.error ?? 'No se pudo guardar el hábito.'
  } finally {
    saving.value = false
  }
}

async function removeHabit(habitId: string, habitName: string) {
  if (!group.value || !isAdmin.value || !window.confirm(`¿Quitar “${habitName}” del grupo?`)) return
  try {
    await store.removeGroupHabit(group.value.id, habitId)
  } catch {
    notice.value = store.error ?? 'No se pudo quitar el hábito.'
  }
}

async function toggleMemberRole(member: NonNullable<typeof selectedMember.value>) {
  if (!group.value || !isAdmin.value || member.isCurrentUser) return
  const nextRole = member.role === 'ADMIN' ? 'MIEMBRO' : 'ADMIN'
  try {
    await store.setGroupMemberRole(group.value.id, member.id, nextRole)
    notice.value = nextRole === 'ADMIN' ? `${nameOf(member)} ahora administra el grupo.` : `Se quitó el rol admin de ${nameOf(member)}.`
  } catch {
    notice.value = store.error ?? 'No se pudo cambiar el rol.'
  }
}

async function removeMember(member: NonNullable<typeof selectedMember.value>) {
  if (!group.value || !isAdmin.value || member.isCurrentUser) return
  if (!window.confirm(`¿Sacar a ${nameOf(member)} del grupo?`)) return
  try {
    await store.removeGroupMember(group.value.id, member.id)
    selectedId.value = ''
    notice.value = `${nameOf(member)} salió del grupo.`
  } catch {
    notice.value = store.error ?? 'No se pudo quitar a esta persona.'
  }
}

function openGroupEditor() {
  notice.value = ''
  if (!group.value) return
  selectedId.value = me.value?.id ?? ''
  groupNameDraft.value = group.value.name
  groupCategoryDraft.value = group.value.category
  groupDescriptionDraft.value = group.value.description
  groupColorDraft.value = group.value.color
  editingGroup.value = true
}

async function saveGroup() {
  if (!group.value || !isAdmin.value || groupNameDraft.value.trim().length < 3) return
  saving.value = true
  try {
    await store.updateGroup(group.value.id, {
      name: groupNameDraft.value.trim(),
      category: groupCategoryDraft.value.trim() || 'General',
      description: groupDescriptionDraft.value.trim(),
      color: groupColorDraft.value,
    })
    editingGroup.value = false
  } catch {
    notice.value = store.error ?? 'No se pudieron guardar los datos del grupo.'
  } finally {
    saving.value = false
  }
}

async function send(text: string) {
  if (!group.value) return
  try {
    await store.sendMessage(group.value.id, text)
  } catch {
    notice.value = store.error ?? 'No se pudo enviar el mensaje.'
  }
}

async function handleLeaveGroup() {
  if (!group.value) return
  const id = group.value.id
  try {
    await store.leaveGroup(id)
    confirmingLeave.value = false
    await router.push({ name: 'inicio' })
  } catch {
    notice.value = store.error ?? 'No se pudo salir del grupo.'
  }
}
</script>

<template>
  <div v-if="group" class="adventure-page" :style="{ '--group-accent': activeBannerTheme.color, '--group-section-banner': `url('${activeBannerTheme.sectionBannerUrl}')`, '--group-window-banner': `url('${activeBannerTheme.windowBannerUrl}')`, '--theme-accent': activeBannerTheme.color }">
    <dialog ref="pokeDialog" class="streak-reminder-dialog" aria-labelledby="send-poke-title" @cancel="pokeSending && $event.preventDefault()">
      <StreakReminderHeading title="Recordatorio de racha" title-id="send-poke-title" />
      <template v-if="pokeTarget">
        <p>Recuérdale a <strong>{{ pokeTarget.name }}</strong> que aún puede registrar su aporte de hoy.</p>
        <p v-if="pokeFeedback" role="status">{{ pokeFeedback }}</p>
        <div class="streak-reminder-actions">
          <button type="button" class="streak-reminder-secondary" :disabled="pokeSending" @click="pokeDialog?.close()">
            {{ sentPokes.has(pokeKey(pokeTarget.id)) ? 'Listo' : 'Cancelar' }}
          </button>
          <button v-if="!sentPokes.has(pokeKey(pokeTarget.id))" type="button" class="streak-reminder-primary" :disabled="pokeSending" @click="givePoke(pokeTarget.id)">
            <PokePaw />{{ pokeSending ? 'Enviando…' : 'Dar toque' }}
          </button>
        </div>
      </template>
    </dialog>
    <dialog v-if="!group.archivedAt && me && !me.isFallen" ref="penaltyDialog" class="penalty-dialog streak-loss-dialog" aria-labelledby="penalty-title" @close="showGroupPenalty">
      <img class="streak-loss-banner" :src="streakLostBanner" alt="" />
      <h2 id="penalty-title">Racha del grupo perdida</h2>
      <p>{{ penaltyNames.join(', ') }} {{ penaltyNames.length === 1 ? 'no registró' : 'no registraron' }} el aporte a tiempo.</p>
      <p>La racha del equipo volvió a cero. El admin puede revivir o expulsar a los personajes caídos.</p>
      <form method="dialog"><button class="game-button">Entendido</button></form>
    </dialog>
    <dialog v-if="!group.archivedAt" ref="teamCelebration" class="penalty-dialog team-celebration" aria-labelledby="team-celebration-title">
      <div class="team-celebration-characters">
        <div v-for="member in celebrationMembers" :key="member.id" class="team-celebration-member">
          <AdventureCharacter :character="characters.forMember(member.id, member.isCurrentUser, member.name)" :size="58" complete />
          <span v-if="member.isCurrentUser" class="own-avatar-label">Tú</span>
        </div>
      </div>
      <h2 id="team-celebration-title">{{ celebratedGoal ? '¡Meta alcanzada!' : '¡Lo lograron, equipo!' }}</h2>
      <p v-if="celebratedGoal">¡Felicidades por {{ celebratedGoal }} días de racha! La aventura continúa.</p>
      <p v-else>Todos registraron su aporte de hoy.</p>
      <form method="dialog"><button class="game-button">¡A seguir así!</button></form>
    </dialog>
    <section v-if="group.archivedAt" class="archived-adventure" aria-labelledby="archived-title">
      <div class="archived-scene">
        <AdventureTombstone :size="200" />
        <span>{{ me ? nameOf(me) : group.name }}</span>
      </div>
      <div class="archived-copy">
        <h1 id="archived-title">Aventura cerrada</h1>
        <p>Todo el equipo cayó en <strong>{{ group.name }}</strong>. Crea un grupo nuevo para volver a jugar.</p>
        <button type="button" class="game-button" @click="createGroup.openReplacement(group.id)">Crear un grupo nuevo</button>
      </div>
    </section>
    <section v-else-if="me?.isFallen" class="archived-adventure" aria-labelledby="fallen-title">
      <div class="archived-scene"><AdventureTombstone :size="160" /><span>{{ nameOf(me) }}</span></div>
      <div class="archived-copy">
        <h1 id="fallen-title">Tu personaje cayó</h1>
        <p>Un admin puede aprobar tu regreso a {{ group.name }}.</p>
        <div v-if="adminCandidates.length" class="fallen-actions">
          <button v-for="member in adminCandidates" :key="member.id" type="button" class="game-button"
            :disabled="promotingAdmin" @click="promoteFromTomb(member.id)">Nombrar admin a {{ member.name }}</button>
        </div>
        <p v-if="promotionNotice" role="status">{{ promotionNotice }}</p>
        <button type="button" class="game-button" :disabled="requestingReturn" @click="requestReturn">
          {{ requestingReturn ? 'Enviando…' : 'Solicitar volver' }}
        </button>
        <p v-if="returnNotice" role="status">{{ returnNotice }}</p>
      </div>
    </section>
    <div v-else class="adventure-wrap" :class="{ 'with-side-chat': isChatOpen && isChatExpanded }">
      <header class="adventure-header" :style="{ '--header-banner': `url('${activeBannerTheme.bannerUrl}')`, '--header-banner-filter': activeBannerTheme.filter ?? 'none', '--header-accent': activeBannerTheme.color }">
        <div class="header-identity">
          <div class="header-shortcuts">
            <RouterLink :to="{ name: 'inicio' }" class="back">
              <AppIcon name="chevron-left" :size="15" />Inicio
            </RouterLink>
          </div>
          <div class="group-brand-row">
            <button type="button" class="group-header-emblem" :class="{ editable: isAdmin }" :style="{ '--emblem-color': group.color }" :title="isAdmin ? 'Editar información del grupo' : group.category" @click="isAdmin && openGroupEditor()">
              <AppIcon :name="activeGroupIcon" :size="24" />
            </button>
            <div class="group-brand-copy">
              <div class="group-brand-meta">
                <span class="group-category-tag">{{ group.category || 'General' }}</span>
              </div>
              <h1>{{ group.name }}</h1>
              <p v-if="group.description" class="group-brand-desc">{{ group.description }}</p>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button
            v-if="!group.archivedAt"
            type="button"
            class="invite-badge"
            :aria-label="`Copiar código de invitación ${group.inviteCode}`"
            @click="copyGroupCode"
          >
            <span class="invite-copy-icon"><AppIcon :name="codeCopied ? 'check' : 'copy'" :size="20" /></span>
            <span class="invite-copy-text">
              <span class="invite-label" aria-live="polite">{{ codeCopied ? '¡Copiado!' : 'Copiar invitación' }}</span>
              <strong>{{ group.inviteCode }}</strong>
            </span>
          </button>
          <input v-if="copyError" class="invite-fallback" :value="group.inviteCode" readonly
            aria-label="Código de invitación para copiar manualmente" @focus="($event.target as HTMLInputElement).select()" />

          <button
            v-if="!group.archivedAt"
            type="button"
            class="game-button secondary chat-toggle"
            :aria-expanded="isChatOpen"
            @click="isChatOpen = !isChatOpen"
          >
            <AppIcon name="message" :size="16" />
            {{ isChatOpen ? 'Ocultar chat' : 'Abrir chat' }}
          </button>

          <button v-if="isAdmin" type="button" class="game-button secondary edit-group-trigger" @click="openGroupEditor">
            <AppIcon name="settings" :size="15" />Editar grupo
          </button>

          <button
            type="button"
            class="leave-btn"
            title="Salir de este grupo"
            @click="notice = ''; confirmingLeave = true"
          >
            <AppIcon name="logout" :size="15" />
            <span>Salir del grupo</span>
          </button>
        </div>
      </header>

      <!-- Cuerpo principal: si el chat está en modo Grande Lateral, divide pantalla completa -->
      <div class="adventure-body group-columns" :class="{ 'side-chat-active': isChatOpen && isChatExpanded, 'roster-open': isRosterOpen }">
        <div class="adventure-main-col">
          <section
            class="world"
            :style="{
              '--sky': characters.theme.sky,
              '--mountain': characters.theme.mountain,
              '--grass': characters.theme.grass,
              '--world-bg': `url('${getThemeBackground(characters.theme.id)}')`,
            }"
            aria-label="Escenario de aventura del equipo"
          >
            <div class="world-hud">
              <span class="world-streak">
                <StreakFlame :size="49" />
                <span><strong>{{ group.streak }} {{ group.streak === 1 ? 'día' : 'días' }}</strong><small>de racha</small></span>
              </span>
            </div>

            <div class="scenery" aria-hidden="true">
              <span class="sun"></span>
              <span class="cloud cloud-one"></span>
              <span class="cloud cloud-two"></span>
              <span class="mountain mountain-one"></span>
              <span class="mountain mountain-two"></span>
              <span class="mountain mountain-three"></span>
              <span class="hill hill-one"></span>
              <span class="hill hill-two"></span>
              <span class="pine pine-one"></span>
              <span class="pine pine-two"></span>
              <span class="pine pine-three"></span>
              <span class="trail"></span>
              <span class="camp-flag"></span>
              <span class="flower flower-one">✿</span>
              <span class="flower flower-two">✿</span>
              <span class="flower flower-three">✿</span>
            </div>

            <div class="world-route">
              <div
                v-for="(goal, index) in milestones"
                :key="goal"
                class="route-stop"
                :class="{ reached: group.streak >= goal }"
              >
                <span>
                  <AppIcon :name="index === milestones.length - 1 ? 'trophy' : 'check'" :size="14" />
                </span>
                <small>{{ goal }} d</small>
              </div>
            </div>

            <nav v-if="lastScenePage > 0" class="scene-pages" aria-label="Personajes del equipo">
              <button type="button" :disabled="scenePage === 0" aria-label="Personajes anteriores" @click="scenePage--">‹</button>
              <span aria-live="polite">{{ scenePage + 1 }} / {{ lastScenePage + 1 }}</span>
              <button type="button" :disabled="scenePage === lastScenePage" aria-label="Personajes siguientes" @click="scenePage++">›</button>
            </nav>
            <div class="players" :style="{ '--players': sceneMembers.length }">
              <button
                v-for="(m, index) in sceneMembers"
                :key="m.id"
                class="player"
                :class="{ selected: selectedMember?.id === m.id, completed: m.checkedInToday, 'own-player': m.isCurrentUser }"
                :style="{ '--index': index }"
                :aria-label="`Ver a ${nameOf(m)}${m.isFallen ? ', personaje caído' : m.checkedInToday ? ', hábito completado' : ', hábito pendiente'}`"
                :aria-pressed="selectedMember?.id === m.id"
                @click="selectCharacter(m.id)"
              >
                <span class="player-bubble" :class="{ 'has-note': !m.isFallen && m.checkedInToday && m.dailyReport?.note }">
                  <span v-if="!m.isFallen && m.checkedInToday && m.dailyReport?.note" class="player-daily-note" :title="m.dailyReport.note">{{ m.dailyReport.note }}</span>
                  <span class="player-bubble-meta">{{ m.isFallen ? 'Caído' : m.checkedInToday ? `+${m.dailyReport?.energy ?? 1} energía` : 'Pendiente' }}</span>

                </span>
                <AdventureCharacter
                  v-if="!m.isFallen"
                  :character="characters.forMember(m.id, m.isCurrentUser, m.name)"
                  :complete="m.checkedInToday"
                  :size="88"
                />
                <AdventureTombstone v-else class="fallen-stone" />
                <span class="player-name">
                  {{ m.isCurrentUser ? 'Tú' : nameOf(m) }}
                </span>
              </button>
            </div>

            <div class="world-bottom">
              <div class="hud-energy-cluster">
                <span class="hud-energy-label">
                  <AppIcon name="flame" :size="15" />
                  <strong>{{ energy }} de energía</strong>
                  <small>· {{ done }}/{{ group.members.length }} aportaron</small>
                </span>
                <div class="world-progress" role="progressbar" :aria-valuenow="group.members.length ? Math.round((done / group.members.length) * 100) : 0" aria-valuemin="0" aria-valuemax="100">
                  <span
                    :style="{
                      width: `${group.members.length ? (done / group.members.length) * 100 : 0}%`,
                    }"
                  ></span>
                </div>
              </div>

              <div
                class="team-lives"
                :class="{ 'lives-at-risk': pending.length }"
                :title="pending.length ? `${pending.length} ${pending.length === 1 ? 'misión pendiente' : 'misiones pendientes'} · vida en riesgo` : 'El equipo está a salvo hoy'"
                :aria-label="`${Math.ceil(group.health / 20)} de 5 de vida del grupo`"
              >
                <div class="lives-meta">
                  <span class="lives-label">VIDA DEL GRUPO</span>
                  <span class="lives-caption">
                    <template v-if="pending.length">{{ pending.length }} {{ pending.length === 1 ? 'pendiente' : 'pendientes' }}</template>
                    <template v-else>A salvo</template>
                  </span>
                </div>
                <span class="heart-row" :data-kind="lifeTokenKind" :data-theme="activeBannerTheme.id">
                  <svg
                    v-for="heart in healthHearts"
                    :key="heart.index"
                    viewBox="0 0 24 24"
                    width="25"
                    height="25"
                    class="life-token"
                    :class="[`kind-${lifeTokenKind}`, { alive: heart.alive, threatened: heart.threatened }]"
                    aria-hidden="true"
                  >
                    <template v-if="lifeTokenKind === 'mushroom'">
                      <path class="token-stem" d="M8.5 14h7v5a2.5 2.5 0 0 1-2.5 2.5h-2A2.5 2.5 0 0 1 8.5 19v-5Z" />
                      <path class="token-main" d="M3.5 13C3.5 7.2 7.3 3.5 12 3.5S20.5 7.2 20.5 13c0 1.2-.8 2-2 2h-13c-1.2 0-2-.8-2-2Z" />
                      <circle class="token-spot" cx="8.2" cy="9.6" r="1.7" />
                      <circle class="token-spot" cx="14.6" cy="8.5" r="2" />
                      <circle class="token-spot" cx="12.2" cy="12.1" r="1.2" />
                    </template>
                    <template v-else-if="lifeTokenKind === 'star'">
                      <path class="token-main" d="M12 2.2l2.9 5.8 6.4.9-4.6 4.5 1.1 6.4L12 16.8l-5.8 3 1.1-6.4-4.6-4.5 6.4-.9L12 2.2Z" />
                      <circle class="token-spot" cx="10" cy="9.5" r="1.3" />
                    </template>
                    <template v-else-if="lifeTokenKind === 'sun'">
                      <path class="token-main" d="M12 2l2.3 3.4 4-.8-.8 4L21 11l-3.5 2.4.8 4-4-.8L12 20l-2.3-3.4-4 .8.8-4L3 11l3.5-2.4-.8-4 4 .8L12 2Z" />
                      <circle class="token-spot" cx="12" cy="11" r="4.2" />
                    </template>
                    <template v-else-if="lifeTokenKind === 'flame'">
                      <path class="token-main" d="M12.5 2.2c2.4 3.5 6.3 6.5 6.3 11a6.8 6.8 0 0 1-13.6 0c0-3.3 1.8-6.1 3.7-8.2.4 1.8 1.4 2.7 2.4 3.1-.3-2.1.3-4.2 1.2-5.9Z" />
                      <path class="token-spot" d="M12 11.2c1.2 1.5 2.6 2.9 2.6 4.8a2.6 2.6 0 0 1-5.2 0c0-1.6.9-3.1 2.6-4.8Z" />
                    </template>
                    <template v-else>
                      <path class="token-main" d="M12 20.6s-7.4-4.5-9.2-8.9C1.4 8.1 3.6 4.2 7.4 4.2c2.1 0 3.6 1.1 4.6 2.6 1-1.5 2.5-2.6 4.6-2.6 3.8 0 6 3.9 4.6 7.5-1.8 4.4-9.2 8.9-9.2 8.9Z" />
                      <circle class="token-spot" cx="7.6" cy="8.4" r="1.4" />
                    </template>
                  </svg>
                </span>
              </div>
            </div>
          </section>

          <div
            class="adventure-content"
            :class="{ 'chat-closed': !isChatOpen || isChatExpanded }"
          >
            <div class="game-stack">
              <section v-if="selectedMember" ref="memberPanel" class="game-panel player-panel">
                <div class="player-detail-heading">
                  <CharacterIcon
                    :character="characters.forMember(selectedMember.id, selectedMember.isCurrentUser, selectedMember.name)"
                    :size="58"
                  />
                  <div>
                    <h2>{{ nameOf(selectedMember) }}</h2>
                    <span>{{ selectedMember.isCurrentUser ? 'Tu misión' : 'Misión del equipo' }}</span>
                  </div>
                  <RouterLink
                    v-if="selectedMember.isCurrentUser"
                    :to="{ name: 'perfil', hash: '#personalizar' }"
                    class="customize-link"
                  >
                    <AppIcon name="settings" :size="15" />Personalizar
                  </RouterLink>
                </div>

                <button v-if="canPoke" type="button" class="streak-poke-button" :disabled="sentPokes.has(pokeKey(selectedMember.id))" @click="openPokeDialog(selectedMember)">
                  <span class="streak-poke-hand"><PokePaw /></span>
                  {{ sentPokes.has(pokeKey(selectedMember.id)) ? 'Toque enviado' : 'Dar toque' }}
                </button>
                <p v-else-if="!selectedMember.isCurrentUser && selectedMember.checkedInToday" class="check-notice">
                  {{ nameOf(selectedMember) }} ya registró su aporte de hoy.
                </p>
                <div class="current-habit mission-habits">
                  <strong>Hábitos de hoy</strong>
                  <ul>
                    <li v-for="habit in missionHabits" :key="habit.id">
                      <label v-if="selectedMember.isCurrentUser && !selectedMember.checkedInToday && !selectedMember.isFallen">
                        <input v-model="habitIds" type="checkbox" :value="habit.id" :disabled="isCheckingIn" />
                        {{ habit.name }}
                      </label>
                      <span v-else>
                        <AppIcon :name="selectedMember.dailyReport?.habitIds.includes(habit.id) ? 'check' : 'target'" :size="16" />
                        {{ habit.name }}
                      </span>
                    </li>
                  </ul>
                  <p v-if="selectedMember.checkedInToday && selectedMember.dailyReport?.note" class="member-note-cloud">{{ selectedMember.dailyReport.note }}</p>
                </div>

                <div class="player-metrics">
                  <div>
                    <AppIcon name="flame" :size="16" />
                    <strong>{{ selectedMember.streak }}</strong>
                    <small>días de racha</small>
                  </div>
                  <div>
                    <AppIcon name="check" :size="16" />
                    <strong>{{ selectedMember.daysCompleted }}/{{ selectedMember.daysTotal }}</strong>
                    <small>días cumplidos</small>
                  </div>
                  <div>
                    <AppIcon name="trophy" :size="16" />
                    <strong>
                      {{
                        milestones.filter((n) => selectedMember && selectedMember.streak >= n)
                          .length
                      }}/{{ milestones.length }}
                    </strong>
                    <small>hitos de racha</small>
                  </div>
                </div>

                <div v-if="lastMessage" class="last-message">
                  <AppIcon name="message" :size="15" />
                  <p>{{ lastMessage.text }}</p>
                </div>

                <div v-if="group.archivedAt" class="daily-quest">El registro de aportes está cerrado.</div>
                <div v-else-if="selectedMember.isCurrentUser && selectedMember.isFallen" class="daily-quest">
                  <strong>Tu personaje cayó</strong>
                  <p>Un admin puede aprobar tu regreso a la aventura.</p>
                  <button type="button" class="game-button" :disabled="requestingReturn" @click="requestReturn">
                    {{ requestingReturn ? 'Enviando…' : 'Solicitar volver' }}
                  </button>
                  <p v-if="returnNotice" role="status">{{ returnNotice }}</p>
                </div>
                <div v-else-if="selectedMember.isCurrentUser" class="daily-quest" :class="`quest-${missionDays}`">
                  <div class="daily-quest-heading">
                    <span class="quest-rank-icon"><AppIcon :name="missionRank.icon" :size="25" /></span>
                    <div>
                      <small>MISIÓN DIARIA</small>
                      <strong>{{ selectedMember.checkedInToday ? 'Aporte registrado' : 'Registra tus hábitos' }}</strong>
                      <span>{{ selectedMember.checkedInToday ? `+${selectedMember.dailyReport?.energy ?? 1} de energía` : `${selectedHabits.length} / ${missionHabits.length} hábitos · +${selectedHabits.length} de energía` }}</span>
                    </div>
                  </div>
                  <div class="quest-energy-track" aria-hidden="true">
                    <span :style="{ width: `${Math.min(100, (selectedMember.checkedInToday ? selectedMember.dailyReport?.energy ?? 1 : selectedHabits.length) / Math.max(1, missionHabits.length) * 100)}%` }"></span>
                  </div>
                  <label v-if="!selectedMember.checkedInToday" class="mission-note">
                    Mensaje de tu personaje (opcional)
                    <input v-model="dailyNote" maxlength="140" :disabled="isCheckingIn" />
                  </label>
                  <button
                    class="game-button checkin-button"
                    :disabled="isCheckingIn || (!selectedMember.checkedInToday && !selectedHabits.length)"
                    :class="{ completed: selectedMember.checkedInToday }"
                    :aria-pressed="selectedMember.checkedInToday"
                    @click="toggle"
                  >
                    <span class="check-emblem"><AppIcon name="check" :size="26" /></span>
                    <span class="check-button-copy"><strong>{{ isCheckingIn ? 'Guardando…' : selectedMember.checkedInToday ? 'Retirar check grupal' : 'Check grupal' }}</strong></span>
                    <AppIcon v-if="!selectedMember.checkedInToday && !isCheckingIn" name="arrow-right" :size="22" />
                  </button>
                </div>

                <p v-if="notice && selectedMember.isCurrentUser" class="check-notice" role="status">
                  {{ notice }}
                </p>
              </section>

              <section class="game-panel team-habits" :class="`mission-board-${missionDays}`">
                <div class="game-title">
                  <div class="mission-board-title">
                    <span><AppIcon :name="missionRank.icon" :size="23" /></span>
                    <div>
                      <small>CAMPAÑA DE {{ missionDays }} DÍAS</small>
                      <h2>{{ missionRank.name }}</h2>
                    </div>
                  </div>
                  <button v-if="isAdmin" class="game-button secondary add-habit-button" @click="openEditor()">
                    <AppIcon name="plus" :size="19" />Crear hábito
                  </button>
                </div>
                <p class="mission-board-copy">Súmate a las misiones que quieras desde el chat.</p>
                <p v-if="!group.habits?.length" class="habit-empty">Aún no hay objetivos activos en esta aventura.</p>
                <article v-for="habit in group.habits ?? []" :key="habit.id" class="team-habit-row">
                  <span class="team-habit-icon"><AppIcon :name="habitIconName(habit.icon)" :size="19" /></span>
                  <div class="team-habit-copy">
                    <strong>{{ habit.name }}</strong>
                    <small>{{ habit.description || 'Hábito del equipo' }}</small>
                  </div>
                  <span v-if="habit.joined" class="habit-check-state complete">En tu aventura</span>
                  <div v-if="isAdmin" class="habit-actions">
                    <button class="edit-habit" @click="openEditor(habit)">
                      <AppIcon name="settings" :size="14" />Editar
                    </button>
                    <button class="edit-habit remove-habit" @click="removeHabit(habit.id, habit.name)">
                      <AppIcon name="x" :size="14" />Quitar
                    </button>
                  </div>
                </article>
              </section>

              <section
                class="reminder midnight-countdown-card"
                :class="pending.length ? 'is-danger' : 'is-complete'"
                role="status"
                aria-live="polite"
              >
                <div class="midnight-countdown-info">
                  <div class="midnight-countdown-head">
                    <span class="midnight-countdown-badge">
                      <AppIcon :name="pending.length ? 'clock' : 'check'" :size="22" />
                    </span>
                    <div>
                      <small class="midnight-countdown-kicker">
                        {{ pending.length ? 'CIERRE DIARIO · 12:00 A. M. · VIDA EN RIESGO' : 'EQUIPO COMPLETO · REINICIO A LAS 12:00 A. M.' }}
                      </small>
                      <h3>
                        {{
                          pending.length
                            ? pending.length === 1
                              ? 'Falta 1 miembro por registrar su hábito hoy'
                              : `Faltan ${pending.length} miembros por registrar su hábito hoy`
                            : '¡Todos registraron su hábito hoy!'
                        }}
                      </h3>
                    </div>
                  </div>

                  <div v-if="pending.length" class="midnight-pending-list">
                    <span class="midnight-pending-label">Pendientes antes de las 12:00 a. m.:</span>
                    <div class="midnight-pending-chips">
                      <span v-for="m in pending" :key="m.id" class="midnight-pending-chip">
                        <CharacterIcon
                          :character="characters.forMember(m.id, m.isCurrentUser, m.name)"
                          :size="24"
                        />
                        <strong>{{ nameOf(m) }}</strong>
                        <button v-if="canPokeMember(m)" type="button" class="streak-poke-button countdown-poke"
                          :disabled="sentPokes.has(pokeKey(m.id))" :aria-label="'Dar toque a ' + nameOf(m)" @click="openPokeDialog(m)">
                          <PokePaw />{{ sentPokes.has(pokeKey(m.id)) ? 'Enviado' : 'Dar toque' }}
                        </button>
                        <em v-else>Pendiente</em>
                      </span>
                    </div>
                  </div>
                  <p v-else class="midnight-complete-copy">
                    La vida del grupo está protegida hoy. El nuevo día comienza a medianoche.
                  </p>
                </div>

                <div
                  class="midnight-clock-box"
                  :aria-label="`Tiempo restante hasta las 12 de la medianoche: ${hours} horas, ${minutes} minutos y ${seconds} segundos`"
                >
                  <span class="midnight-clock-label">CUENTA REGRESIVA · 12:00 A. M.</span>
                  <div class="midnight-clock-digits">
                    <div class="clock-unit">
                      <strong>{{ String(hours).padStart(2, '0') }}</strong>
                      <small>HORAS</small>
                    </div>
                    <span class="clock-sep">:</span>
                    <div class="clock-unit">
                      <strong>{{ String(minutes).padStart(2, '0') }}</strong>
                      <small>MIN</small>
                    </div>
                    <span class="clock-sep">:</span>
                    <div class="clock-unit">
                      <strong>{{ String(seconds).padStart(2, '0') }}</strong>
                      <small>SEG</small>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <!-- Chat en modo Minimizado (como estaba antes, debajo del valle) -->
            <section v-if="!group.archivedAt && isChatOpen && !isChatExpanded" class="adventure-chat compact-chat">
              <GroupChat
                :group="group"
                :alert="null"
                :expanded="false"
                @close="isChatOpen = false"
                @toggle-expand="isChatExpanded = true"
                @send="send"
              />
            </section>
          </div>
        </div>

        <aside class="group-side-panels">
          <section v-if="isChatOpen && isChatExpanded" class="adventure-chat expanded-side-chat">  
            <GroupChat  
              :group="group"  
              :alert="null"  
              :expanded="true"  
              @close="isChatOpen = false"  
              @toggle-expand="isChatExpanded = false"  
              @send="send"  
            />  
          </section>
          <button type="button" class="roster-toggle" :aria-expanded="isRosterOpen"
            aria-controls="group-roster" @click="isRosterOpen = !isRosterOpen">
            <AppIcon name="users" :size="15" />
            {{ isRosterOpen ? 'Ocultar miembros' : 'Ver miembros' }}
          </button>
          <section v-show="isRosterOpen" id="group-roster" class="game-panel team-roster side-roster group-roster">  
            <div class="game-title">  
              <h2><AppIcon name="users" :size="18" />Miembros ({{ group.members.length }}/20)</h2>  
            </div>  
            <div class="roster-list">  
              <article v-for="m in group.members" :key="m.id" class="roster-member">  
                <CharacterIcon :character="characters.forMember(m.id, m.isCurrentUser, m.name)" :size="36" />  
                <span class="roster-member-copy">  
                  <strong>{{ nameOf(m) }}</strong>  
                  <small>{{ m.role === 'ADMIN' ? 'Admin' : 'Miembro' }}</small>  
                  <small :class="{ 'roster-done': m.checkedInToday && !m.isFallen }">  
                    {{ m.isFallen ? 'Caído' : m.checkedInToday ? 'Al día' : 'Pendiente' }}  
                  </small>  
                </span>  
              </article>  
            </div>  
          </section>
        </aside>
      </div>
    </div>

    <!-- Modal editar hábito -->
      <div
        v-if="editing && isAdmin"
        class="adventure-modal-backdrop"
        @click.self="editing = false"
        @keydown.esc="editing = false"
      >
        <form
          class="adventure-modal mission-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
          @submit.prevent="saveHabit"
        >
          <button type="button" class="mission-close" aria-label="Cerrar" @click="editing = false">
            <AppIcon name="x" :size="19" />
          </button>

          <header class="mission-hero">
            <div class="mission-sticker" aria-hidden="true">
              <AppIcon :name="habitIconName(habitIconDraft)" :size="20" />
            </div>
            <div>
              <span class="mission-kicker">EL TABLERO DEL EQUIPO</span>
              <h2 id="edit-title">{{ editingHabitId ? 'Un pequeño ajuste' : 'Una nueva misión' }}</h2>
              <p>Algo pequeño que puedan repetir cada día.</p>
            </div>
          </header>

          <section class="mission-step">
            <span class="mission-step-number">1</span>
            <div class="mission-field">
              <label for="habit-name">¿Qué van a practicar?</label>
              <div class="mission-name-input">
                <AppIcon name="target" :size="20" />
                <input id="habit-name" v-model="draft" autofocus maxlength="80" placeholder="Leer 20 minutos" required />
              </div>
            </div>
          </section>

          <section class="mission-step">
            <span class="mission-step-number">2</span>
            <div class="mission-field">
              <label>Su insignia</label>
              <div class="habit-icon-options" role="group" aria-label="Icono del hábito">
                <button
                  v-for="icon in habitIcons"
                  :key="icon"
                  type="button"
                  class="habit-icon-option"
                  :class="{ selected: habitIconDraft === icon }"
                  :aria-label="`Usar icono ${icon}`"
                  :aria-pressed="habitIconDraft === icon"
                  @click="habitIconDraft = icon"
                >
                  <AppIcon :name="icon" :size="21" />
                </button>
              </div>
            </div>
          </section>

          <section class="mission-step mission-description">
            <span class="mission-step-number">3</span>
            <div class="mission-field">
              <label for="habit-description">Descripción (opcional)</label>
              <textarea id="habit-description" v-model="habitDescriptionDraft" maxlength="300" rows="3" />
            </div>
          </section>

          <p v-if="notice" class="dialog-notice" role="alert">{{ notice }}</p>
          <footer class="mission-actions">
            <button type="button" class="game-button secondary" @click="editing = false">
              Cancelar
            </button>
            <button class="mission-launch-button" type="submit" :disabled="saving">
              <AppIcon :name="editingHabitId ? 'check' : 'flame'" :size="19" />
              {{ saving ? 'Guardando…' : editingHabitId ? 'Guardar hábito' : '¡Crear hábito!' }}
            </button>
          </footer>
        </form>
      </div>

      <div
        v-if="editingGroup"
        class="adventure-modal-backdrop"
        @click.self="editingGroup = false"
        @keydown.esc="editingGroup = false"
      >
        <form class="adventure-modal group-edit-modal" :style="{ '--edit-accent': draftBannerTheme.color }" role="dialog" aria-modal="true" aria-labelledby="group-edit-title" @submit.prevent="saveGroup">
          <header class="group-edit-hero" :style="{ '--edit-banner': `url('${draftBannerTheme.bannerUrl}')`, '--edit-banner-filter': draftBannerTheme.filter ?? 'none', '--edit-accent': draftBannerTheme.color }">
            <button type="button" class="mission-close" aria-label="Cerrar configuración" @click="editingGroup = false"><AppIcon name="x" :size="19" /></button>
            <span class="group-edit-emblem" :style="{ '--emblem-color': groupColorDraft }">
              <AppIcon :name="groupCategoryIcon" :size="23" />
            </span>
            <div>
              <small>{{ (groupCategoryDraft || group.category || 'EL CAMPAMENTO').toUpperCase() }} · EDITAR INFORMACIÓN</small>
              <h2 id="group-edit-title">{{ groupNameDraft.trim() || group.name }}</h2>
              <p>{{ groupDescriptionDraft.trim() || 'Edita el nombre, categoría, descripción y miembros de tu grupo.' }}</p>
            </div>
          </header>
          <div class="group-edit-content">
            <section class="group-edit-settings">
              <div class="group-editor-section-title">
                <span class="group-editor-section-icon"><AppIcon name="settings" :size="18" /></span>
                <span>
                  <strong>Configuración del grupo</strong>
                  <small>Nombre, categoría y apariencia</small>
                </span>
              </div>
              <label for="group-name">Nombre del grupo</label>
              <input id="group-name" v-model="groupNameDraft" maxlength="60" minlength="3" required />
              <span class="group-edit-field-label">Categoría del grupo</span>
              <div class="group-category-options" aria-label="Categoría del grupo">
                <button
                  v-for="category in GROUP_CATEGORIES"
                  :key="category.label"
                  type="button"
                  class="group-category-option"
                  :class="{ selected: groupCategoryDraft === category.label }"
                  :aria-pressed="groupCategoryDraft === category.label"
                  @click="groupCategoryDraft = category.label"
                >
                  <AppIcon :name="category.icon" :size="16" />
                  {{ category.label }}
                </button>
              </div>
              <label for="group-description">Descripción</label>
              <textarea id="group-description" v-model="groupDescriptionDraft" maxlength="200" rows="3" />
              <span class="color-label">Banner y tema del grupo</span>
              <div class="group-color-options group-banner-options">
                <button v-for="theme in GROUP_BANNER_THEMES" :key="theme.color" type="button" class="group-banner-option" :aria-label="`Elegir banner ${theme.name}`" :aria-pressed="groupColorDraft === theme.color" :class="{ selected: groupColorDraft === theme.color }" :style="{ '--group-color': theme.color, '--swatch-banner': `url('${theme.bannerUrl}')`, '--swatch-filter': theme.filter ?? 'none' }" @click="groupColorDraft = theme.color">
                  <span class="group-banner-option-bg" aria-hidden="true"></span>
                  <span class="group-banner-option-shade" aria-hidden="true"></span>
                  <span class="group-banner-option-name">{{ theme.name }}</span>
                  <span v-if="groupColorDraft === theme.color" class="group-banner-option-check"><AppIcon name="check" :size="12" /></span>
                </button>
              </div>
            </section>
            <section class="group-member-editor">
            <div class="group-member-heading">
              <span class="group-member-title-icon"><AppIcon name="user" :size="17" /></span>
              <span class="group-member-title-copy">
                <strong>Miembros del equipo</strong>
                <small>Roles y acceso al grupo</small>
              </span>
              <small>{{ group.members.length }} {{ group.members.length === 1 ? 'miembro' : 'miembros' }}</small>
            </div>
            <div class="group-member-list">
              <button
                v-for="member in group.members"
                :key="member.id"
                type="button"
                class="group-member-option"
                :class="{ selected: selectedMember?.id === member.id }"
                :aria-pressed="selectedMember?.id === member.id"
                @click="selectedId = member.id"
              >
                <CharacterIcon
                  :character="characters.forMember(member.id, member.isCurrentUser, member.name)"
                  :size="36"
                />
                <span class="group-member-copy">
                  <strong>{{ nameOf(member) }}{{ member.isCurrentUser ? ' (tú)' : '' }}</strong>
                  <small>{{ member.habit }}</small>
                </span>
                <span class="group-member-role" :class="{ admin: member.role === 'ADMIN' }">
                  {{ member.role === 'ADMIN' ? 'ADMIN' : 'MIEMBRO' }}
                </span>
              </button>
            </div>
            <div
              v-if="isAdmin && selectedMember && !selectedMember.isCurrentUser"
              class="group-member-actions"
            >
              <p>Gestionando a <strong>{{ nameOf(selectedMember) }}</strong></p>
              <div>
                <button v-if="selectedMember.isFallen" type="button" class="member-role-button" @click="reviveMember(selectedMember.id)">
                  <AppIcon name="flame" :size="15" />Revivir
                </button>
                <button type="button" class="member-role-button" @click="toggleMemberRole(selectedMember)">
                  <AppIcon name="shield" :size="15" />
                  {{ selectedMember.role === 'ADMIN' ? 'Quitar admin' : 'Dar admin' }}
                </button>
                <button type="button" class="member-remove-button" @click="removeMember(selectedMember)">
                  <AppIcon name="logout" :size="15" />Expulsar
                </button>
              </div>
            </div>
            <p v-else-if="isAdmin" class="group-member-hint">
              Selecciona un miembro para cambiar su rol o expulsarlo.
            </p>
            </section>
          </div>
          <p v-if="notice" class="dialog-notice" role="status">{{ notice }}</p>
          <div class="group-edit-actions">
            <button type="button" class="game-button secondary" @click="editingGroup = false">Cancelar</button>
            <button class="game-button" type="submit" :disabled="saving || groupNameDraft.trim().length < 3">{{ saving ? 'Guardando…' : 'Guardar cambios' }}</button>
          </div>
        </form>
      </div>

      <!-- Modal confirmar salir del grupo -->
      <div
        v-if="confirmingLeave"
        class="adventure-modal-backdrop"
        @click.self="confirmingLeave = false"
        @keydown.esc="confirmingLeave = false"
      >
        <div class="adventure-modal leave-modal" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <button type="button" class="mission-close" aria-label="Cerrar" @click="confirmingLeave = false"><AppIcon name="x" :size="19" /></button>
          <span class="leave-character"><AdventureCharacter :character="characters.forMember(me?.id ?? '', true, me?.name ?? '')" :size="90" /></span>
          <small class="mission-kicker">UNA PAUSA EN EL CAMINO</small>
          <h2 id="leave-title">¿Te vas del equipo?</h2>
          <strong class="leave-group-name">{{ group.name }}</strong>
          <p class="leave-copy">
            <template v-if="group.members.length === 1">
              Como eres la única persona, el grupo quedará archivado y dejará de aparecer en tu inicio. Tu progreso guardado se conserva.
            </template>
            <template v-else>
              Dejarás de ver el grupo. Si eres quien administra, otra persona recibirá el rol de admin.
              Podrás pedir acceso de nuevo con el código <strong>{{ group.inviteCode }}</strong>.
            </template>
          </p>
          <p v-if="notice" class="dialog-notice" role="alert">{{ notice }}</p>
          <div class="leave-actions">
            <button type="button" class="game-button secondary" @click="confirmingLeave = false">
              Me quedo
            </button>
            <button type="button" class="game-button danger-btn" @click="handleLeaveGroup">
              <AppIcon name="logout" :size="15" />
              Sí, salir del grupo
            </button>
          </div>
        </div>
      </div>
  </div>
  <div v-else class="game-page">
    <RouterLink :to="{ name: 'inicio' }" class="game-button">Volver a Inicio</RouterLink>
  </div>
</template>

<style scoped>
.adventure-page {
  height: 100%;
  overflow-y: auto;
  background: #151520;
  color: #f2edf7;
  padding: 24px 28px 40px;
}

.adventure-wrap {
  max-width: 1420px;
  margin: auto;
  display: grid;
  gap: 20px;
}

.adventure-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.back {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 11px;
  color: #b9a8cb;
}

.adventure-header h1 {
  font-size: 26px;
  letter-spacing: -0.04em;
  margin: 8px 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.invite-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px dashed #775996;
  background: #261d33;
  color: #bca9ce;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}

.invite-badge:hover {
  border-color: #c6a5f3;
  transform: translateY(-1px);
}

.invite-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 700;
  color: #c2a8df;
}

.invite-badge strong {
  display: block;
  font-family: monospace;
  color: #f3e9ff;
  font-size: 13px;
  letter-spacing: 0.08em;
}

.leave-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid #6e3b4c;
  border-bottom: 4px solid #2b121b;
  background: #361d28;
  color: #f9b4c4;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.15s, filter 0.15s;
}

.leave-btn:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

/* Layout con Chat Grande Slideado al lado vs Minimizado */
.adventure-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.adventure-body.side-chat-active {
  grid-template-columns: minmax(0, 1fr) 450px;
}

.adventure-main-col {
  display: grid;
  gap: 22px;
  min-width: 0;
}

.expanded-side-chat {
  height: calc(100vh - 115px);
  min-height: 580px;
  position: sticky;
  top: 0;
  border: 2px solid #6d4f89;
  border-bottom: 5px solid #0d0915;
  border-radius: 19px;
  overflow: hidden;
  box-shadow: -12px 16px 38px rgba(0, 0, 0, 0.45);
  animation: slide-chat-in 0.22s ease-out;
}

@keyframes slide-chat-in {
  from {
    opacity: 0.6;
    transform: translateX(18px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.world {
  height: 430px;
  position: relative;
  overflow: hidden;
  border-radius: 19px;
  border: 3px solid #5e766d;
  box-shadow: 0 5px 0 #0b1014;
  background: var(--sky, #b5dccb);
  color: #273f38;
  isolation: isolate;
}

.world-hud {
  position: absolute;
  top: 15px;
  left: 17px;
  right: 17px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 10;
}

.world-title,
.world-streak,
.world-time {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #f5eed3ef;
  border: 2px solid #6c8873;
  border-bottom: 4px solid #617d66;
  border-radius: 9px;
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 4px 0 #38524716;
}

.world-pip {
  height: 7px;
  width: 7px;
  border-radius: 50%;
  background: #66884e;
}

.world-streak {
  margin-left: auto;
  padding: 3px 10px;
  color: #6e452d;
}

.world-time {
  font-variant-numeric: tabular-nums;
}

.scenery {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.sun {
  position: absolute;
  top: 45px;
  right: 22%;
  width: 65px;
  height: 65px;
  border-radius: 50%;
  background: #fff0b7;
  box-shadow: 0 0 0 14px #fff2c72e;
}

.cloud {
  position: absolute;
  background: #eef6e3;
  width: 110px;
  height: 23px;
  border-radius: 50px;
  top: 88px;
  left: 12%;
}

.cloud:before,
.cloud:after {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: 50%;
  width: 45px;
  height: 35px;
  top: -18px;
  left: 18px;
}

.cloud:after {
  width: 35px;
  height: 30px;
  left: 55px;
  top: -11px;
}

.cloud-two {
  left: 64%;
  top: 132px;
  transform: scale(0.65);
}

.mountain {
  position: absolute;
  bottom: 105px;
  width: 350px;
  height: 250px;
  background: var(--mountain, #82afa0);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.mountain-one {
  left: -5%;
  transform: rotate(-6deg);
}

.mountain-two {
  left: 23%;
  bottom: 95px;
  height: 280px;
  width: 440px;
  background: color-mix(in srgb, var(--mountain, #82afa0) 80%, #fff 20%);
}

.mountain-three {
  right: -7%;
  height: 310px;
  background: color-mix(in srgb, var(--mountain, #82afa0) 85%, #244838 15%);
}

.hill {
  position: absolute;
  bottom: 0;
  border-radius: 50% 50% 0 0;
  background: var(--grass, #95b975);
  width: 85%;
  height: 205px;
  left: -13%;
  transform: rotate(7deg);
}

.hill-two {
  left: 40%;
  height: 185px;
  bottom: 5px;
  transform: rotate(-8deg);
  background: color-mix(in srgb, var(--grass, #95b975) 80%, #355d40 20%);
}

.trail {
  position: absolute;
  left: 20%;
  bottom: -60px;
  width: 70%;
  height: 175px;
  background: #d5c290;
  border-radius: 50%;
  transform: rotate(-11deg);
  box-shadow: 0 -10px 0 #afbc7c;
}

.pine {
  position: absolute;
  bottom: 105px;
  width: 100px;
  height: 150px;
  background: #4f7e60;
  clip-path: polygon(
    50% 0,
    77% 35%,
    65% 35%,
    92% 63%,
    73% 63%,
    100% 85%,
    56% 85%,
    56% 100%,
    44% 100%,
    44% 85%,
    0 85%,
    27% 63%,
    8% 63%,
    35% 35%,
    23% 35%
  );
}

.pine-one {
  left: 3%;
}

.pine-two {
  right: 6%;
  transform: scale(0.9);
}

.pine-three {
  right: 17%;
  bottom: 124px;
  transform: scale(0.55);
  background: #638e68;
}

.camp-flag {
  position: absolute;
  right: 12%;
  bottom: 102px;
  height: 73px;
  width: 4px;
  background: #655742;
}

.camp-flag:after {
  content: '';
  position: absolute;
  top: 0;
  left: 4px;
  width: 35px;
  height: 23px;
  background: #b27a85;
  clip-path: polygon(0 0, 100% 0, 80% 50%, 100% 100%, 0 100%);
}

.flower {
  position: absolute;
  bottom: 68px;
  font-size: 22px;
  color: #f2d18b;
}

.flower-one {
  left: 10%;
}

.flower-two {
  left: 47%;
  bottom: 58px;
  color: #f5e7c5;
}

.flower-three {
  right: 4%;
  bottom: 95px;
  color: #eeb5b0;
}

.world-route {
  position: absolute;
  left: 22%;
  right: 25%;
  top: 119px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
  z-index: 1;
}

.world-route:before {
  content: '';
  position: absolute;
  top: 14px;
  left: 15px;
  right: 15px;
  border-top: 3px dashed #f2eed1a1;
  z-index: -1;
}

.route-stop {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.route-stop > span {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  background: #8ca48b;
  border: 2px solid #d0ddba;
  border-bottom: 4px solid #57735a;
  color: #dce8d2;
  border-radius: 10px;
  transform: rotate(-7deg);
}

.route-stop.reached > span {
  background: #efd58a;
  color: #77613c;
  border-color: #f8e9ba;
  border-bottom-color: #b09558;
}

.route-stop small {
  font-size: 8px;
  background: #edf0d6c4;
  padding: 2px 4px;
  border-radius: 4px;
}

.players {
  position: absolute;
  bottom: 69px;
  left: 12%;
  right: 12%;
  display: flex;
  justify-content: space-evenly;
  align-items: flex-end;
  gap: 18px;
  overflow-x: auto;
  max-height: 200px;
  padding: 20px 10px 5px;
}

.player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 0;
  color: #283d35;
  min-width: 108px;
  padding: 0 6px;
  cursor: pointer;
}

.player:nth-child(even) {
  margin-bottom: 15px;
}

.player-bubble {
  padding: 5px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff7df;
  border: 1px solid #8d9272;
  border-bottom: 3px solid #718164;
  border-radius: 7px;
  font-size: 9px;
  white-space: nowrap;
}

.completed .player-bubble {
  background: #e0efb6;
  color: #486135;
}

.player-name {
  display: block;
  max-width: 160px;
  overflow-wrap: anywhere;
  padding: 5px 12px;
  border-radius: 999px;
  background: #fbf5e6;
  color: #2d2634;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.25;
  text-align: center;
}

.player:hover :deep(.adventure-character) {
  filter: brightness(1.06) drop-shadow(0 0 5px #ffefb4);
}

.world-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 15px;
  background: #304c3eea;
  color: #f0efd5;
  padding: 14px 20px;
  font-size: 10px;
  font-weight: 700;
  border-top: 2px solid #94ab77;
}

.world-bottom > span {
  display: flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}

.team-lives {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  justify-content: end;
  column-gap: 8px;
  row-gap: 2px;
  min-width: 128px;
  margin-left: auto;
  text-align: right;
}

.lives-label {
  grid-column: 1 / -1;
  color: #d9e5c8;
  font-size: 7px;
  letter-spacing: .11em;
}

.heart-row { display: inline-flex; gap: 2px; align-items:center; justify-content:flex-end; }
.heart-row :deep(svg) { color: #42594a; stroke-width: 2.7; transition: color .2s, transform .2s, filter .2s; }
.heart-row :deep(svg.alive) { color: #ff6682; fill: #ff6682; filter: drop-shadow(0 2px 4px #f43f5e55); }
.heart-row :deep(svg.threatened) { color: #ffc15c; fill: #ffc15c; animation: heart-warning .9s ease-in-out infinite alternate; }
.lives-caption { grid-column:1 / -1; color:#e0d8b7; font-size:7px; white-space:nowrap; }
.lives-at-risk .lives-caption { color:#ffd391; }

@keyframes heart-warning { from { transform:scale(1); filter:drop-shadow(0 0 0 #ffbf5c00); } to { transform:scale(1.16); filter:drop-shadow(0 0 5px #ffbf5caa); } }

.world-progress {
  flex: 1;
  max-width: 240px;
  background: #20372e;
  border: 1px solid #688363;
  border-radius: 5px;
  height: 9px;
  overflow: hidden;
}

.world-progress > span {
  display: block;
  height: 100%;
  background: #c5d995;
  transition: width 0.3s;
}

.adventure-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 22px;
  align-items: start;
}

.adventure-content.chat-closed {
  grid-template-columns: minmax(0, 1fr);
}

.compact-chat {
  height: 650px;
  min-height: 450px;
  border: 1px solid #574164;
  border-bottom: 4px solid #0d0915;
  border-radius: 17px;
  overflow: hidden;
  position: sticky;
  top: 0;
}

.player-detail-heading {
  display: flex;
  align-items: center;
  gap: 15px;
}

.player-detail-heading > div {
  flex: 1;
}

.player-detail-heading h2 {
  font-size: 20px;
  margin: 0 0 6px;
}

.player-detail-heading > div > span {
  font-size: 10px;
  color: #b5a5c6;
}

.customize-link {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #d2b5ef;
  font-size: 10px;
}

.current-habit {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 0;
  border-top: 1px solid #46334f;
  border-bottom: 1px solid #46334f;
  margin-top: 24px;
}

.current-habit > svg {
  color: #c7a6e9;
  flex-shrink: 0;
}

.current-habit strong {
  font-size: 13px;
  flex: 1;
}

.current-habit > span {
  font-size: 9px;
  color: #eac08a;
  background: #4a352c;
  padding: 5px 7px;
  border-radius: 5px;
}

.current-habit > span.complete {
  background: #32402d;
  color: #c4dfa2;
}

.player-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.player-metrics > div {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  padding: 13px 7px;
  background: #2d2337;
  border: 1px solid #4a3558;
  border-radius: 9px;
}

.player-metrics svg {
  color: #d7b083;
}

.player-metrics strong {
  font-size: 18px;
}

.player-metrics small {
  width: 100%;
  text-align: center;
  font-size: 8px;
  color: #baa7cb;
}

.last-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 14px;
  background: #32283d;
  border-radius: 9px;
  margin-top: 20px;
  color: #d1bddf;
}

.last-message svg {
  flex-shrink: 0;
}

.last-message p {
  font-size: 11px;
  line-height: 1.7;
  margin: 0;
  overflow-wrap: anywhere;
}

.player-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-top: 22px;
}

.edit-habit {
  font-size: 10px;
  background: none;
  border: 0;
  color: #c2a8da;
  padding: 8px;
  cursor: pointer;
}

.check-notice {
  font-size: 11px;
  color: #c4dda7;
  margin: 15px 0 0;
}

.roster-member {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 9px;
  background: none;
  border: 0;
  border-top: 1px solid #43304e;
  color: #eadff4;
  text-align: left;
  border-radius: 7px;
  cursor: pointer;
}

.roster-member > span:not(.character-icon) {
  flex: 1;
  font-size: 12px;
}

.roster-member small {
  display: block;
  margin-top: 4px;
  font-size: 9px;
  color: #b5a3c4;
}

.roster-member > svg {
  color: #b6cc99;
}

.roster-member.active {
  background: #35263f;
}

.reminder {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #d7c2a1;
  background: #30262a;
  border: 1px solid #644a3c;
  border-radius: 10px;
  padding: 15px;
  font-size: 11px;
  line-height: 1.6;
}

.reminder svg {
  flex-shrink: 0;
}

.adventure-modal-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #08050cba;
  z-index: 1000;
}

.adventure-modal {
  background: #2b2036;
  border: 1px solid #74508d;
  border-radius: 17px;
  padding: 27px;
  width: min(420px, 100%);
  color: #f1e5fc;
}

.adventure-modal h2 {
  font-size: 21px;
  margin: 0 0 14px;
}

.leave-copy {
  font-size: 12px;
  line-height: 1.65;
  color: #cab9dc;
  margin: 0 0 8px;
}

.danger-btn {
  background: #e15b76 !important;
  border-color: #f9a8b8 !important;
  border-bottom-color: #6b1d2f !important;
  color: #fff !important;
}

.adventure-modal label {
  display: block;
  font-size: 11px;
  margin-bottom: 10px;
}

.adventure-modal input {
  background: #18101f;
  border: 1px solid #6c4a81;
  border-radius: 8px;
  padding: 13px;
  width: 100%;
  font-size: 13px;
  color: #fff;
}

.adventure-modal > div {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}

.adventure-page button:focus-visible,
.adventure-page a:focus-visible {
  outline: 2px solid #d9b0f5;
  outline-offset: 4px;
}

@media (max-width: 1250px) {
  .adventure-body.side-chat-active {
    grid-template-columns: minmax(0, 1fr) 370px;
  }
  .adventure-content {
    grid-template-columns: minmax(0, 1fr) 305px;
  }
  .adventure-page {
    padding: 23px 20px;
  }
  .customize-link {
    font-size: 0;
  }
  .customize-link svg {
    width: 18px;
  }
  .player-metrics {
    gap: 6px;
  }
  .current-habit {
    flex-wrap: wrap;
  }
}

@media (max-width: 1050px) {
  .adventure-body.side-chat-active,
  .adventure-content {
    grid-template-columns: minmax(0, 1fr);
  }
  .expanded-side-chat,
  .compact-chat {
    position: static;
    height: 550px;
  }
  .world-title {
    font-size: 8px;
  }
  .world {
    height: 420px;
  }
  .world-route {
    left: 17%;
    right: 17%;
  }
}

@media (max-width: 650px) {
  .adventure-page {
    padding: 18px 12px;
  }
  .adventure-header {
    flex-wrap: wrap;
  }
  .adventure-header h1 {
    font-size: 23px;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .leave-btn span {
    display: none;
  }
  .world {
    height: 410px;
  }
  .world-hud {
    left: 9px;
    right: 9px;
    gap: 6px;
    flex-wrap: wrap;
  }
  .world-title {
    padding: 7px;
    font-size: 7px;
  }
  .world-time {
    font-size: 9px;
    padding: 7px;
  }
  .world-streak {
    font-size: 9px;
  }
  .players {
    left: 0;
    right: 0;
    gap: 10px;
    justify-content: space-evenly;
  }
  .player {
    min-width: 105px;
  }
  .player-name {
    font-size: 10px;
  }
  .world-route {
    left: 10%;
    right: 10%;
    top: 125px;
  }
  .world-bottom {
    gap: 8px;
    padding: 14px 10px;
    font-size: 8px;
  }
  .team-lives { min-width: 100px; column-gap:5px; }
  .heart-row :deep(svg) { width:15px; height:15px; }
  .lives-caption { max-width:112px; white-space:normal; line-height:1.25; }
  .world-progress {
    min-width: 25px;
  }
  .mountain {
    width: 230px;
  }
  .mountain-two {
    width: 300px;
  }
  .player-controls {
    flex-wrap: wrap;
  }
  .player-controls .game-button {
    font-size: 11px;
  }
  .player-detail-heading h2 {
    font-size: 18px;
  }
  .current-habit strong {
    font-size: 12px;
  }
}
.team-habits { display: grid; gap: 12px; }
.member-command-card { display: grid; grid-template-columns:auto 1fr; gap: 11px; margin-top: 13px; padding: 14px; background: linear-gradient(135deg,#342641,#281f32); border: 1px solid #624576; border-bottom: 3px solid #17101e; border-radius: 13px; }
.member-command-icon { display: grid; place-items: center; width: 38px; height: 38px; color: #2a1f31; background: #c6a4eb; border-radius: 11px; box-shadow: 0 3px 0 #755598; }
.member-command-copy { min-width: 0; }
.member-command-copy > small,.member-command-copy > strong,.member-command-copy > span { display: block; }
.member-command-copy > small { color:#ac8fc8; font-size:7px; letter-spacing:.12em; }
.member-command-copy > strong { margin-top:4px; font-size:12px; }
.member-command-copy > span { margin-top:3px; color:#b8a6c7; font-size:9px; }
.member-admin-actions { grid-column: 1/-1; display:grid; grid-template-columns:1fr auto; gap:8px; margin-top:3px; }
.member-admin-actions button { display:flex; align-items:center; justify-content:center; gap:6px; min-height:36px; border-radius:9px; font-size:10px; font-weight:800; cursor:pointer; }
.member-role-button { color:#281d31; background:#bfa0e1; border:1px solid #dabefa; border-bottom:3px solid #775990; }
.member-remove-button { color:#ffc5ce; background:#492934; border:1px solid #7c4454; border-bottom:3px solid #211119; }
.team-habit-row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-top: 1px solid #43304e; }
.team-habit-icon { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 36px; border-radius: 10px; background: #382b45; font-size: 18px; }
.team-habit-copy { min-width: 0; flex: 1; }
.team-habit-copy strong, .team-habit-copy small { display: block; overflow-wrap: anywhere; }
.team-habit-copy strong { font-size: 12px; }
.team-habit-copy small, .habit-empty { color: #b5a3c4; font-size: 10px; margin: 4px 0 0; }
.habit-check-state { color: #eac08a; background: #4a352c; border-radius: 5px; padding: 5px 7px; font-size: 9px; white-space: nowrap; }
.habit-check-state.complete { background: #32402d; color: #c4dfa2; }
.remove-habit { color: #f1a3ad; }
.group-edit-modal { display: grid; gap: 10px; }
.mission-modal { position:relative; width:min(720px,100%); max-height:calc(100vh - 34px); overflow-y:auto; padding:0; border:2px solid #725291; border-bottom:6px solid #160d20; border-radius:24px; background:#241b2e; box-shadow:0 30px 90px #050208cc; }
.mission-close { position:absolute; z-index:3; top:17px; right:17px; display:grid; place-items:center; width:36px; height:36px; color:#d8c8e5; background:#291f34cc; border:1px solid #684e7b; border-radius:10px; cursor:pointer; }
.mission-hero { display:grid; grid-template-columns:120px 1fr; align-items:center; gap:23px; min-height:190px; padding:30px 64px 27px 34px; overflow:hidden; background:linear-gradient(135deg,#5a3b73,#7b55a0 58%,#4a3161); border-bottom:1px solid #a17abb; position:relative; }
.mission-hero::after { content:''; position:absolute; width:190px; height:190px; right:-75px; top:-95px; border:25px solid #ffffff0b; border-radius:50%; }
.mission-flag { position:relative; display:grid; place-items:center; width:96px; height:104px; }
.mission-flag::before { content:''; position:absolute; left:13px; bottom:0; width:8px; height:88px; background:#26172f; border-radius:5px; box-shadow:3px 0 #a97dcc; }
.mission-flag::after { content:''; position:absolute; left:21px; top:6px; width:72px; height:56px; background:#c6e87e; border:4px solid #291936; border-radius:7px 10px 10px 5px; clip-path:polygon(0 0,100% 0,84% 50%,100% 100%,0 100%); box-shadow:0 5px 0 #34233f; }
.mission-flag > span { position:relative; z-index:1; margin:-34px 0 0 16px; color:#35451f; }
.mission-kicker { display:block; margin-bottom:8px; color:#d9f59f; font-size:9px; font-weight:900; letter-spacing:.14em; }
.mission-hero h2 { margin:0; max-width:440px; font-size:29px; line-height:1.13; color:#fff; text-shadow:0 3px #382345; }
.mission-hero p { margin:9px 0 0; color:#e2d4eb; font-size:12px; }
.mission-step { display:grid; grid-template-columns:38px 1fr; gap:15px; padding:22px 30px 0; }
.mission-step-number { display:grid; place-items:center; align-self:start; width:34px; height:34px; color:#2d2135; background:#c9ed7c; border:2px solid #e0ffa1; border-bottom:4px solid #718d3d; border-radius:10px; font-size:14px; font-weight:900; }
.mission-field { min-width:0; }
.mission-field > label { margin:0 0 10px; color:#f2e9f8; font-size:13px; font-weight:800; }
.mission-name-input { display:flex; align-items:center; gap:11px; padding:0 14px; color:#c1e777; background:#191220; border:2px solid #5e456f; border-bottom:4px solid #0d0911; border-radius:13px; }
.mission-name-input:focus-within { border-color:#b38bd0; box-shadow:0 0 0 3px #ae7dd524; }
.mission-name-input input { min-width:0; padding:15px 0; background:transparent; border:0; outline:0; }
.mission-length-options { display:grid; grid-template-columns:repeat(3,1fr); gap:11px; }
.mission-length-card { position:relative; display:grid; justify-items:center; min-height:132px; padding:13px 8px 11px; color:#cbbbd7; background:#30263a; border:2px solid #51405e; border-bottom:5px solid #15101b; border-radius:15px; cursor:pointer; transition:transform .15s,border-color .15s,background .15s; }
.mission-length-card:hover { transform:translateY(-2px); border-color:#8e6ba6; }
.mission-length-card.selected { color:#2b3520; background:#c8e87d; border-color:#ebffad; border-bottom-color:#69813d; transform:translateY(-3px); box-shadow:0 7px 20px #0b071040; }
.length-flag { display:grid; place-items:center; width:30px; height:30px; color:#d4b5ed; background:#493557; border-radius:9px; }
.selected .length-flag { color:#f4ffcf; background:#6c863d; }
.mission-length-card strong { margin-top:4px; font-size:29px; line-height:1; }
.mission-length-card small { font-size:8px; font-weight:900; letter-spacing:.15em; }
.mission-length-card em { margin-top:5px; font-size:8px; font-style:normal; opacity:.75; }
.mission-actions { display:grid; grid-template-columns:auto minmax(260px,1fr); gap:12px; padding:26px 30px 30px 83px; }
.mission-launch-button { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; min-height:60px; color:#28331c; background:#c8e87c; border:2px solid #e8ffa6; border-bottom:6px solid #6d863d; border-radius:14px; font-size:15px; font-weight:900; cursor:pointer; }
.mission-launch-button:hover { background:#d7f58c; transform:translateY(-1px); }
.mission-launch-button:active { transform:translateY(3px); border-bottom-width:2px; }
.mission-launch-button:disabled { opacity:.55; cursor:default; transform:none; }
.group-edit-modal textarea { width: 100%; resize: vertical; color: #fff; background: #18101f; border: 1px solid #6c4a81; border-radius: 8px; padding: 12px; font: inherit; }
.group-edit-modal .color-label { font-size: 11px; margin-top: 5px; }
.group-color-options { display: flex; gap: 10px; }
.group-color-options button { width: 28px; height: 28px; border-radius: 50%; background: var(--group-color); border: 2px solid #ffffff55; padding: 0; }
.group-color-options button.selected { outline: 2px solid #fff; outline-offset: 2px; }
@media(max-width:700px) { .team-habit-row { flex-wrap: wrap; } .team-habit-copy { min-width: calc(100% - 55px); } .group-edit-modal > div:last-child { flex-wrap: wrap; } .mission-hero{grid-template-columns:72px 1fr;min-height:150px;padding:25px 48px 22px 18px;gap:12px}.mission-flag{transform:scale(.72);transform-origin:left center}.mission-hero h2{font-size:21px}.mission-step{grid-template-columns:30px 1fr;padding:18px 16px 0;gap:10px}.mission-step-number{width:29px;height:29px}.mission-length-options{gap:6px}.mission-length-card{min-height:118px;padding-inline:4px}.mission-length-card strong{font-size:24px}.mission-actions{grid-template-columns:1fr;padding:22px 16px;}.mission-actions .secondary{order:2}.mission-actions button{width:100%}.member-admin-actions{grid-template-columns:1fr}.mission-modal{max-height:calc(100vh - 16px)} }
/* Pulido visual de misiones y roles, sin alterar sus acciones. */
.team-habits .game-title {
 padding-bottom: 14px;
 border-bottom: 1px solid #43304e;
 margin-bottom: 2px;
}

.team-habit-row {
 position: relative;
 padding: 13px;
 background: linear-gradient(120deg, #2d2438, #251f30);
 border: 1px solid #43344f;
 border-bottom: 3px solid #17111e;
 border-radius: 13px;
 transition: border-color .18s, transform .18s, background .18s;
}

.team-habit-row:hover {
 background: linear-gradient(120deg, #352941, #2b2236);
 border-color: #76578d;
 transform: translateY(-2px);
}

.team-habit-icon {
 width: 42px;
 height: 42px;
 flex-basis: 42px;
 background: linear-gradient(145deg, #4a3759, #33263f);
 border: 1px solid #654b78;
 box-shadow: inset 0 1px #ffffff12, 0 3px 0 #17111e;
}

.team-habit-copy strong {
 font-size: 13px;
 line-height: 1.4;
}

.team-habit-copy small {
 line-height: 1.55;
}

.habit-check-state {
 border: 1px solid #9a6b3f;
 border-radius: 999px;
 padding: 5px 9px;
 font-weight: 800;
 letter-spacing: .02em;
}

.habit-check-state.complete {
 border-color: #66824a;
}

.member-command-card {
 position: relative;
 overflow: hidden;
 background:
   radial-gradient(circle at 100% 0, #9b75ba24, transparent 38%),
   linear-gradient(135deg, #342641, #281f32);
 border-color: #705186;
}

.member-command-icon {
 border: 1px solid #e3c9ff;
 box-shadow: 0 3px 0 #755598, 0 0 18px #c6a4eb26;
}

.member-admin-actions button,
.edit-habit {
 transition: filter .16s, transform .16s, background .16s;
}

.member-admin-actions button:hover,
.edit-habit:hover {
 filter: brightness(1.13);
 transform: translateY(-1px);
}

.member-role-button {
 box-shadow: inset 0 1px #ffffff24;
}

.member-remove-button {
 border-radius: 9px;
}

.mission-step {
 margin: 18px 30px 0;
 padding: 16px;
 background: linear-gradient(120deg, #2b2235, #261e30);
 border: 1px solid #493953;
 border-radius: 15px;
}

.mission-length-card {
 box-shadow: inset 0 1px #ffffff0a, 0 4px 0 #15101b;
}

.mission-length-card.selected {
 box-shadow: inset 0 1px #ffffff70, 0 7px 20px #0b071040;
}

.mission-launch-button {
 box-shadow: inset 0 1px #ffffff80, 0 6px 18px #c8e87d1c;
}

@media(max-width:700px) {
 .team-habit-row {
   padding: 11px;
 }

 .mission-step {
   margin: 16px 16px 0;
   padding: 14px;
 }
}

.adventure-header .header-actions > .game-button.secondary {
 min-height: 42px;
 border-radius: 12px;
 box-shadow: inset 0 1px #ffffff12, 0 3px 0 #17111e;
 transition: transform .16s, filter .16s, border-color .16s;
}

.adventure-header .header-actions > .game-button.secondary:hover {
 border-color: #b28bd1;
 filter: brightness(1.12);
 transform: translateY(-2px);
}

.adventure-header .header-actions > .game-button.secondary:active {
 transform: translateY(1px);
}

.team-habit-row .edit-habit,
.player-controls > .edit-habit {
 display: inline-flex;
 align-items: center;
 justify-content: center;
 min-height: 32px;
 padding: 6px 10px;
 border: 1px solid #624b75;
 border-bottom: 3px solid #21172b;
 border-radius: 9px;
 background: #382a45;
 color: #e0c8f2;
 font-size: 10px;
 font-weight: 800;
}

.team-habits .game-title > .game-button {
 min-height: 40px;
 padding-inline: 14px;
 color: #2b3520;
 background: linear-gradient(135deg, #d5f291, #b8dc75);
 border-color: #e9ffb5;
 border-bottom-color: #6b843e;
 box-shadow: inset 0 1px #ffffff80, 0 4px 12px #b8dc7520;
 transition: filter .16s, transform .16s, box-shadow .16s;
}

.team-habits .game-title > .game-button:hover {
 filter: brightness(1.06);
 box-shadow: inset 0 1px #ffffffa0, 0 7px 16px #b8dc7530;
 transform: translateY(-2px);
}

.team-habits .game-title > .game-button:active {
 transform: translateY(1px);
}

.team-habit-row .edit-habit.remove-habit {
 background: #402832;
 border-color: #754454;
 border-bottom-color: #211119;
 color: #ffc0ca;
}

.team-habit-row .edit-habit:active,
.member-admin-actions button:active {
 transform: translateY(1px);
}

.member-command-card {
 box-shadow: inset 0 1px #ffffff0a, 0 5px 16px #0e09141c;
}

.member-command-copy > small {
 color: #d3b3eb;
}

.member-admin-actions button {
 min-height: 40px;
 font-size: 10px;
 letter-spacing: .01em;
 transition: transform .16s, filter .16s, box-shadow .16s;
}

.member-role-button:hover {
 box-shadow: 0 0 0 3px #caa9e726, inset 0 1px #ffffff24;
}

.member-remove-button:hover {
 box-shadow: 0 0 0 3px #e7798c20;
}

.group-edit-modal {
 width: min(500px, 100%);
 max-height: calc(100vh - 32px);
 overflow-y: auto;
 padding: 0 25px 24px;
 gap: 10px;
 border: 1px solid #77558f;
 border-bottom: 5px solid #160d20;
 background: linear-gradient(160deg, #2b2136, #211a2b 68%);
 box-shadow: 0 28px 80px #050208c9;
}

.group-edit-hero {
 display: flex;
 align-items: center;
 gap: 15px;
 margin: 0 -25px 7px;
 padding: 23px 25px;
 background:
   radial-gradient(circle at 100% 0, #c8a4eb26, transparent 38%),
   linear-gradient(125deg, #49325f, #30223e);
 border-bottom: 1px solid #76578d;
}

.group-edit-emblem {
 display: grid;
 place-items: center;
 width: 48px;
 height: 48px;
 flex: 0 0 48px;
 color: #30223d;
 background: #d0b1ed;
 border: 1px solid #f0ddff;
 border-bottom: 4px solid #80619a;
 border-radius: 14px;
 box-shadow: 0 7px 18px #120b1a55;
}

.group-edit-hero small {
 display: block;
 margin-bottom: 5px;
 color: #d8f39c;
 font-size: 8px;
 font-weight: 900;
 letter-spacing: .13em;
}

.group-edit-hero h2 {
 margin: 0;
 font-size: 22px;
}

.group-edit-hero p {
 margin: 5px 0 0;
 color: #cbb8d9;
 font-size: 10px;
 line-height: 1.5;
}

.group-edit-modal > label,
.group-edit-modal .color-label {
 margin: 5px 0 -5px;
 color: #e7d9f1;
 font-size: 10px;
 font-weight: 800;
}

.group-edit-modal > input,
.group-edit-modal textarea {
 width: 100%;
 color: #f7effc;
 background: #191420;
 border: 1px solid #574365;
 border-bottom: 3px solid #100c15;
 border-radius: 10px;
 padding: 11px 12px;
 font: inherit;
 font-size: 12px;
 transition: border-color .16s, box-shadow .16s, background .16s;
}

.group-edit-modal > input:focus,
.group-edit-modal textarea:focus {
 outline: 0;
 border-color: #b58bd5;
 background: #21192a;
 box-shadow: 0 0 0 3px #bd94df20;
}

.group-edit-modal textarea {
 min-height: 78px;
 resize: vertical;
}

.group-color-options {
 align-items: center;
 gap: 12px;
 padding: 8px 10px;
 background: #1c1624;
 border: 1px solid #40314c;
 border-radius: 12px;
}

.group-color-options button {
 width: 30px;
 height: 30px;
 cursor: pointer;
 transition: transform .16s, box-shadow .16s;
}

.group-color-options button:hover {
 transform: scale(1.12);
}

.group-color-options button.selected {
 outline: 2px solid #f5eaff;
 outline-offset: 3px;
 box-shadow: 0 0 14px var(--group-color);
}

.group-edit-actions {
 display: flex;
 justify-content: flex-end;
 gap: 9px;
 margin: 8px 0 0;
 padding-top: 15px;
 border-top: 1px solid #44334f;
}

.group-edit-actions .game-button {
 min-height: 42px;
}

@media(max-width:700px) {
 .group-edit-modal {
   padding: 0 17px 18px;
 }

 .group-edit-hero {
   margin-inline: -17px;
   padding-inline: 17px;
 }

 .group-edit-actions {
   flex-direction: column-reverse;
 }

 .group-edit-actions .game-button {
   width: 100%;
 }
}

.adventure-header .chat-toggle,
.adventure-header .edit-group-trigger,
.adventure-header .leave-btn {
 min-height: 44px;
 justify-content: center;
 border-radius: 12px;
 font-size: 12px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff18, 0 4px 0 #17111e;
 transition: transform .16s, filter .16s, box-shadow .16s;
}

.adventure-header .chat-toggle {
 color: #ead8fb;
 background: linear-gradient(145deg, #493358, #34233f);
 border-color: #8969a1;
 border-bottom-color: #1b1123;
}

.adventure-header .edit-group-trigger {
 color: #2e213b;
 background: linear-gradient(145deg, #e0c3fa, #b995db);
 border-color: #f0dcff;
 border-bottom-color: #72518a;
}

.adventure-header .leave-btn {
 padding: 0 14px;
 color: #ffcbd2;
 background: linear-gradient(145deg, #542d3b, #3e2530);
 border: 1px solid #98586a;
 border-bottom: 4px solid #211119;
}

.adventure-header .chat-toggle:hover,
.adventure-header .edit-group-trigger:hover,
.adventure-header .leave-btn:hover {
 filter: brightness(1.12);
 transform: translateY(-2px);
}

.adventure-header .chat-toggle:active,
.adventure-header .edit-group-trigger:active,
.adventure-header .leave-btn:active {
 transform: translateY(1px);
 box-shadow: inset 0 1px #ffffff12, 0 1px 0 #17111e;
}

.player-controls .checkin-button {
 min-height: 46px;
 padding: 11px 18px;
 border-radius: 12px;
 font-size: 12px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff80, 0 5px 0 var(--theme-dark, #6b843e), 0 9px 18px #a5ca6926;
}

.player-controls .checkin-button:hover {
 filter: brightness(1.1);
 transform: translateY(-2px);
}

.team-habits .game-title {
 align-items: center;
}

.team-habits .game-title h2 {
 font-size: 17px;
}

.team-habits .add-habit-button {
 min-height: 46px;
 padding: 9px 16px;
 gap: 9px;
 color: #2a351f;
 background: linear-gradient(145deg, #d8f48f, #aeda68);
 border: 1px solid #edffb7;
 border-bottom: 5px solid #617c37;
 border-radius: 13px;
 font-size: 12px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff9c, 0 7px 16px #b8dc7530;
 transition: transform .16s, filter .16s, box-shadow .16s;
}

.team-habits .add-habit-button:hover {
 filter: brightness(1.08);
 box-shadow: inset 0 1px #ffffffa8, 0 10px 20px #b8dc7542;
 transform: translateY(-3px);
}

.team-habits .add-habit-button:active {
 box-shadow: inset 0 1px #ffffff55, 0 2px 0 #617c37;
 transform: translateY(2px);
}

.team-habit-row {
 display: grid;
 grid-template-columns: 48px minmax(0, 1fr) auto;
 align-items: center;
 gap: 10px 13px;
 padding: 13px;
}

.team-habit-icon {
 grid-row: 1 / 3;
 width: 46px;
 height: 46px;
 flex-basis: 46px;
 border-radius: 13px;
 font-size: 21px;
 box-shadow: inset 0 1px #ffffff20, 0 4px 0 #17111e;
}

.team-habit-copy strong {
 font-size: 14px;
}

.team-habit-copy small {
 margin-top: 5px;
 font-size: 11px;
}

.team-habit-row .habit-check-state {
 grid-column: 3;
 grid-row: 1;
 padding: 6px 11px;
 font-size: 10px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff16;
}

.habit-actions {
 grid-column: 2 / 4;
 grid-row: 2;
 display: flex;
 justify-content: flex-end;
 gap: 8px;
}

.team-habit-row .habit-actions .edit-habit {
 min-height: 36px;
 padding: 7px 12px;
 gap: 7px;
 font-size: 11px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff12, 0 3px 0 #21172b;
}

.team-habit-row .habit-actions .edit-habit:hover {
 box-shadow: inset 0 1px #ffffff1a, 0 5px 0 #21172b, 0 7px 14px #0e091433;
 transform: translateY(-2px);
}

.team-habit-row .habit-actions .remove-habit {
 border-color: #965568;
 border-bottom-color: #29141b;
 background: linear-gradient(145deg, #59313f, #402530);
}

.team-roster .roster-member {
 min-height: 64px;
 padding: 11px 13px;
 border: 1px solid #493753;
 border-bottom: 3px solid #17111e;
 border-radius: 12px;
 cursor: default;
}

.team-roster .roster-member-copy {
 display: block;
 flex: 1;
 min-width: 0;
 overflow-wrap: anywhere;
 font-size: 12px;
}

.team-roster .roster-member-progress {
 display: grid;
 justify-items: end;
 gap: 6px;
 flex: 0 0 auto;
}

.team-roster .roster-member-check,
.team-roster .roster-member-streak {
 display: inline-flex;
 align-items: center;
 justify-content: center;
 gap: 5px;
 width: fit-content;
 border: 1px solid #574361;
 border-radius: 999px;
 padding: 5px 9px;
 color: #d3c2df;
 background: #34283f;
 font-size: 9px;
 font-weight: 800;
 white-space: nowrap;
}

.team-roster .roster-member-check.complete {
 color: #d3e8b6;
 background: #34422e;
 border-color: #596e48;
}

.team-roster .roster-member-streak {
 color: #f0c58e;
 background: #43332b;
 border-color: #70513a;
}

.team-roster .roster-member .roster-role {
 display: inline-flex;
 width: fit-content;
 margin-top: 5px;
 padding: 3px 7px;
 color: #d7c3e8;
 background: #392b45;
 border: 1px solid #5b456d;
 border-radius: 999px;
 font-size: 8px;
 font-weight: 900;
 letter-spacing: .06em;
}

.team-roster .roster-member .roster-role.leader {
 color: #f0d7a3;
 background: #46372b;
 border-color: #79603b;
}

.member-command-card {
 padding: 16px;
 border-radius: 15px;
}

.member-admin-actions button {
 min-height: 44px;
 border-radius: 11px;
 font-size: 11px;
 font-weight: 900;
}

.member-role-button {
 background: linear-gradient(145deg, #d8b8f3, #b58bd5);
 border-color: #f0dcff;
 border-bottom-color: #72518a;
 box-shadow: inset 0 1px #ffffff80, 0 4px 12px #c6a4eb20;
}

.member-remove-button {
 background: linear-gradient(145deg, #59313f, #402530);
 border-color: #965568;
 border-bottom-color: #211119;
}

.habit-empty {
 padding: 18px;
 border: 1px dashed #705486;
 border-radius: 13px;
 background: #2b2235;
 font-size: 12px;
 text-align: center;
}

@media(max-width:700px) {
 .team-habit-row {
   grid-template-columns: 42px minmax(0, 1fr);
   gap: 9px 11px;
   padding: 11px;
 }

 .team-habit-copy {
   min-width: 0;
 }

 .team-habit-icon {
   grid-row: 1 / 3;
   width: 40px;
   height: 40px;
 }

 .team-habit-row .habit-check-state {
   grid-column: 2;
   grid-row: 2;
   justify-self: start;
 }

 .habit-actions {
   grid-column: 1 / -1;
   grid-row: 3;
   justify-content: stretch;
 }

 .habit-actions .edit-habit {
   flex: 1;
 }

 .header-actions .chat-toggle,
 .header-actions .edit-group-trigger,
 .header-actions .leave-btn {
   min-height: 40px;
   font-size: 10px;
 }
}

.player-controls {
 display: block;
}

.player-controls .checkin-button {
 display: flex;
 width: 100%;
 min-height: 66px;
 justify-content: center;
 gap: 12px;
 padding: 14px 20px;
 color: #382817;
 background: linear-gradient(135deg, #ffe08b, #ffad55 58%, #f28a45);
 border: 2px solid #fff0b0;
 border-bottom: 6px solid #985526;
 border-radius: 16px;
 font-size: 16px;
 font-weight: 950;
 letter-spacing: .01em;
 box-shadow: inset 0 1px #ffffffb3, 0 8px 18px #ee9b4635;
 transition: filter .16s, transform .16s, box-shadow .16s;
}

.player-controls .checkin-button svg {
 width: 23px;
 height: 23px;
 filter: drop-shadow(0 2px 2px #8c4e3340);
}

.player-controls .checkin-button:hover {
 filter: brightness(1.06) saturate(1.08);
 box-shadow: inset 0 1px #ffffffc9, 0 12px 24px #ee9b4650;
 transform: translateY(-3px);
}

.player-controls .checkin-button:active {
 border-bottom-width: 3px;
 transform: translateY(2px);
}

.player-controls .checkin-button.completed {
 color: #26351f;
 background: linear-gradient(135deg, #e1f8a7, #bce477 58%, #9ac85d);
 border-color: #f0ffc6;
 border-bottom-color: #5f7c37;
 box-shadow: inset 0 1px #ffffffb3, 0 8px 18px #a9d46a30;
}

.player-controls .checkin-button.completed:hover {
 box-shadow: inset 0 1px #ffffffc9, 0 12px 24px #a9d46a48;
}

.team-habits .add-habit-button {
 min-height: 54px;
 padding: 11px 20px;
 gap: 11px;
 font-size: 14px;
 border-radius: 15px;
 border-bottom-width: 6px;
 box-shadow: inset 0 1px #ffffffb5, 0 9px 20px #b8dc7542;
}

.team-habits .add-habit-button svg {
 width: 21px;
 height: 21px;
}

.mission-modal .mission-step {
 align-items: start;
}

.habit-icon-options {
 display: grid;
 grid-template-columns: repeat(6, minmax(0, 1fr));
 gap: 9px;
}

.habit-icon-option {
 display: grid;
 place-items: center;
 min-width: 0;
 aspect-ratio: 1;
 color: #f4e9fc;
 background: linear-gradient(145deg, #392d46, #2a2235);
 border: 1px solid #5b456c;
 border-bottom: 4px solid #17111e;
 border-radius: 13px;
 font-size: 25px;
 cursor: pointer;
 box-shadow: inset 0 1px #ffffff10;
 transition: transform .16s, border-color .16s, background .16s, box-shadow .16s;
}

.habit-icon-option:hover {
 border-color: #b48cd1;
 background: linear-gradient(145deg, #4a3859, #34273f);
 transform: translateY(-3px) scale(1.04);
}

.habit-icon-option.selected {
 color: #30381f;
 background: linear-gradient(145deg, #e0f6a1, #b9de76);
 border-color: #f0ffbf;
 border-bottom-color: #66803e;
 box-shadow: inset 0 1px #ffffffb3, 0 0 0 3px #c8e87d26, 0 6px 14px #c8e87d20;
 transform: translateY(-2px);
}

.habit-icon-note {
 display: block;
 margin-top: 9px;
 color: #bba8ca;
 font-size: 10px;
 line-height: 1.5;
}

.mission-launch-button {
 min-height: 64px;
 font-size: 16px;
 box-shadow: inset 0 1px #ffffffa8, 0 8px 18px #c8e87d30;
}

@media(max-width:700px) {
 .player-controls .checkin-button {
   min-height: 62px;
   font-size: 14px;
 }

 .team-habits .add-habit-button {
   min-height: 48px;
   padding-inline: 13px;
   font-size: 12px;
 }

 .habit-icon-options {
   grid-template-columns: repeat(4, minmax(0, 1fr));
   gap: 8px;
 }

 .habit-icon-option {
   font-size: 23px;
 }
}

@media(max-width:650px) {
 .team-roster .roster-member {
   grid-template-columns: 36px minmax(0, 1fr);
   gap: 8px 10px;
 }

 .team-roster .roster-member-progress {
   grid-column: 2;
   display: flex;
   justify-items: start;
   flex-wrap: wrap;
   justify-content: flex-start;
 }
}

.adventure-header .edit-group-trigger {
 min-height: 48px;
 padding: 10px 17px;
 gap: 9px;
 font-size: 13px;
 box-shadow: inset 0 1px #ffffffb3, 0 5px 0 #72518a, 0 8px 18px #b995db30;
}

.adventure-header .edit-group-trigger svg {
 width: 18px;
 height: 18px;
}

.group-edit-modal {
 max-height: calc(100vh - 28px);
 overflow-y: auto;
 scrollbar-color: #76578d #211a2b;
}

.group-edit-emblem {
 color: #fff;
 background: linear-gradient(145deg, var(--emblem-color, #b995db), #30213d);
 border-color: color-mix(in srgb, var(--emblem-color, #b995db) 65%, white);
 box-shadow: inset 0 1px #ffffff80, 0 5px 0 #1b1123, 0 0 20px color-mix(in srgb, var(--emblem-color, #b995db) 35%, transparent);
}

.group-edit-field-label {
 margin: 5px 0 -5px;
 color: #e7d9f1;
 font-size: 10px;
 font-weight: 800;
}

.group-category-options {
 display: grid;
 grid-template-columns: repeat(3, minmax(0, 1fr));
 gap: 8px;
}

.group-category-option {
 display: flex;
 align-items: center;
 justify-content: center;
 gap: 7px;
 min-height: 42px;
 padding: 7px 8px;
 color: #d7c6e4;
 background: linear-gradient(145deg, #34283f, #282130);
 border: 1px solid #554064;
 border-bottom: 3px solid #18111f;
 border-radius: 10px;
 font-size: 10px;
 font-weight: 800;
 cursor: pointer;
 transition: transform .15s, color .15s, border-color .15s, background .15s;
}

.group-category-option:hover {
 border-color: #a886c2;
 color: #fff;
 transform: translateY(-2px);
}

.group-category-option.selected {
 color: #2e213b;
 background: linear-gradient(145deg, #e0c3fa, #b995db);
 border-color: #f0dcff;
 border-bottom-color: #72518a;
 box-shadow: inset 0 1px #ffffff80, 0 0 0 2px #caa9e726;
}

.group-member-editor {
 display: grid;
 gap: 10px;
 margin-top: 6px;
 padding: 13px;
 background: linear-gradient(145deg, #261e30, #211a2b);
 border: 1px solid #493753;
 border-radius: 13px;
}

.group-member-heading {
 display: flex;
 align-items: center;
 justify-content: space-between;
 gap: 8px;
}

.group-member-heading > span {
 display: flex;
 align-items: center;
 gap: 7px;
 color: #f1e5fa;
 font-size: 11px;
 font-weight: 900;
}

.group-member-heading svg {
 color: #d1aff0;
}

.group-member-heading small {
 color: #bba8ca;
 font-size: 9px;
}

.group-member-list {
 display: grid;
 gap: 6px;
 max-height: 180px;
 overflow-y: auto;
 scrollbar-color: #705486 #211a2b;
}

.group-member-option {
 display: flex;
 align-items: center;
 gap: 9px;
 width: 100%;
 min-width: 0;
 padding: 7px 9px;
 color: #f2eaf8;
 background: #30263a;
 border: 1px solid #493753;
 border-radius: 10px;
 text-align: left;
 cursor: pointer;
 transition: background .15s, border-color .15s, transform .15s;
}

.group-member-option:hover {
 background: #392b45;
 border-color: #83639b;
 transform: translateX(2px);
}

.group-member-option.selected {
 background: linear-gradient(100deg, #473454, #34283f);
 border-color: #b58bd5;
 box-shadow: inset 3px 0 #d8b8f3;
}

.group-member-copy {
 display: grid;
 flex: 1;
 min-width: 0;
 gap: 3px;
}

.group-member-copy strong,
.group-member-copy small {
 overflow: hidden;
 text-overflow: ellipsis;
 white-space: nowrap;
}

.group-member-copy strong {
 font-size: 10px;
}

.group-member-copy small {
 color: #bba8ca;
 font-size: 9px;
}

.group-member-role {
 padding: 4px 7px;
 color: #d8c6e7;
 background: #44364f;
 border: 1px solid #645273;
 border-radius: 999px;
 font-size: 7px;
 font-weight: 900;
 letter-spacing: .04em;
}

.group-member-role.admin {
 color: #f2daa2;
 background: #4a3a2a;
 border-color: #806442;
}

.group-member-hint,
.group-member-actions > p {
 margin: 0;
 color: #c4b1d3;
 font-size: 10px;
}

.group-member-actions {
 display: grid;
 gap: 8px;
 padding-top: 10px;
 border-top: 1px solid #493753;
}

.group-member-actions > div {
 display: grid;
 grid-template-columns: 1fr 1fr;
 gap: 8px;
}

.group-member-actions button {
 display: flex;
 align-items: center;
 justify-content: center;
 gap: 7px;
 min-height: 40px;
 border-radius: 10px;
 font-size: 10px;
 font-weight: 900;
 cursor: pointer;
 transition: filter .15s, transform .15s;
}

.group-member-actions button:hover {
 filter: brightness(1.1);
 transform: translateY(-2px);
}

.group-member-actions .member-role-button {
 color: #2e213b;
 background: linear-gradient(145deg, #d8b8f3, #b58bd5);
 border: 1px solid #f0dcff;
 border-bottom: 4px solid #72518a;
}

.group-member-actions .member-remove-button {
 color: #ffcbd2;
 background: linear-gradient(145deg, #59313f, #402530);
 border: 1px solid #965568;
 border-bottom: 4px solid #211119;
}

@media(max-width:700px) {
 .group-category-options {
   grid-template-columns: repeat(2, minmax(0, 1fr));
 }

 .group-member-editor {
   padding: 10px;
 }
}

.group-edit-modal {
 display: flex;
 flex-direction: column;
 width: min(940px, 100%);
 max-height: calc(100vh - 36px);
 gap: 0;
 padding: 0;
 overflow: hidden;
}

.group-edit-hero {
 flex: 0 0 auto;
 margin: 0;
 padding: 22px 28px;
}

.group-edit-content {
 display: grid;
 grid-template-columns: repeat(2, minmax(0, 1fr));
 align-items: start;
 gap: 18px;
 min-height: 0;
 padding: 20px 24px;
 overflow-y: auto;
 scrollbar-color: #76578d #211a2b;
}

.adventure-modal.group-edit-modal > .group-edit-content {
 display: grid;
 justify-content: stretch;
 gap: 18px;
 margin: 0;
}

.group-edit-settings,
.group-member-editor {
 display: flex;
 flex-direction: column;
 align-items: stretch;
 gap: 11px;
 min-width: 0;
 margin: 0;
 padding: 17px;
 background:
   radial-gradient(ellipse at 100% 0, #9b75ba12, transparent 38%),
   linear-gradient(155deg, #292132, #211a2b);
 border: 1px solid #4d3a5b;
 border-bottom: 3px solid #17111e;
 border-radius: 16px;
}

.group-editor-section-title {
 display: flex;
 align-items: center;
 gap: 11px;
 padding-bottom: 13px;
 border-bottom: 1px solid #493753;
}

.group-editor-section-icon,
.group-member-title-icon {
 display: grid;
 place-items: center;
 width: 42px;
 height: 42px;
 flex: 0 0 42px;
 color: #f0ddff;
 background: linear-gradient(145deg, #72558c, #493358);
 border: 1px solid #b28bd1;
 border-bottom: 4px solid #21152b;
 border-radius: 12px;
 box-shadow: inset 0 1px #ffffff38, 0 4px 10px #0e091433;
}

.group-editor-section-title > span:last-child,
.group-member-title-copy {
 display: grid;
 gap: 4px;
 min-width: 0;
}

.group-editor-section-title strong,
.group-member-title-copy strong {
 color: #f4eafa;
 font-size: 13px;
}

.group-editor-section-title small,
.group-member-title-copy small {
 color: #bba8ca;
 font-size: 9px;
 line-height: 1.4;
}

.group-edit-settings > label,
.group-edit-settings .group-edit-field-label,
.group-edit-settings .color-label {
 margin: 3px 0 -4px;
 color: #e7d9f1;
 font-size: 12px;
 font-weight: 750;
}

.group-edit-settings > input,
.group-edit-settings textarea {
 width: 100%;
}

.group-edit-settings .group-category-options {
 grid-template-columns: repeat(2, minmax(0, 1fr));
}

.group-edit-settings .group-category-option {
 min-height: 40px;
 justify-content: flex-start;
 padding-inline: 10px;
}

.group-edit-settings .group-color-options {
 justify-content: space-around;
 gap: 8px;
}

.group-member-editor {
 gap: 11px;
 align-self: start;
}

.group-member-heading {
 display: grid;
 grid-template-columns: 42px minmax(0, 1fr) auto;
 align-items: center;
 gap: 11px;
 padding-bottom: 13px;
 border-bottom: 1px solid #493753;
}

.group-member-heading .group-member-title-icon {
 color: #e8d2fa;
 background: linear-gradient(145deg, #644a7b, #3e2d4d);
 border-color: #9878b0;
}

.group-member-heading .group-member-title-copy {
 display: grid;
 gap: 4px;
 min-width: 0;
}

.group-member-heading > small {
 margin: 0;
 white-space: nowrap;
 padding: 5px 8px;
 color: #d7c3e8;
 background: #392b45;
 border: 1px solid #5b456d;
 border-radius: 999px;
}

.group-member-list {
 max-height: 250px;
 flex: 0 0 auto;
}

.group-member-option {
 min-height: 58px;
 padding: 9px 10px;
 border-radius: 12px;
}

.group-member-option.selected {
 box-shadow: inset 4px 0 #d8b8f3, 0 0 0 2px #caa9e71a;
}

.group-member-copy strong {
 font-size: 11px;
}

.group-member-role {
 font-size: 8px;
}

.group-member-actions {
 margin-top: auto;
 padding: 12px;
 background: #30263a;
 border: 1px solid #59436a;
 border-radius: 13px;
}

.group-member-actions > p {
 font-size: 11px;
}

.group-member-actions button {
 min-height: 44px;
 font-size: 11px;
}

.group-member-hint {
 display: flex;
 align-items: center;
 min-height: 52px;
 padding: 11px 12px;
 background: #30263a;
 border: 1px dashed #705486;
 border-radius: 12px;
 line-height: 1.5;
}

.group-edit-actions {
 flex: 0 0 auto;
 margin: 0;
 padding: 14px 24px 18px;
 background: #211a2b;
 border-top: 1px solid #493753;
}

.adventure-modal.group-edit-modal > .group-edit-actions {
 display: flex;
 justify-content: flex-end;
 margin: 0;
}

@media(max-width:700px) {
 .group-edit-modal {
   max-height: calc(100vh - 20px);
 }

 .group-edit-hero {
   padding: 17px;
 }

 .group-edit-content {
   grid-template-columns: minmax(0, 1fr);
   gap: 12px;
   padding: 13px;
 }

 .group-edit-settings,
 .group-member-editor {
   padding: 13px;
 }

 .group-edit-actions {
   flex-direction: row;
   padding: 12px 13px;
 }

 .adventure-modal.group-edit-modal > .group-edit-actions {
   flex-direction: row;
 }

 .group-edit-actions .game-button {
   width: auto;
   flex: 1;
 }
}

/* Una sola misión diaria: los hábitos son objetivos y el jugador entrega energía al equipo. */
.daily-quest {
  --quest-accent: #9ed35b;
  margin-top: 16px;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--quest-accent) 45%, #4d3c5e);
  border-bottom: 5px solid color-mix(in srgb, var(--quest-accent) 32%, #17101e);
  border-radius: 18px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--quest-accent) 12%, #2b2135), #211a2b 65%);
}

.daily-quest.quest-90 { --quest-accent: #5fc7e8; }
.daily-quest.quest-120 { --quest-accent: #f0a85d; }

.daily-quest-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}

.quest-rank-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border: 2px solid color-mix(in srgb, var(--quest-accent) 62%, white);
  border-radius: 15px;
  background: color-mix(in srgb, var(--quest-accent) 25%, #2c2037);
  box-shadow: inset 0 -5px #0002;
  font-size: 27px;
}

.daily-quest-heading div { display: grid; gap: 2px; }
.daily-quest-heading small { color: var(--quest-accent); font-size: 9px; font-weight: 900; letter-spacing: .08em; }
.daily-quest-heading strong { color: #fff; font-size: 14px; }
.daily-quest-heading span:last-child { color: #bcaec8; font-size: 10px; }

.quest-objectives {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 14px 0 11px;
}

.quest-objectives > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid #5a4768;
  border-radius: 10px;
  background: #1b1522;
  color: #cfc4d8;
  font-size: 10px;
  font-weight: 750;
}

.quest-objectives > span.complete {
  border-color: var(--quest-accent);
  color: #fff;
  background: color-mix(in srgb, var(--quest-accent) 17%, #1b1522);
}

.quest-energy-track {
  height: 9px;
  margin-bottom: 12px;
  overflow: hidden;
  border: 2px solid #130e18;
  border-radius: 99px;
  background: #100c15;
}

.quest-energy-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--quest-accent), color-mix(in srgb, var(--quest-accent) 62%, white));
  box-shadow: 0 0 12px var(--quest-accent);
  transition: width .35s ease;
}

.daily-quest .checkin-button { width: 100%; min-height: 52px; }

.mission-board-title { display: flex; align-items: center; gap: 10px; }
.mission-board-title > span { font-size: 29px; }
.mission-board-title > div { display: grid; gap: 1px; }
.mission-board-title small { color: #9ed35b; font-size: 9px; font-weight: 900; letter-spacing: .08em; }
.mission-board-title h2 { margin: 0; }
.mission-board-copy { margin: -3px 0 14px; color: #b9a9c5; font-size: 11px; }
.mission-board-90 .mission-board-title small { color: #5fc7e8; }
.mission-board-120 .mission-board-title small { color: #f0a85d; }
.mission-board-30 { box-shadow: inset 4px 0 #9ed35b; }
.mission-board-90 { box-shadow: inset 4px 0 #5fc7e8; }
.mission-board-120 { box-shadow: inset 4px 0 #f0a85d; }

@media(max-width:700px) {
  .daily-quest { padding: 14px; }
  .daily-quest-heading { align-items: flex-start; }
  .quest-rank-icon { width: 44px; height: 44px; font-size: 23px; }
}

.adventure-body.side-chat-active { grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; }
.expanded-side-chat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 195px);
  min-height: 560px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.expanded-side-chat > :last-child { min-height: 0; flex: 1; overflow: hidden; border-radius: 17px; }
.side-roster {
  display: grid;
  gap: 8px;
  padding: 15px;
  flex: 0 0 auto;
  border-color: #6c4e7f;
  background: linear-gradient(145deg, #32233e, #251a30);
}

.side-roster .game-title { margin: 0 0 4px; }
.side-roster .game-title h2 { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
.side-roster .game-title svg { color: #d5b2ef; }
.side-roster .roster-member {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 9px;
  border: 1px solid #554064;
  border-bottom: 3px solid #1a1221;
  border-radius: 12px;
  background: #2a2035;
}

.side-roster .roster-member-copy { display: grid; flex: 1; min-width: 0; gap: 4px; font-size: 11px; }
.side-roster .roster-role { width: fit-content; margin: 0; }
.side-roster .roster-member-check { padding: 5px 7px; font-size: 8px; }

.player-panel {
  position: relative;
  overflow: hidden;
  border-color: #705684;
  background: radial-gradient(circle at 92% 20%, #ba8dda25, transparent 25%), linear-gradient(120deg, #30243c, #251b31);
}

.player-panel::after {
  position: absolute;
  right: -18px;
  bottom: -42px;
  content: '✦';
  color: #d3b0f3;
  font-size: 120px;
  opacity: .12;
  pointer-events: none;
}

.team-habits { padding: 19px; }
.team-habits .game-title { padding-bottom: 13px; border-bottom: 1px solid #493652; }
.team-habit-row { border-radius: 14px; }
.mission-board-title > span { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; background: #443154; font-size: 22px; }

@media(max-width:1050px) {
  .adventure-body.side-chat-active { grid-template-columns: minmax(0, 1fr) 285px; }
}

@media(max-width:860px) {
  .adventure-status { grid-template-columns: 1fr; gap: 8px; }
  .adventure-body.side-chat-active { grid-template-columns: 1fr; }
  .expanded-side-chat { position: static; height: auto; min-height: 0; }
  .expanded-side-chat > :last-child { min-height: 500px; }
  .side-roster { order: 0; }
}

/* Escena compacta para que el valle tenga el peso de una ilustración de campamento. */
.adventure-page {
  background:
    radial-gradient(ellipse at 50% -20%, #6e438340, transparent 48%),
    linear-gradient(180deg, #1c1429, #120d1c 62%);
}

.adventure-header {
  padding: 2px 3px 15px;
  border-bottom: 1px solid #624374;
}

.adventure-header h1 { color: #f9e5c5; font-size: 24px; }
.adventure-header .back { color: #d9aef4; }
.adventure-header .invite-badge { border-radius: 12px; background: #33203f; border-color: #8955a1; }

.world {
  height: 276px;
  border: 2px solid #8c6ca3;
  border-bottom: 5px solid #26162f;
  border-radius: 20px;
  background: linear-gradient(180deg, #4e3f78 0%, #6b568d 42%, #364d6d 43%, #223b4e 100%);
  box-shadow: 0 12px 25px #0d081b75;
}

.world-hud { top: 12px; left: 14px; right: 14px; }
.world-title {
  position: relative;
  min-width: 125px;
  padding: 9px 12px;
  color: #56364b;
  background: #f0c991;
  border-color: #a36e64;
  border-bottom-color: #7c504f;
  border-radius: 8px 13px 13px 8px;
  box-shadow: 0 3px 0 #2a183733;
}
.world-title::after { content: '✦'; position: absolute; right: -9px; top: -9px; color: #e8b95b; font-size: 18px; }
.world-streak, .world-time { padding: 6px 9px; color: #5a3850; background: #fff0d1; border-color: #d09a7d; border-bottom-width: 3px; }
.world-streak { margin-left: auto; }
.sun { top: 52px; right: 24%; width: 34px; height: 34px; background: #f6daa0; box-shadow: 0 0 0 9px #f6d79524; }
.cloud { opacity: .34; top: 78px; background: #cfbfdf; transform: scale(.7); }
.cloud-two { top: 96px; }
.mountain { bottom: 59px; height: 148px; background: #394365; opacity: .9; }
.mountain-two { bottom: 58px; height: 167px; background: #534b78; }
.mountain-three { bottom: 54px; height: 150px; background: #30395d; }
.hill { bottom: 0; height: 104px; background: #344d55; }
.hill-two { bottom: -5px; height: 102px; background: #283f4d; }
.trail { bottom: -78px; width: 58%; height: 130px; background: #8e9677; box-shadow: 0 -6px 0 #5c7967; }
.pine { bottom: 58px; transform: scale(.58); transform-origin: bottom; background: #1f494a; }
.pine-two { transform: scale(.57); }
.pine-three { bottom: 64px; transform: scale(.36); }
.camp-flag { right: 9%; bottom: 58px; height: 52px; background: #604447; }
.camp-flag:after { background: #d85a6c; }
.flower { bottom: 35px; font-size: 15px; }
.flower-two { bottom: 30px; }
.flower-three { bottom: 42px; }
.world-route { top: 98px; left: 31%; right: 25%; }
.world-route:before { border-top-color: #e6cbe88c; }
.route-stop > span { width: 25px; height: 25px; }
.players { bottom: 40px; }
.player { transform: scale(.78); transform-origin: bottom center; }
.world-bottom { min-height: 38px; padding: 8px 13px; background: #1d2938ed; font-size: 9px; }
.team-lives { transform: scale(.86); transform-origin: right center; }

.camp-tent { position: absolute; left: 43%; bottom: 51px; width: 74px; height: 71px; background: #b56787; clip-path: polygon(50% 0, 100% 100%, 0 100%); filter: drop-shadow(0 4px 0 #332041); }
.camp-tent::before { content: ''; position: absolute; inset: 11px 11px 0; background: #e09eab; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.camp-tent i { position: absolute; z-index: 1; left: 31px; bottom: 0; width: 15px; height: 30px; background: #38243f; border-radius: 9px 9px 0 0; }
.camp-lantern { position: absolute; z-index: 2; width: 12px; height: 16px; background: #ffcc78; border: 3px solid #49344a; border-radius: 4px; box-shadow: 0 0 18px #ffca697d; }
.camp-lantern::before { content: ''; position: absolute; width: 12px; height: 7px; top: -10px; left: -3px; border: 2px solid #49344a; border-bottom: 0; border-radius: 9px 9px 0 0; }
.lantern-one { left: 35%; top: 70px; }.lantern-two { right: 10%; top: 92px; transform: scale(.76); }
.firefly { position: absolute; z-index: 3; width: 4px; height: 4px; background: #ffe98e; border-radius: 50%; box-shadow: 0 0 9px 3px #ffe98e80; animation: firefly 2.3s ease-in-out infinite alternate; }
.firefly-one { left: 37%; bottom: 106px; }.firefly-two { right: 28%; bottom: 96px; animation-delay: .7s; }.firefly-three { left: 20%; bottom: 70px; animation-delay: 1.1s; }
@keyframes firefly { to { transform: translateY(-8px); opacity: .25; } }

.player-panel {
  display: grid;
  grid-template-columns: minmax(180px, .85fr) minmax(250px, 1.15fr);
  align-items: center;
  gap: 14px 20px;
  min-height: 125px;
  padding: 16px 20px;
  background: linear-gradient(105deg, #3c2a4d, #4d315e);
  border-color: #86648f;
}
.player-panel .player-detail-heading { grid-column: 1; grid-row: 1; }
.player-panel .current-habit { grid-column: 1; grid-row: 2; margin: 0; }
.player-panel .player-metrics, .player-panel .last-message { display: none; }
.player-panel .daily-quest { grid-column: 2; grid-row: 1 / 3; margin: 0; padding: 0; border: 0; background: transparent; }
.player-panel .daily-quest-heading { padding-bottom: 7px; }.player-panel .quest-rank-icon { width: 44px; height: 44px; font-size: 23px; }
.player-panel .quest-objectives { display: none; }.player-panel .quest-energy-track { height: 7px; margin: 8px 0; }
.player-panel .checkin-button { min-height: 43px; font-size: 12px; }
.player-panel .check-notice { grid-column: 1 / -1; margin: 0; }

.team-habits { position: relative; padding: 20px; border-color: #79568e; background: linear-gradient(180deg, #33253f, #271d33); }
.team-habits::before, .team-habits::after { position: absolute; color: #b1d181; opacity: .85; font-size: 25px; pointer-events: none; }
.team-habits::before { content: '❋'; left: -10px; top: -12px; }.team-habits::after { content: '❋'; right: -7px; bottom: -14px; }
.mission-board-title > span { transform: rotate(-7deg); background: #83537d; border: 1px solid #b982a5; }
.team-habit-row { padding: 14px; background: #3b2b49; border-color: #70577b; }
.team-habit-row:hover { background: #463453; border-color: #9a74a3; }

@media(max-width:860px) {
  .world { height: 300px; }
  .player-panel { grid-template-columns: 1fr; }.player-panel .player-detail-heading,.player-panel .current-habit,.player-panel .daily-quest { grid-column: auto; grid-row: auto; }
  .camp-tent { left: 42%; }.world-route { left: 26%; right: 18%; }
}

@media(prefers-reduced-motion:reduce) { .firefly { animation: none; } }

/* El orden nuevo usa otra distribución, pero el tema vuelve a definir el ambiente. */
.adventure-page {
  background: radial-gradient(ellipse at 88% 0%, color-mix(in srgb, var(--theme-dark) 38%, transparent), transparent 43%), #151520;
}
.adventure-header { padding: 0 0 14px; border: 0; }
.adventure-header h1,
.adventure-page .game-title h2,
.adventure-page .mission-board-title h2,
.adventure-page .player-detail-heading h2 {
  font-family: 'Baloo 2', var(--font);
  font-weight: 800;
  letter-spacing: -.025em;
}
.adventure-header h1 { color: #f7f1dd; font-size: clamp(28px, 3vw, 36px); line-height: .95; }
.adventure-header .back { color: #cdb6de; }
.adventure-header .invite-badge { background: #302638; border-color: color-mix(in srgb, var(--theme-accent) 45%, #594368); }

.world {
  height: 360px;
  background: var(--sky, #b5dccb);
  border: 3px solid #5e766d;
  border-bottom: 5px solid #0b1014;
  border-radius: 19px;
  box-shadow: 0 5px 0 #0b1014;
}
.world-hud { top: 15px; left: 17px; right: 17px; }
.world-title, .world-streak, .world-time { color: #273f38; background: #f5eed3ef; border-color: #6c8873; border-bottom-color: #617d66; }
.world-title { min-width: 0; border-radius: 9px; box-shadow: 0 4px 0 #38524716; }
.world-title::after { content: none; }
.world-streak, .world-time { padding: 7px 10px; }
.world-time { transition: background-color .35s, color .35s, box-shadow .35s, transform .35s; }
.world-time-warning { color: #593718; background: #ffe2a3; border-color: #d59a4c; box-shadow: 0 0 0 3px #ffc96c35; }
.world-time-urgent { color: #fff7f3; background: #b94b50; border-color: #ef8b75; box-shadow: 0 0 0 4px #ed6a5738, 0 0 22px #ef635b70; animation: countdown-pulse 1.2s ease-in-out infinite; }
.world-time-complete { color: #354629; background: #d9edb7; border-color: #91b56a; box-shadow: none; }
@keyframes countdown-pulse { 50% { transform: scale(1.045); filter: brightness(1.12); } }
.sun { top: 45px; right: 22%; width: 65px; height: 65px; background: #fff0b7; box-shadow: 0 0 0 14px #fff2c72e; }
.cloud { opacity: 1; top: 88px; background: #eef6e3; transform: none; }.cloud-two { top: 132px; }
.mountain { bottom: 105px; height: 250px; background: var(--mountain, #82afa0); opacity: 1; }
.mountain-two { bottom: 95px; height: 280px; background: color-mix(in srgb, var(--mountain, #82afa0) 80%, #fff 20%); }
.mountain-three { bottom: 105px; height: 310px; background: color-mix(in srgb, var(--mountain, #82afa0) 85%, #244838 15%); }
.hill { bottom: 0; height: 205px; background: var(--grass, #95b975); }.hill-two { bottom: 5px; height: 185px; background: color-mix(in srgb, var(--grass, #95b975) 80%, #355d40 20%); }
.trail { bottom: -60px; width: 70%; height: 175px; background: #d5c290; box-shadow: 0 -10px 0 #afbc7c; }
.pine { bottom: 105px; transform: none; background: #4f7e60; }.pine-two { transform: scale(.9); }.pine-three { bottom: 124px; transform: scale(.55); }
.camp-flag { right: 12%; bottom: 102px; height: 73px; background: #655742; }.camp-flag:after { background: #b27a85; }
.flower { bottom: 68px; font-size: 22px; }.flower-two { bottom: 58px; }.flower-three { bottom: 95px; }
.world-route { top: 119px; left: 22%; right: 25%; }.world-route:before { border-top-color: #f2eed1a1; }.route-stop > span { width: 29px; height: 29px; }
.players { bottom: 54px; }.player { transform: none; }.world-bottom { min-height: 0; padding: 12px 16px; background: #0d1920dd; font-size: 10px; }.team-lives { transform: none; }
.camp-tent, .camp-lantern, .firefly { display: none; }

.player-panel { background: #2a2133; border: 0; box-shadow: 0 10px 28px #0e091326; }
.team-habits { background: #282031; border: 0; box-shadow: 0 10px 28px #0e091326; }
.team-habits::before, .team-habits::after { content: none; }
.team-habit-row { background: #30263a; border: 0; box-shadow: inset 0 -1px #ffffff0b; }.team-habit-row:hover { background: #352941; border: 0; }
.mission-board-title > span { transform: none; background: color-mix(in srgb, var(--theme-accent) 20%, #382b45); border: 0; }
.side-roster { border: 0; background: #2a2034; box-shadow: 0 10px 24px #0e091326; }
.side-roster .roster-member { border: 0; background: #33273d; box-shadow: inset 0 -1px #ffffff0c; }

@media(max-width:860px) { .world { height: 410px; } }

/* Ajuste del valle en anchos intermedios: cada capa conserva su propio espacio. */
.world {
  height: clamp(330px, 33vw, 390px);
}

.world-route {
  top: 102px;
  left: 23%;
  right: 23%;
}

.players {
  bottom: 92px;
}

.player {
  min-width: 94px;
}

.world-bottom {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  align-items: center;
  gap: 10px 18px;
  min-height: 68px;
  padding: 10px 16px;
}

.world-bottom > span {
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.world-progress {
  width: min(100%, 310px);
  min-width: 0;
}

.team-lives {
  grid-column: 2;
  grid-row: 1 / span 2;
  justify-self: end;
  min-width: 0;
  gap: 3px 8px;
}

.lives-caption { max-width: 150px; text-align: right; }

@media(max-width:660px) {
  .world { height: 340px; }
  .world-route { top: 34px; left: 14%; right: 14%; }
  .players { bottom: 84px; }
  .player { min-width: 72px; transform: scale(.82); transform-origin: bottom center; }
  .player-bubble { margin-bottom: 14px; }
  .world-bottom { grid-template-columns: minmax(0, 1fr); gap: 7px; padding: 9px 11px; }
  .world-progress { width: 100%; }
  .team-lives { grid-column: 1; grid-row: auto; justify-self: start; }
  .lives-caption { max-width: none; text-align: left; }
}

/* Deja aire entre el recorrido, el estado del personaje y la zona de energía. */
@media(min-width:661px) {
  .world-route { top: 34px; }
  .player-bubble { margin-bottom: 14px; }
}

/* El chat lateral mantiene el espacio para leer y escribir con comodidad. */
.adventure-body.side-chat-active { grid-template-columns: minmax(0, 1fr) minmax(370px, 410px); gap: 20px; }
.expanded-side-chat { height: calc(100vh - 130px); min-height: 560px; gap: 14px; }
.expanded-side-chat > :last-child { min-height: 420px; flex: 1 1 auto; }
.expanded-side-chat :deep(.chat) { min-height: 0; height: 100%; border-radius: 18px; overflow: hidden; }

@media(max-width:1050px) {
  .adventure-body.side-chat-active { grid-template-columns: minmax(0, 1fr) 350px; gap: 16px; }
}

@media(max-width:860px) {
  .adventure-body.side-chat-active { grid-template-columns: minmax(0, 1fr); }
  .expanded-side-chat { height: auto; min-height: 0; }
  .expanded-side-chat > :last-child { min-height: 520px; }
}
.player-panel .mission-habits {
  display: grid;
  gap: 10px;
  align-content: start;
}
.mission-habits ul {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.mission-habits li > :is(label, span) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: #ffffff09;
  overflow-wrap: anywhere;
}
.mission-habits label { cursor: pointer; }
.mission-habits input { flex-shrink: 0; accent-color: var(--theme-accent); width: 18px; height: 18px; }
.mission-habits label:has(input:checked) { background: #a6d76525; }
.mission-habits p { margin: 0; overflow-wrap: anywhere; }
.mission-note { display: grid; gap: 6px; margin-bottom: 12px; font-size: 12px; }
.mission-note input {
  min-width: 0;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: #17121e;
}
.player .player-bubble {
  display: grid;
  text-align: center;
  max-width: 145px;
  white-space: normal;
  overflow-wrap: anywhere;
}
.player-daily-note {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 8px;
}
.group-header-emblem {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  padding: 0;
  color: #fff;
  background: linear-gradient(145deg, var(--emblem-color, #b995db), #30213d);
  border: 0;
  border-bottom: 4px solid #1b1123;
  border-radius: 15px;
  box-shadow: 0 5px 14px rgba(10, 5, 18, 0.5);
  cursor: default;
  transition: transform 0.16s, filter 0.16s;
}
.group-header-emblem.editable {
  cursor: pointer;
}
.group-header-emblem.editable:hover {
  transform: translateY(-2px);
  filter: brightness(1.08);
}
.group-brand-copy {
  min-width: 0;
}
.group-brand-copy h1 {
  margin: 2px 0 0;
}
.group-brand-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.group-category-tag {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d8f39c;
}
.group-inline-edit {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid #6b4e84;
  background: #2f233b;
  color: #e4ccf8;
  font-size: 10px;
  font-weight: 750;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}
.group-inline-edit:hover {
  background: #3d2d4d;
  border-color: #a982cb;
  transform: translateY(-1px);
}
.adventure-header {
  position: relative;
  overflow: hidden;
  padding: 16px 20px;
  border-radius: 20px;
  border: 0;
  border-bottom: 4px solid #100a19;
  background: #1d1329;
  box-shadow: 0 10px 26px rgba(10, 6, 20, 0.5);
}
.adventure-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--header-banner);
  background-size: cover;
  background-position: center;
  filter: var(--header-banner-filter, none);
  z-index: 0;
}
.adventure-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    92deg,
    rgba(16, 10, 26, 0.72) 0%,
    rgba(16, 10, 26, 0.28) 45%,
    rgba(16, 10, 26, 0.08) 100%
  );
  z-index: 0;
}
.adventure-header > * {
  position: relative;
  z-index: 1;
}
.group-brand-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #c2b3d1;
  line-height: 1.4;
}
.world {
  position: relative;
  overflow: hidden;
  border: 0 !important;
  border-radius: 22px;
  background: #0b0813;
}
.world::before {
  content: '';
  position: absolute;
  inset: -4% -4% 34px -4%;
  background-image: var(--world-bg);
  background-size: cover;
  background-position: center bottom;
  z-index: 0;
  pointer-events: none;
}
.world > .scenery {
  display: none;
}
.world > :not(.scenery) {
  z-index: 1;
}
.world .players {
  bottom: 63px;
  max-height: 250px;
  padding: 16px 14px 0;
}
.world .player:nth-child(even) {
  margin-bottom: 4px;
}
.world .player .player-bubble,
.member-note-cloud {
  --cloud-bg: #fffdf9;
  position: relative;
  isolation: isolate;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 84px;
  max-width: 170px;
  margin: 4px 0 14px;
  padding: 7px 14px;
  border: 0 !important;
  border-radius: 18px;
  background: var(--cloud-bg);
  color: #2c1f3d;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
  filter:
    drop-shadow(0 3px 0 rgba(25, 16, 40, 0.28))
    drop-shadow(0 6px 12px rgba(10, 6, 20, 0.18));
  transition: transform 0.2s ease;
}
.world .player.completed .player-bubble {
  --cloud-bg: #ffffff;
}
.world .player:hover .player-bubble {
  transform: translateY(-2px);
}
/* Sin circulitos alrededor: solo la burbuja limpia y las dos bolitas de abajo */
.world .player .player-bubble::before,
.member-note-cloud::before {
  content: none;
}
/* Dos bolitas de diálogo abajo */
.world .player .player-bubble::after,
.member-note-cloud::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -15px;
  width: 28px;
  height: 16px;
  transform: translateX(-50%);
  background:
    radial-gradient(circle at 58% 4px, var(--cloud-bg) 4.8px, transparent 5.5px),
    radial-gradient(circle at 36% 12px, var(--cloud-bg) 3px, transparent 3.7px);
  z-index: -1;
  pointer-events: none;
}
.world .player .player-daily-note {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  font-size: 10.5px;
  font-weight: 850;
  line-height: 1.25;
  color: #241833;
}
.world .player .player-bubble-meta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 8.5px;
  font-weight: 800;
  color: #6a5880;
  line-height: 1.15;
}
.world .player.completed .player-bubble-meta {
  color: #3d6d34;
}
.world .player .player-bubble.has-note .player-bubble-meta {
  padding: 1px 6px;
  border-radius: 999px;
  background: #e6f4d2;
  color: #355e2d;
  font-size: 8px;
}
.member-note-cloud {
  width: fit-content;
  min-width: 90px;
  max-width: 240px;
  margin: 6px 0 16px !important;
  padding: 8px 16px;
  border-radius: 18px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
}
.member-note-cloud::after {
  left: 22px;
  transform: none;
}
.world .world-bottom {
  position: absolute;
  bottom: -3px;
  left: -3px;
  right: -3px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 47px;
  padding: 5px 19px 8px;
  background: linear-gradient(180deg, rgba(16, 12, 26, 0.92), #0b0813 65%);
  backdrop-filter: blur(8px);
  border: 0;
}
.world .hud-energy-cluster {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  flex: 1;
}
.world .hud-energy-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #f6efe2;
  white-space: nowrap;
}
.world .hud-energy-label svg {
  color: #ffad47;
}
.world .hud-energy-label small {
  color: #c2b6d1;
  font-size: 10px;
  font-weight: 700;
}
.world .world-progress {
  width: min(190px, 100%);
  height: 10px;
  border-radius: 999px;
  background: rgba(10, 7, 18, 0.85);
  border: 0;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.65);
  padding: 1px;
}
.world .world-progress > span {
  border-radius: 999px;
  background: linear-gradient(90deg, #86e062, #c8ef72);
  box-shadow: none;
}
.world .team-lives {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  padding: 3px 10px 3px 12px;
  border-radius: 999px;
  background: rgba(9, 6, 16, 0.72);
  border: 0;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.55);
}
.world .lives-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
  gap: 1px;
}
.world .lives-label {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #efe7fb;
}
.world .lives-caption {
  font-size: 8px;
  font-weight: 700;
  color: #b5e4a0;
}
.world .team-lives.lives-at-risk .lives-caption {
  color: #ffd074;
}
.world .heart-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.world .life-token {
  width: 24px;
  height: 24px;
  overflow: visible;
  transition: transform 0.2s ease, filter 0.2s ease;
}
.world .life-token .token-main,
.world .life-token .token-stem {
  fill: rgba(255, 255, 255, 0.16);
  stroke: none;
}
.world .life-token .token-spot {
  fill: rgba(255, 255, 255, 0.08);
}
/* Colores vivos estilo barra de videojuego cuando el icono de vida está activo (sin bordes brillantes) */
.world .life-token.alive {
  filter: drop-shadow(0 2px 0 rgba(10, 6, 18, 0.85));
}
.world .life-token.kind-heart.alive .token-main {
  fill: #ff567e;
}
.world .life-token.kind-heart.alive .token-spot {
  fill: #ffdce5;
}
.world .life-token.kind-mushroom.alive .token-main {
  fill: #ff5964;
}
.world .life-token.kind-mushroom.alive .token-stem {
  fill: #f6e7c8;
}
.world .life-token.kind-mushroom.alive .token-spot {
  fill: #fff7e6;
}
.world .life-token.kind-star.alive .token-main {
  fill: #ffd447;
}
.world .life-token.kind-star.alive .token-spot {
  fill: #fff6c2;
}
.world .life-token.kind-sun.alive .token-main {
  fill: #ff9f2e;
}
.world .life-token.kind-sun.alive .token-spot {
  fill: #ffe875;
}
.world .life-token.kind-flame.alive .token-main {
  fill: #ff5447;
}
.world .life-token.kind-flame.alive .token-spot {
  fill: #ffdd63;
}
/* Estado en riesgo (misión pendiente hoy) */
.world .life-token.threatened {
  animation: heart-warning 0.9s ease-in-out infinite alternate;
}
/* Banners temáticos del grupo y ventanas con el color profundo de la temática (fucsia/tema del grupo) */
.adventure-page {
  --group-soft: color-mix(in srgb, var(--group-accent, #8b5cf6) 66%, #f4ebff);
  --group-window-bg: color-mix(in srgb, var(--group-accent) 8%, #201b28);
  --group-card-bg: color-mix(in srgb, var(--group-accent) 11%, #251f2d);
}
.adventure-page .team-habits {
  overflow: hidden;
  padding: 20px;
  border-radius: 20px;
  background: var(--group-window-bg) !important;
  box-shadow: 0 12px 28px rgba(10, 6, 20, 0.35);
}
.adventure-page .team-habits .mission-board-copy {
  color: #f3e8fb;
}
.adventure-page .team-habits > .game-title {
  position: relative;
  overflow: hidden;
  margin: -20px -20px 14px;
  padding: 18px 20px;
  min-height: 82px;
  border-bottom: 0;
  background: color-mix(in srgb, var(--group-accent, #8b5cf6) 38%, #21152e);
}
.adventure-page .team-habits > .game-title::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--group-section-banner);
  background-size: 103% 238%;
  background-position: center 49.5%;
  background-repeat: no-repeat;
  z-index: 0;
  pointer-events: none;
}
.adventure-page .team-habits > .game-title::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    92deg,
    rgba(16, 10, 26, 0.56) 0%,
    rgba(16, 10, 26, 0.18) 52%,
    rgba(16, 10, 26, 0.40) 100%
  );
  z-index: 0;
  pointer-events: none;
}
.adventure-page .team-habits > .game-title > * {
  position: relative;
  z-index: 1;
}
.adventure-page .mission-board-title > span {
  color: #fff;
  background: linear-gradient(
    145deg,
    var(--group-accent, #8b5cf6),
    color-mix(in srgb, var(--group-accent, #8b5cf6) 38%, #22162f)
  );
  box-shadow: 0 5px 14px rgba(10, 5, 18, 0.45);
}
.adventure-page .mission-board-title small {
  color: #f6edff !important;
  text-shadow: 0 1px 6px rgba(10, 5, 18, 0.85);
}
.adventure-page .mission-board-title h2 {
  color: #fff;
  text-shadow: 0 2px 8px rgba(10, 5, 18, 0.8);
}
.adventure-page .team-habits .game-title > .game-button.add-habit-button {
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--group-accent, #8b5cf6),
    color-mix(in srgb, var(--group-accent, #8b5cf6) 58%, #1f142b)
  );
  border: 0;
  box-shadow: 0 4px 12px rgba(10, 5, 18, 0.48) !important;
}
.adventure-page .team-habit-row {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background: var(--group-surface) !important;
}
.adventure-page .team-habit-row > * {
  position: relative;
  z-index: 1;
}
.adventure-page .team-habit-copy small {
  color: #f2e6fa;
}
.adventure-page .team-habit-row .habit-actions .edit-habit:not(.remove-habit) {
  background: color-mix(in srgb, var(--group-accent, #8b5cf6) 36%, #241732);
  color: #f8effd;
}
.adventure-page .team-habit-icon {
  color: #fff;
  background: linear-gradient(
    145deg,
    var(--group-accent, #8b5cf6),
    color-mix(in srgb, var(--group-accent, #8b5cf6) 38%, #22162f)
  );
  border: 0;
}
.adventure-page .player-panel {
  background: var(--group-window-bg) !important;
}
.adventure-page .player-panel .mission-habits li > :is(label, span) {
  background: var(--group-card-bg);
}
.adventure-page .side-roster {
  background: var(--group-window-bg) !important;
}
.adventure-page .side-roster .roster-member {
  background: var(--group-card-bg) !important;
}
.adventure-page .player-panel .daily-quest {
  --quest-accent: var(--group-accent, #9ed35b);
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  border: 0 !important;
  background: var(--group-surface) !important;
  color: #fff;
}
.adventure-page .player-panel .daily-quest > * {
  position: relative;
  z-index: 1;
}
.adventure-page .player-panel .daily-quest-heading small {
  color: var(--group-soft);
  text-shadow: 0 1px 6px rgba(12, 7, 20, 0.72);
}
.adventure-page .player-panel .daily-quest-heading strong {
  color: #fff;
  text-shadow: 0 2px 8px rgba(12, 7, 20, 0.72);
}
.adventure-page .player-panel .daily-quest-heading span:last-child {
  color: #f4ecfb;
  text-shadow: 0 1px 6px rgba(12, 7, 20, 0.68);
}
.adventure-page .player-panel .quest-rank-icon {
  color: #231730 !important;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--group-accent, #8b5cf6) 56%, #f8f0ff),
    var(--group-soft)
  ) !important;
}
.adventure-page .player-panel .mission-note {
  color: #f7f0fd;
  font-weight: 700;
  text-shadow: 0 1px 5px rgba(12, 7, 20, 0.65);
}
.adventure-page .player-panel .mission-note input {
  background: rgba(18, 12, 28, 0.64);
  color: #fff;
}
.adventure-page .mission-habits input {
  accent-color: var(--group-accent, var(--theme-accent));
}
.adventure-page .mission-habits label:has(input:checked) {
  background: color-mix(in srgb, var(--group-accent, #8b5cf6) 22%, rgba(255, 255, 255, 0.05));
}
.adventure-page .side-roster .game-title svg {
  color: var(--group-accent, #d5b2ef);
}
/* Armonización completa con el color del grupo (tono suave y luminoso, sin ser chillón) */
.adventure-page {
  --group-soft: color-mix(in srgb, var(--group-accent, #8b5cf6) 66%, #f4ebff);
  --group-surface: var(--group-card-bg);
}
.adventure-page .adventure-header .edit-group-trigger {
  color: #231730;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--group-accent, #8b5cf6) 56%, #f9f2ff),
    var(--group-soft)
  );
}
.adventure-page .adventure-header .invite-badge {
  background: color-mix(in srgb, var(--group-accent, #8b5cf6) 22%, #241932);
}
.adventure-page .group-category-tag {
  color: color-mix(in srgb, var(--group-accent, #8b5cf6) 52%, #ffffff);
}
.adventure-page .world-pip {
  background: var(--group-soft);
}
.adventure-page .route-stop.reached > span {
  background: var(--group-soft);
  color: #241832;
  border-color: color-mix(in srgb, var(--group-accent, #efd58a) 35%, #fff);
  border-bottom-color: color-mix(in srgb, var(--group-accent, #efd58a) 45%, #1c1328);
}
.adventure-page .player.own-player .player-name {
  background: color-mix(in srgb, var(--group-accent) 28%, #fbf5e6);
}
.adventure-page .player.selected .player-name {
  background: color-mix(in srgb, var(--group-accent) 55%, #fbf5e6);
}
.adventure-page .world .player.completed .player-bubble-meta {
  color: color-mix(in srgb, var(--group-accent, #3d6d34) 68%, #221730);
}
.adventure-page .world .player .player-bubble.has-note .player-bubble-meta {
  background: color-mix(in srgb, var(--group-accent, #8b5cf6) 22%, #f5f0fb);
  color: color-mix(in srgb, var(--group-accent, #8b5cf6) 72%, #1c1228);
}
.adventure-page .world .hud-energy-label svg {
  color: var(--group-soft);
}
.adventure-page .world .world-progress > span {
  background: linear-gradient(
    90deg,
    var(--group-soft),
    color-mix(in srgb, var(--group-accent, #c8ef72) 45%, #ffffff)
  );
}
.adventure-page .world .lives-caption {
  color: color-mix(in srgb, var(--group-accent, #b5e4a0) 52%, #ffffff);
}
/* Colores de vida por temática del grupo (suaves y luminosos) */
.adventure-page .world .heart-row[data-theme='pink'] .life-token.alive .token-main {
  fill: #ff7aa8;
}
.adventure-page .world .heart-row[data-theme='pink'] .life-token.alive .token-spot {
  fill: #ffe3ee;
}
.adventure-page .world .heart-row[data-theme='purple'] .life-token.alive .token-main {
  fill: #c194ff;
}
.adventure-page .world .heart-row[data-theme='purple'] .life-token.alive .token-spot {
  fill: #f5ebff;
}
.adventure-page .world .heart-row[data-theme='green'] .life-token.alive .token-main {
  fill: #5ce092;
}
.adventure-page .world .heart-row[data-theme='green'] .life-token.alive .token-stem {
  fill: #f6e7c8;
}
.adventure-page .world .heart-row[data-theme='green'] .life-token.alive .token-spot {
  fill: #ffffff;
}
.adventure-page .world .heart-row[data-theme='amber'] .life-token.alive .token-main {
  fill: #ffbe4d;
}
.adventure-page .world .heart-row[data-theme='amber'] .life-token.alive .token-spot {
  fill: #fff4b8;
}
.adventure-page .world .heart-row[data-theme='blue'] .life-token.alive .token-main {
  fill: #64ceff;
}
.adventure-page .world .heart-row[data-theme='blue'] .life-token.alive .token-spot {
  fill: #e8f8ff;
}
.adventure-page .world .heart-row[data-theme='red'] .life-token.alive .token-main {
  fill: #ff6b7b;
}
.adventure-page .world .heart-row[data-theme='red'] .life-token.alive .token-spot {
  fill: #ffe580;
}
/* Checks del grupo sincronizados con la temática del grupo en tono suave */
.adventure-page .team-roster .roster-member-check.complete,
.adventure-page .team-habit-row .habit-check-state.complete {
  color: #231730;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--group-accent, #8b5cf6) 54%, #f8f0ff),
    var(--group-soft)
  );
  border-color: transparent;
}
.adventure-page .team-habits .game-title > .game-button.add-habit-button {
  color: #231730;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--group-accent, #8b5cf6) 54%, #f8f0ff),
    var(--group-soft)
  );
}
.adventure-page .mission-board-title > span,
.adventure-page .team-habit-icon {
  color: #231730;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--group-accent, #8b5cf6) 58%, #f8f0ff),
    var(--group-soft)
  );
}
.adventure-page .customize-link {
  color: var(--group-soft);
}
/* Contador grande y notorio al final hasta las 12:00 a. m. (sin bordes, fondo del grupo, solo letras rojas cuando hay pendientes) */
.adventure-page .midnight-countdown-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  padding: 22px 26px;
  border-radius: 20px;
  border: 0 !important;
  box-shadow: 0 10px 28px rgba(10, 6, 20, 0.28) !important;
  background: var(--group-window-bg) !important;
  color: #f7f1fc;
}
.adventure-page .midnight-countdown-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--group-section-banner);
  background-size: 103% 238%;
  background-position: center 49.5%;
  background-repeat: no-repeat;
  opacity: 0.56;
  z-index: 0;
  pointer-events: none;
}
.adventure-page .midnight-countdown-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--group-accent, #8b5cf6) 36%, rgba(22, 15, 34, 0.50)) 0%,
    color-mix(in srgb, var(--group-accent, #8b5cf6) 42%, rgba(22, 15, 34, 0.64)) 45%,
    color-mix(in srgb, var(--group-accent, #8b5cf6) 38%, rgba(20, 13, 30, 0.74)) 100%
  );
  z-index: 0;
  pointer-events: none;
}
.adventure-page .midnight-countdown-card > * {
  position: relative;
  z-index: 1;
}
.adventure-page .midnight-countdown-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.adventure-page .midnight-countdown-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.adventure-page .midnight-countdown-badge {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 15px;
  color: #241832;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--group-accent, #8b5cf6) 56%, #f8f0ff),
    var(--group-soft)
  );
}
.adventure-page .midnight-countdown-kicker {
  display: block;
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: var(--group-soft);
}
.adventure-page .midnight-countdown-card.is-danger .midnight-countdown-kicker {
  color: #ff8594;
}
.adventure-page .midnight-countdown-head h3 {
  margin: 3px 0 0;
  font-family: 'Baloo 2', var(--font);
  font-size: clamp(19px, 2.1vw, 24px);
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
}
.adventure-page .midnight-countdown-card.is-danger .midnight-countdown-head h3 {
  color: #ff8f9d;
}
.adventure-page .midnight-pending-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.adventure-page .midnight-pending-label {
  font-size: 11px;
  font-weight: 800;
  color: #ff8594;
}
.adventure-page .midnight-pending-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.adventure-page .midnight-pending-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 6px;
  border-radius: 999px;
  border: 0;
  box-shadow: none;
  background: rgba(18, 13, 28, 0.58);
  font-size: 11.5px;
  color: #f6effb;
}
.adventure-page .midnight-pending-chip em {
  font-style: normal;
  font-size: 9.5px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0;
  background: transparent;
  color: #ff7d8d;
}
.adventure-page .midnight-complete-copy {
  margin: 0;
  font-size: 12px;
  color: #ebe2f6;
}
.adventure-page .midnight-clock-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 18px;
  border-radius: 18px;
  border: 0;
  box-shadow: none;
  background: rgba(17, 12, 26, 0.55);
  flex-shrink: 0;
}
.adventure-page .midnight-clock-label {
  font-size: 8.5px;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: var(--group-soft);
}
.adventure-page .midnight-countdown-card.is-danger .midnight-clock-label {
  color: #ff8594;
}
.adventure-page .midnight-clock-digits {
  display: flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}
.adventure-page .clock-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 54px;
  padding: 6px 10px 4px;
  border-radius: 12px;
  border: 0;
  background: color-mix(in srgb, var(--group-accent, #8b5cf6) 24%, #1a1326);
}
.adventure-page .clock-unit strong {
  font-family: 'Baloo 2', var(--font);
  font-size: clamp(26px, 2.8vw, 34px);
  font-weight: 800;
  line-height: 1;
  color: var(--group-soft);
}
.adventure-page .midnight-countdown-card.is-danger .clock-unit strong {
  color: #ff7a8a;
}
.adventure-page .clock-unit small {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.72);
  margin-top: 2px;
}
.adventure-page .clock-sep {
  font-family: 'Baloo 2', var(--font);
  font-size: 26px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.6);
  margin-top: -10px;
}
.adventure-page .midnight-countdown-card.is-danger .clock-sep {
  color: #ff7a8a;
}
@media (max-width: 760px) {
  .adventure-page .midnight-countdown-card {
    flex-direction: column;
    align-items: stretch;
  }
  .adventure-page .midnight-clock-box {
    width: 100%;
  }
}
@media (max-width: 660px) {
  .world .world-bottom {
    flex-wrap: wrap;
    gap: 6px 10px;
    padding: 6px 12px;
  }
  .world .players {
    bottom: 84px;
  }
}
.archived-adventure {
  display: grid;
  min-height: calc(100dvh - 112px);
  max-width: 1250px;
  margin: 0 auto;
  align-content: center;
  overflow: hidden;
  border-radius: 28px;
  background: #232429;
  color: #f1f1f4;
  text-align: center;
}
.archived-scene {
  display: grid;
  justify-items: center;
  align-content: center;
  min-height: clamp(260px, 48vh, 520px);
  gap: 8px;
  padding: 24px;
  filter: grayscale(1);
  background-image: linear-gradient(#20212755, #232429), var(--group-section-banner);
  background-position: center;
  background-size: cover;
}
.archived-scene span { padding: 6px 14px; border-radius: 10px; background: #26262c; font-weight: 800; }
.archived-copy { padding: 8px 24px 40px; }
.archived-copy h1 { margin: 0; font: 800 clamp(34px, 6vw, 64px)/1.1 'Baloo 2', var(--font); }
.archived-copy p { max-width: 48ch; margin: 16px auto 26px; color: #d0d0d6; line-height: 1.6; }
.archived-copy .game-button { background: #e4e4ea; color: #212126; padding: 14px 22px; }
.penalty-dialog { width: min(430px, calc(100% - 32px)); padding: 26px; border: 0; border-radius: 20px; background: #2d2239; color: #fff3eb; }
.penalty-dialog::backdrop { background: #120d1cbb; }
.penalty-dialog p { line-height: 1.55; }
.adventure-wrap { container: group-layout / inline-size; }
.adventure-page .adventure-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  padding: 20px clamp(16px, 3vw, 32px);
  border: 0;
  border-radius: 24px;
  box-shadow: 0 12px 28px #0b081b45;
}
.adventure-page .adventure-header::after {
  background: linear-gradient(95deg, #17131eea, #211b29ab);
}
.adventure-page .adventure-header h1 {
  font-size: clamp(29px, 3.2vw, 43px);
  line-height: 1.05;
  color: #fff5ed;
  overflow-wrap: anywhere;
}
.header-identity { min-width: 0; }
.header-shortcuts { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; }
.group-side-panels .roster-toggle {
  justify-self: end;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  border: 0;
  border-radius: 10px;
  background: #ffffff08;
  color: #ded3e4;
  font-size: 12px;
}
.adventure-page .header-actions { gap: 8px; flex-wrap: wrap; justify-content: flex-start; }
.adventure-page .adventure-header .invite-badge {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 9px;
  padding: 7px 12px 7px 7px;
  border: 0;
  border-radius: 17px;
  background: #221d2bed;
  text-align: left;
}
.invite-copy-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: #22162a;
  background: color-mix(in srgb, var(--group-accent) 55%, white);
}
.invite-copy-text { display: grid; gap: 3px; }
.adventure-header .invite-label { color: #f0e3f7; font-size: 11px; }
.adventure-header .invite-badge strong { color: white; font-size: 15px; letter-spacing: .1em; }
.invite-fallback { width: 11ch; padding: 9px; border: 0; border-radius: 8px; background: #23192e; text-align: center; }
.adventure-page .adventure-header .header-actions > .game-button.secondary {
  min-height: 42px;
  border-radius: 12px;
  background: #292433eb;
  color: #fbf3ff;
}
.adventure-page .adventure-header .header-actions > .game-button.edit-group-trigger {
  background: color-mix(in srgb, var(--group-accent) 55%, white);
  color: #261b2e;
}
@container group-layout (min-width: 950px) {
  .adventure-page .adventure-header {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
.world .world-streak {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px 5px 6px;
  border-radius: 16px;
  background: #231927e8;
  color: #ffd6a1;
}
.world-streak > span:not(.streak-fire) { display: grid; gap: 3px; }
.world-streak strong { font-size: 19px; line-height: 1; }
.world-streak small { color: #f0d4bb; font-size: 10px; }
.team-celebration { text-align: center; }
.team-celebration[open] { animation: team-celebration-in .32s ease-out; }
.team-celebration h2 { margin: 14px 0 0; font: 800 33px/1.05 'Baloo 2', var(--font); }
.team-celebration-characters { display: flex; justify-content: center; align-items: end; flex-wrap: wrap; gap: 12px; }
@keyframes team-celebration-in { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .team-celebration[open] { animation: none; } }
.adventure-body.group-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'main' 'side';
  gap: 16px;
  align-items: start;
}
.group-columns .adventure-main-col { grid-area: main; min-width: 0; }
.group-side-panels { grid-area: side; display: grid; gap: 16px; min-width: 0; }
.group-columns .group-roster {
  align-content: start;
  min-width: 0;
  background: color-mix(in srgb, var(--group-accent) 12%, #231c2c);
}
.group-roster .game-title h2 { color: #f5eff8; font-size: 15px; }
.roster-list { display: grid; gap: 8px; max-height: 230px; overflow-y: auto; }
.group-roster .roster-member { padding: 10px; }
.group-roster .roster-member-copy { font-size: 13px; overflow-wrap: anywhere; }
.group-roster .roster-member-copy small { margin: 0; font-size: 11px; color: #d6c8df; }
.group-roster .roster-member-copy .roster-done { color: #d0eba3; }
.group-columns .expanded-side-chat {
  position: static;
  height: clamp(560px, 82dvh, 980px);
  min-height: 0;
  min-width: 0;
}
.group-columns .expanded-side-chat > :last-child { min-height: 0; }
.group-columns .expanded-side-chat :deep(.messages) { font-size: 13px; }
.group-columns .expanded-side-chat :deep(.bubble) { font-size: 13px; }
@container group-layout (min-width: 950px) {
  .adventure-body.group-columns:is(.roster-open, .side-chat-active) {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 34%);
    grid-template-areas: 'main side';
  }
}
.adventure-page .player-panel::after { display: none; }
.adventure-page .player-panel .daily-quest-heading {
  padding: 12px;
  border-radius: 14px;
  background-image: linear-gradient(95deg, #211a2aec, #211a2aa6), var(--group-section-banner);
  background-size: cover;
  background-position: center;
}
.adventure-page .team-habits > .game-title::before,
.adventure-page .midnight-countdown-card::before { opacity: .48; }
.fallen-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 0 0 12px; }
.adventure-page .world .heart-row[data-theme] .life-token.alive .token-main {
  fill: var(--group-accent);
}
.adventure-page .world .heart-row[data-theme] .life-token.alive :is(.token-spot, .token-stem) {
  fill: color-mix(in srgb, var(--group-accent) 38%, #32263a);
}
.adventure-page .world .heart-row[data-theme] .life-token.threatened {
  animation: none;
  filter: none;
}
.adventure-page .world .heart-row[data-theme] .life-token.alive.threatened .token-main {
  fill: color-mix(in srgb, var(--group-accent) 27%, #797382);
  stroke: none;
}
.adventure-page .world .heart-row[data-theme] .life-token.alive.threatened :is(.token-spot, .token-stem) {
  fill: color-mix(in srgb, var(--group-accent) 20%, #57515e);
}
.adventure-page .world .team-lives.lives-at-risk .lives-caption { color: var(--group-soft); }
.adventure-page .check-notice { color: var(--group-soft); }

.scene-pages {
  position: absolute;
  inset: 16px auto auto 16px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px;
  border-radius: 12px;
  background: #211a2e;
  color: #fff;
  font-size: 12px;
}
.scene-pages button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 9px;
  background: #ffffff18;
  color: inherit;
  font-size: 22px;
  line-height: 1;
}
.scene-pages button:disabled { opacity: .4; }
.adventure-page .world .players { inset-inline: 4%; gap: 4px; }
.adventure-page .world .players .player { min-width: 0; flex: 0 1 120px; }
.adventure-page .world .players .own-player { order: -1; z-index: 2; }
.team-celebration-member { display: grid; justify-items: center; position: relative; padding-bottom: 20px; }
.own-avatar-label { position: absolute; bottom: 0; font-size: 12px; font-weight: 800; color: #e9d5ff; }
.streak-poke-button{grid-column:1/-1;justify-self:start;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:7px 17px 7px 8px;margin:0;border:0;border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--poke-accent) 52%,#fff2fb),color-mix(in srgb,var(--poke-accent) 74%,#fff2fb));color:#22152c;font-size:16px;font-weight:850;box-shadow:0 4px 0 color-mix(in srgb,var(--poke-accent) 54%,#21172d);cursor:pointer}
.streak-poke-button:enabled:hover{filter:brightness(1.12)}
.streak-poke-button:disabled{opacity:.65;cursor:default}
.streak-poke-hand{display:grid;place-items:center;flex:none;width:38px;height:38px;border-radius:12px;background:#ffffff49}
.streak-poke-button,.streak-reminder-primary{max-width:100%;overflow-wrap:anywhere}
.adventure-page{--poke-accent:var(--group-accent)}
.countdown-poke{min-height:28px;gap:4px;padding:3px 7px;border-radius:8px;font-size:11px;box-shadow:none;white-space:nowrap}
.countdown-poke :deep(svg){width:16px;height:16px;flex:none}
.streak-reminder-actions .streak-reminder-primary{gap:7px;background:color-mix(in srgb,var(--poke-accent) 57%,#fff2fb)}
</style>

<style src="@/assets/styles/group-dialogs.css"></style>
