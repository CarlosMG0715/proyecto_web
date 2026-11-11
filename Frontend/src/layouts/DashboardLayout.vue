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
const accountCreated = ref(false)
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
  if (window.history.state?.kordiaAccountCreated === true) {
    accountCreated.value = true
    window.history.replaceState({ ...window.history.state, kordiaAccountCreated: false }, '')
  }
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
      <div v-if="accountCreated" class="account-created-notice">
        <p role="status">¡Cuenta creada con éxito! Ya iniciaste sesión.</p>
        <button type="button" aria-label="Cerrar aviso" @click="accountCreated = false">×</button>
      </div>
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
.account-created-notice {
  position: fixed;
  inset: 16px 16px auto auto;
  z-index: 1000;
  max-width: calc(100vw - 32px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--surface-2, #302641);
  color: var(--text, #fff);
  box-shadow: 0 6px 20px #0004;
}
.account-created-notice p { margin: 0; }
.account-created-notice button {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
}
@media(max-width:700px){.shell{grid-template-columns:minmax(0,1fr);padding-bottom:68px;min-height:100dvh}.content{height:calc(100dvh - 68px)}}
</style>
