<script setup lang="ts">
/**
 * VISTA DE DETALLE DEL GRUPO (como en la imagen de referencia).
 * - Marcador de racha del equipo (🔥) y barra de salud
 * - Dynamic Daily Check-In con tarjetas de Carlos y Valeria
 * - Cuenta regresiva para medianoche en grande
 * - Chat lateral desplegable con fotos de perfil y alertas
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import GroupChat from '@/components/group/GroupChat.vue'
import MemberCheckCard from '@/components/group/MemberCheckCard.vue'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import { useGroupsStore } from '@/stores/groups'

const route = useRoute()
const router = useRouter()
const groupsStore = useGroupsStore()
const { hours, minutes, seconds } = useMidnightCountdown()

const isChatOpen = ref(true)

const groupId = computed(() => String(route.params.groupId || 'equipo-pow'))
const group = computed(() => groupsStore.groupById(groupId.value) || groupsStore.groups[0])

const systemAlert = computed(() => {
  if (!group.value) return null
  const pending = group.value.members.filter((m) => !m.checkedInToday)
  if (pending.length === 0) {
    return 'Penalización evitada hoy: ¡todos los miembros completaron su meta diaria! Mantened el ritmo.'
  }
  const pendingNames = pending.map((m) => (m.isCurrentUser ? 'tú' : m.name)).join(' y ')
  return `Alerta: ${pendingNames} tiene pendiente el check-in antes de medianoche.`
})

function formatTwoDigits(n: number): string {
  return String(n).padStart(2, '0')
}

function handleCheckIn(groupId: string) {
  groupsStore.toggleMyCheckIn(groupId)
}

function handleSendMessage(text: string) {
  if (group.value) {
    groupsStore.sendMessage(group.value.id, text)
  }
}
</script>

<template>
  <div v-if="group" class="group-layout">
    <!-- Contenido Principal -->
    <div class="group-main">
      <div class="group-container">
        <!-- Top bar / Breadcrumb -->
        <header class="top-nav">
          <div class="breadcrumb">
            <RouterLink :to="{ name: 'inicio' }" class="crumb-link">
              <AppIcon name="home" :size="15" />
              <span>Inicio</span>
            </RouterLink>
            <span class="sep">/</span>
            <span class="current">{{ group.name }}</span>
          </div>

          <button
            type="button"
            class="chat-toggle-btn"
            :class="{ active: isChatOpen }"
            @click="isChatOpen = !isChatOpen"
          >
            <AppIcon name="message" :size="16" />
            <span>{{ isChatOpen ? 'Ocultar chat' : 'Abrir chat' }}</span>
            <span class="live-dot"></span>
          </button>
        </header>

        <!-- Título del Grupo y Código -->
        <div class="group-heading">
          <div>
            <h1>{{ group.name }}</h1>
            <p v-if="group.description">{{ group.description }}</p>
          </div>
          <div class="code-chip" title="Código de invitación para tus amigos">
            <span class="code-label">Código:</span>
            <strong>{{ group.inviteCode }}</strong>
          </div>
        </div>

        <!-- Marcador Hero (Racha de Equipo y Barra de Salud) -->
        <section class="scoreboard">
          <div class="streak-box">
            <span class="box-caption">Racha de Equipo: {{ group.streak }} Días</span>
            <div class="fire-value">
              <span class="fire-emoji">🔥</span>
              <span class="streak-num">{{ group.streak }}</span>
            </div>
          </div>

          <div class="health-box">
            <div class="health-header">
              <span class="box-caption">Salud del Grupo</span>
              <strong class="health-num">{{ group.health }}/100</strong>
            </div>
            <div class="health-track">
              <div
                class="health-fill"
                :style="{ width: `${group.health}%` }"
              ></div>
            </div>
          </div>
        </section>

        <!-- Dynamic Daily Check-In -->
        <section class="checkin-section">
          <div class="section-title-row">
            <h2>Dynamic Daily Check-In</h2>
            <span class="today-tag">Hoy</span>
          </div>

          <div class="cards-grid">
            <MemberCheckCard
              v-for="member in group.members"
              :key="member.id"
              :member="member"
              @toggle="handleCheckIn(group.id)"
            />
          </div>
        </section>

        <!-- Cuenta Regresiva de Medianoche -->
        <section class="countdown-hero">
          <span class="countdown-label">Tiempo para Medianoche</span>
          <div class="countdown-digits">
            {{ hours }}h {{ formatTwoDigits(minutes) }}m {{ formatTwoDigits(seconds) }}s
          </div>
          <p class="countdown-hint">
            El cierre automático se ejecuta a las 00:00:00 con transacciones ACID para evitar penalizaciones.
          </p>
        </section>
      </div>
    </div>

    <!-- Chat Desplegable a la Derecha -->
    <transition name="slide-chat">
      <aside v-if="isChatOpen" class="group-chat-pane">
        <GroupChat
          :group="group"
          :alert="systemAlert"
          @close="isChatOpen = false"
          @send="handleSendMessage"
        />
      </aside>
    </transition>
  </div>
</template>

<style scoped>
.group-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

.group-main {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem 2rem 3rem;
}

.group-container {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Top bar */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.crumb-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-soft);
  transition: color 0.15s;
}

.crumb-link:hover {
  color: #fff;
}

.sep {
  color: var(--border-strong);
}

.current {
  color: var(--text);
  font-weight: 600;
}

.chat-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  border-radius: 99px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text-soft);
  font-size: 0.82rem;
  font-weight: 600;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.chat-toggle-btn:hover {
  background: var(--surface-2);
  color: #fff;
}

.chat-toggle-btn.active {
  background: var(--primary-soft);
  border-color: rgba(139, 92, 246, 0.4);
  color: #c4b5fd;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
}

/* Heading */
.group-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.group-heading h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.group-heading p {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: var(--muted);
}

.code-chip {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 0.82rem;
}

.code-label {
  color: var(--muted);
}

.code-chip strong {
  font-family: monospace;
  font-size: 0.9rem;
  color: #c4b5fd;
  letter-spacing: 0.05em;
}

/* Scoreboard */
.scoreboard {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.9fr);
  gap: 1.25rem;
  padding: 1.4rem 1.6rem;
  border-radius: var(--radius-lg);
  background:
    radial-gradient(130% 150% at 0% 0%, rgba(139, 92, 246, 0.18), transparent 60%),
    radial-gradient(120% 130% at 100% 100%, rgba(34, 197, 94, 0.12), transparent 50%),
    var(--surface);
  border: 1px solid var(--border-strong);
  box-shadow: 0 16px 36px -16px rgba(0, 0, 0, 0.6);
}

.box-caption {
  display: block;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.fire-value {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.fire-emoji {
  font-size: 1.7rem;
}

.streak-num {
  font-size: 2.2rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
}

.health-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.health-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.health-num {
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
}

.health-track {
  margin-top: 0.4rem;
  height: 12px;
  border-radius: 99px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  overflow: hidden;
}

.health-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #10b981, #22c55e, #f59e0b);
  box-shadow: 0 0 14px rgba(34, 197, 94, 0.6);
  transition: width 0.4s ease;
}

/* Dynamic Daily Check-In */
.checkin-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title-row h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.today-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: 99px;
  background: var(--primary-soft);
  color: #c4b5fd;
  text-transform: uppercase;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.1rem;
}

/* Countdown */
.countdown-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.8rem 1rem 1.2rem;
}

.countdown-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.4rem;
}

.countdown-digits {
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #a78bfa;
  text-shadow: 0 0 24px rgba(167, 139, 250, 0.45);
  font-variant-numeric: tabular-nums;
}

.countdown-hint {
  max-width: 460px;
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.4;
}

/* Chat Pane */
.group-chat-pane {
  width: 360px;
  height: 100%;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
}

/* Animaciones */
.slide-chat-enter-active,
.slide-chat-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.slide-chat-enter-from,
.slide-chat-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 900px) {
  .scoreboard {
    grid-template-columns: 1fr;
  }
}
</style>
