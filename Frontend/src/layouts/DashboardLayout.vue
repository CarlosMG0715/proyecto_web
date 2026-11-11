<script setup lang="ts">
/**
 * Layout de la parte privada de la app (después de iniciar sesión):
 * menú lateral a la izquierda + la pantalla actual (RouterView) a la derecha.
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import streakLostBanner from '@/assets/Racha perdida.png'
import '@/assets/styles/game-views.css'
import TeamNotifications from '@/components/layout/TeamNotifications.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import CreateGroupModal from '@/components/group/CreateGroupModal.vue'
import { getThemeBackground } from '@/constants/themeBackgrounds'
import { useCharacterStore } from '@/stores/characters'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'

const characters = useCharacterStore()
const route = useRoute()
const groups = useGroupsStore()
const session = useSessionStore()
const { dayKey } = useMidnightCountdown()
const streakLossDialog = ref<HTMLDialogElement | null>(null)
const shownLosses = new Set<string>()
let refreshTimer: ReturnType<typeof setInterval> | undefined

watch(dayKey, () => { void groups.refreshRemoteGroups() }, { flush: 'sync' })

watch(() => [dayKey.value, groups.checkInHistory, groups.isLoading, groups.error, session.currentUser?.id, streakLossDialog.value], () => {
  const userId = session.currentUser?.id
  const dialog = streakLossDialog.value
  if (!userId || !dialog || dialog.open || groups.isLoading || groups.error) return

  const yesterday = new Date(Date.parse(`${dayKey.value}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
  const lastCheck = groups.checkInHistory.reduce((latest, date) =>
    date < dayKey.value && date > latest ? date : latest, '')
  if (!lastCheck || lastCheck >= yesterday) return

  const key = `kordia:streak-loss:${userId}:${lastCheck}`
  if (shownLosses.has(key)) return
  try { if (localStorage.getItem(key)) return } catch { /* Mantiene el aviso disponible en esta sesión. */ }
  dialog.showModal()
  shownLosses.add(key)
  try { localStorage.setItem(key, '1') } catch { /* Ya se mostró en esta sesión. */ }
}, { flush: 'post' })

function refreshProfiles() {
  if (document.visibilityState === 'hidden') return
  void characters.refreshPreferences()
  void groups.refreshRemoteGroups()
}

onMounted(() => {
  refreshTimer = setInterval(refreshProfiles, 15000)
  window.addEventListener('focus', refreshProfiles)
  document.addEventListener('visibilitychange', refreshProfiles)
  try {
    const preferences = JSON.parse(localStorage.getItem('kordia:preferences') ?? '{}')
    document.documentElement.classList.toggle('kordia-reduce-motion', preferences.motion === false)
  } catch { /* Las preferencias inválidas usan los efectos predeterminados. */ }
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  window.removeEventListener('focus', refreshProfiles)
  document.removeEventListener('visibilitychange', refreshProfiles)
})
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <main class="content" :class="{ 'personal-theme': route.name !== 'grupo' }"
      :style="route.name !== 'grupo' ? { '--personal-selected-accent': characters.theme.color, '--personal-art': 'url(' + getThemeBackground(characters.theme.id) + ')' } : undefined">
      <RouterView />
    </main>
    <CreateGroupModal />
    <TeamNotifications />
    <Teleport to="body">
      <dialog ref="streakLossDialog" class="streak-loss-dialog" aria-labelledby="personal-penalty-title"
        :style="{ '--theme-accent': characters.theme.color }">
        <img class="streak-loss-banner" :src="streakLostBanner" alt="" />
        <h2 id="personal-penalty-title">Racha personal perdida</h2>
        <p>Ayer terminó sin un check registrado. Puedes empezar una nueva racha hoy.</p>
        <form method="dialog"><button class="game-button">Entendido</button></form>
      </dialog>
    </Teleport>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  min-height: 100vh;
  background: var(--bg);
}

.content {
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}
@media(max-width:700px){.shell{grid-template-columns:minmax(0,1fr);padding-bottom:68px;min-height:100dvh}.content{height:calc(100dvh - 68px)}}
</style>
