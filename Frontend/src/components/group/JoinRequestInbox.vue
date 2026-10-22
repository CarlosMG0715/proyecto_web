<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import { CHARACTERS } from '@/stores/characters'
import { useGroupsStore } from '@/stores/groups'
import { groupService, type JoinRequest } from '@/services/groupService'

const groups = useGroupsStore()
const requests = ref<JoinRequest[]>([])
const open = ref(false)
const busyId = ref('')
const error = ref('')
const trigger = ref<HTMLButtonElement | null>(null)
const panelPosition = ref({ top: 90, left: 260 })
const pendingCount = computed(() => requests.value.length)
let refreshTimer: ReturnType<typeof setInterval> | undefined

async function refresh() {
  try {
    requests.value = await groupService.inbox()
    error.value = ''
  } catch {
    error.value = 'No pudimos cargar las solicitudes. Vuelve a abrir la bandeja para reintentar.'
  }
}

function openInbox() {
  open.value = !open.value
  if (!open.value) return
  const rect = trigger.value?.getBoundingClientRect()
  if (rect) {
    panelPosition.value = {
      top: Math.max(12, Math.min(rect.top, window.innerHeight - 390)),
      left: Math.max(12, Math.min(rect.right + 12, window.innerWidth - 352)),
    }
  }
  void refresh()
}

async function decide(request: JoinRequest, action: 'ACCEPTED' | 'REJECTED') {
  busyId.value = request.id
  error.value = ''
  try {
    await groupService.decide(request.id, action)
    requests.value = requests.value.filter(item => item.id !== request.id)
    await groups.refreshRemoteGroups()
  } catch (cause) {
    error.value = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'No se pudo guardar la respuesta.'
  } finally {
    busyId.value = ''
  }
}

function characterFor(id: string) {
  return CHARACTERS.find(character => character.id === id) ?? CHARACTERS[0]!
}

onMounted(() => {
  void refresh()
  refreshTimer = setInterval(() => {
    void refresh()
  }, 25000)
})
onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>

<template>
  <div class="inbox-wrap">
    <button ref="trigger" type="button" class="inbox-trigger" :aria-expanded="open" @click="openInbox">
      <AppIcon name="bell" :size="16" />
      <span>Solicitudes</span>
      <span v-if="pendingCount" class="inbox-count">{{ pendingCount }}</span>
    </button>
    <Teleport to="body">
      <div v-if="open" class="inbox-backdrop" @click="open = false"></div>
      <section v-if="open" class="inbox-panel" :style="{ top: `${panelPosition.top}px`, left: `${panelPosition.left}px` }" aria-label="Solicitudes para unirse">
      <header><strong>Solicitudes de aventura</strong><button type="button" aria-label="Cerrar bandeja" @click="open = false"><AppIcon name="x" :size="15" /></button></header>
      <p v-if="error" class="inbox-error">{{ error }}</p>
      <p v-else-if="!requests.length" class="inbox-empty">No hay solicitudes pendientes.</p>
      <article v-for="request in requests" :key="request.id" class="request-card">
        <div class="request-avatar"><CharacterIcon :character="characterFor(request.requester.characterId)" :size="42" /></div>
        <div class="request-content">
          <p><strong>{{ request.requester.name }}</strong> quiere unirse a la aventura</p>
          <small>{{ request.group.name }}</small>
          <div class="request-actions">
            <button type="button" class="accept" :disabled="busyId === request.id" @click="decide(request, 'ACCEPTED')">Aceptar</button>
            <button type="button" class="reject" :disabled="busyId === request.id" @click="decide(request, 'REJECTED')">Rechazar</button>
          </div>
        </div>
      </article>
      </section>
    </Teleport>
  </div>
</template>

<style scoped>
.inbox-wrap { position: relative; }
.inbox-trigger { width: 100%; display:flex; align-items:center; gap:.65rem; padding:.55rem .6rem; border:0; border-radius:var(--radius-sm); background:transparent; color:var(--text-soft); font:inherit; font-size:.86rem; cursor:pointer; }
.inbox-trigger:hover { background:var(--surface); color:var(--text); }
.inbox-count { margin-left:auto; min-width:20px; padding:1px 6px; border-radius:99px; background:#fb7185; color:#31111a; text-align:center; font-size:.7rem; font-weight:800; }
.inbox-backdrop { position:fixed; inset:0; z-index:1090; background:transparent; }
.inbox-panel { position:fixed; z-index:1091; width:min(340px, calc(100vw - 32px)); max-height:min(430px, calc(100vh - 24px)); overflow-y:auto; padding:14px; border:1px solid var(--border); border-radius:16px; background:var(--bg-sidebar); box-shadow:0 16px 45px #09061066; }
.inbox-panel header { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
.inbox-panel header strong { font-size:.9rem; }
.inbox-panel header button { display:grid; place-items:center; width:28px; height:28px; border:0; border-radius:8px; background:var(--surface); color:var(--text); cursor:pointer; }
.inbox-empty,.inbox-error { margin:0; padding:12px 8px; color:var(--muted); font-size:.82rem; }
.inbox-error { color:#fb7185; }
.request-card { display:flex; gap:10px; padding:12px 0; border-top:1px solid var(--border); }
.request-avatar { width:44px; height:44px; flex:none; display:grid; place-items:center; border-radius:13px; background:var(--surface); }
.request-content { min-width:0; }
.request-content p { margin:0; font-size:.81rem; line-height:1.4; }
.request-content small { display:block; margin-top:3px; color:var(--muted); font-size:.72rem; }
.request-actions { display:flex; gap:7px; margin-top:9px; }
.request-actions button { padding:6px 10px; border:1px solid var(--border); border-radius:8px; font:inherit; font-size:.72rem; font-weight:700; cursor:pointer; }
.request-actions button:disabled { opacity:.5; cursor:wait; }
.accept { background:#b6e3a1; color:#20331b; }
.reject { background:var(--surface); color:var(--text-soft); }
</style>
