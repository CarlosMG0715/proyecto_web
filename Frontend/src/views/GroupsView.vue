<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useSessionStore } from '@/stores/session'

interface GroupItem {
  id: string
  name: string
  inviteCode: string
  streak: number
  health: number
  icon: string
}

interface HabitItem {
  id: string
  member: string
  avatar: string
  title: string
  icon: string
  days: string
  streak: number
  completed: boolean
}

interface ChatMessage {
  id: string
  sender: string
  avatar: string
  text: string
  time: string
  isSelf?: boolean
}

const sessionStore = useSessionStore()

// 1. Grupos de ejemplo (seleccionables)
const groups = ref<GroupItem[]>([
  {
    id: '1',
    name: 'Los Imparables',
    inviteCode: 'HABITOS-DEMO',
    streak: 42,
    health: 85,
    icon: '🔥',
  },
  {
    id: '2',
    name: 'FitFam 2026',
    inviteCode: 'FITFAM-77',
    streak: 19,
    health: 95,
    icon: '🏋️',
  },
  {
    id: '3',
    name: 'Lector@s Pro',
    inviteCode: 'LIBROS-44',
    streak: 8,
    health: 70,
    icon: '📚',
  },
])

const defaultGroup: GroupItem = {
  id: '1',
  name: 'Los Imparables',
  inviteCode: 'HABITOS-DEMO',
  streak: 42,
  health: 85,
  icon: '🔥',
}

const activeGroupId = ref('1')
const activeGroup = computed<GroupItem>(() => {
  return groups.value.find((g) => g.id === activeGroupId.value) ?? groups.value[0] ?? defaultGroup
})

function selectGroup(id: string) {
  activeGroupId.value = id
}

// 2. Hábitos del grupo activo
const habits = ref<HabitItem[]>([
  {
    id: 'h1',
    member: 'Alex M.',
    avatar: '👨‍💻',
    title: 'Reading',
    icon: '📖',
    days: '15/15 días',
    streak: 15,
    completed: true,
  },
  {
    id: 'h2',
    member: 'Sofía R.',
    avatar: '👩‍🎨',
    title: 'Gym',
    icon: '🏋️‍♀️',
    days: '15/15 días',
    streak: 15,
    completed: true,
  },
  {
    id: 'h3',
    member: 'Ben J.',
    avatar: '🧔',
    title: 'Coding',
    icon: '💻',
    days: '14/15 días',
    streak: 14,
    completed: false,
  },
  {
    id: 'h4',
    member: computed(() => sessionStore.currentUser?.name || 'Tú (Valeria)').value,
    avatar: '👑',
    title: 'Estudiar POW',
    icon: '🚀',
    days: '10/10 días',
    streak: 10,
    completed: false,
  },
])

function toggleHabit(habitId: string) {
  const target = habits.value.find((h) => h.id === habitId)
  if (target) {
    target.completed = !target.completed
    // Si completamos, sumamos salud al grupo
    if (target.completed && activeGroup.value.health < 100) {
      activeGroup.value.health = Math.min(100, activeGroup.value.health + 5)
    }
  }
}

// 3. Cuenta regresiva en vivo hacia la medianoche (Cron Job)
const countdownText = ref('00h 00m 00s')
let timerInterval: number | undefined

function updateMidnightCountdown() {
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(23, 59, 59, 999)

  const diffMs = midnight.getTime() - now.getTime()
  if (diffMs <= 0) {
    countdownText.value = '¡Medianoche! Evaluando metas...'
    return
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

  countdownText.value = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

onMounted(() => {
  updateMidnightCountdown()
  timerInterval = window.setInterval(updateMidnightCountdown, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

// 4. Chat interactivo en tiempo real
const messages = ref<ChatMessage[]>([
  {
    id: 'm1',
    sender: 'Alex',
    avatar: '👨‍💻',
    text: '¡Vamos equipo! ¡Hoy cumplimos todos! 🚀',
    time: '10:14',
  },
  {
    id: 'm2',
    sender: 'Sofía',
    avatar: '👩‍🎨',
    text: '¡Gimnasio listo! 💪😎',
    time: '10:20',
  },
  {
    id: 'm3',
    sender: 'Ben',
    avatar: '🧔',
    text: '¡A por el Coding hoy!',
    time: '10:45',
  },
  {
    id: 'm4',
    sender: 'Julia',
    avatar: '👩‍🦰',
    text: '¡Leyendo el último capítulo del libro!',
    time: '11:02',
  },
])

const newMessageText = ref('')

function sendMessage() {
  if (!newMessageText.value.trim()) return

  const now = new Date()
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

  messages.value.push({
    id: String(Date.now()),
    sender: sessionStore.currentUser?.name || 'Tú',
    avatar: '👑',
    text: newMessageText.value.trim(),
    time: timeStr,
    isSelf: true,
  })

  newMessageText.value = ''
}

// 5. Modales para Crear Grupo y Nuevo Hábito
const showCreateGroupModal = ref(false)
const newGroupName = ref('')

function handleCreateGroup() {
  if (!newGroupName.value.trim()) return
  const code = `${newGroupName.value.slice(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
  groups.value.push({
    id: String(Date.now()),
    name: newGroupName.value.trim(),
    inviteCode: code,
    streak: 1,
    health: 100,
    icon: '🎯',
  })
  const newGroup = groups.value[groups.value.length - 1]
  if (newGroup) {
    activeGroupId.value = newGroup.id
  }
  newGroupName.value = ''
  showCreateGroupModal.value = false
}

const showAddHabitModal = ref(false)
const newHabitTitle = ref('')

function handleAddHabit() {
  if (!newHabitTitle.value.trim()) return
  habits.value.push({
    id: String(Date.now()),
    member: sessionStore.currentUser?.name || 'Valeria',
    avatar: '✨',
    title: newHabitTitle.value.trim(),
    icon: '⭐',
    days: '1/1 días',
    streak: 1,
    completed: false,
  })
  newHabitTitle.value = ''
  showAddHabitModal.value = false
}
</script>

<template>
  <AppLayout>
    <div class="dashboard-layout">
      <!-- 1. SIDEBAR IZQUIERDA: GRUPOS Y NAVEGACIÓN -->
      <aside class="sidebar-panel">
        <div class="sidebar-header">
          <h2>Mis Grupos</h2>
          <button class="icon-btn-add" title="Crear Grupo" @click="showCreateGroupModal = true">
            +
          </button>
        </div>

        <nav class="groups-nav">
          <button
            v-for="group in groups"
            :key="group.id"
            class="group-item-btn"
            :class="{ active: group.id === activeGroup.id }"
            @click="selectGroup(group.id)"
          >
            <span class="group-icon">{{ group.icon }}</span>
            <div class="group-info">
              <span class="group-name">{{ group.name }}</span>
              <span class="group-code">#{{ group.inviteCode }}</span>
            </div>
          </button>
        </nav>

        <div class="sidebar-footer">
          <button class="join-btn" @click="showCreateGroupModal = true">
            + Nuevo Grupo
          </button>
        </div>
      </aside>

      <!-- 2. ÁREA CENTRAL: EL MONITOR DEL GRUPO ACTIVO -->
      <main class="main-stage">
        <header class="group-hero-header">
          <div>
            <h1>{{ activeGroup.name }}</h1>
            <p class="subtitle">
              Código de invitación: <strong>{{ activeGroup.inviteCode }}</strong>
            </p>
          </div>
          <button class="btn-primary-action" @click="showAddHabitModal = true">
            + Añadir Hábito
          </button>
        </header>

        <!-- Marcador de Salud y Racha -->
        <section class="scoreboard-card">
          <div class="streak-box">
            <span class="label">Racha de Equipo</span>
            <div class="streak-value">
              <span class="fire-emoji">🔥</span>
              <span class="num">{{ activeGroup.streak }}</span>
              <span class="days-text">Días</span>
            </div>
          </div>

          <div class="health-box">
            <div class="health-header">
              <span class="label">Salud del Grupo</span>
              <span class="health-num">{{ activeGroup.health }} / 100</span>
            </div>
            <div class="health-bar-track">
              <div
                class="health-bar-fill"
                :style="{ width: `${activeGroup.health}%` }"
              ></div>
            </div>
          </div>
        </section>

        <!-- Cuadrícula de Hábitos Diarios (Daily Check-In) -->
        <section class="habits-section">
          <div class="section-title-row">
            <h2>Dynamic Daily Check-In</h2>
            <span class="badge-active">Hoy</span>
          </div>

          <div class="habits-grid">
            <article
              v-for="habit in habits"
              :key="habit.id"
              class="habit-card"
              :class="{ completed: habit.completed }"
            >
              <div class="card-top">
                <div class="member-chip">
                  <span class="member-avatar">{{ habit.avatar }}</span>
                  <span class="member-name">{{ habit.member }}</span>
                </div>
                <span v-if="habit.completed" class="status-badge-done">✔</span>
              </div>

              <div class="habit-title-row">
                <span class="habit-name">{{ habit.title }}</span>
                <span class="habit-icon">{{ habit.icon }}</span>
              </div>

              <div class="habit-meta-row">
                <span class="days-count">{{ habit.days }}</span>
                <span class="streak-pill">🔥 {{ habit.streak }}</span>
              </div>

              <button
                class="checkin-btn"
                :class="{ 'btn-done': habit.completed, 'btn-pending': !habit.completed }"
                @click="toggleHabit(habit.id)"
              >
                {{ habit.completed ? '✔ Completado' : '⏳ Marcar Cumplido' }}
              </button>
            </article>
          </div>
        </section>

        <!-- Reloj de Cuenta Regresiva a Medianoche (Cron Job) -->
        <footer class="midnight-countdown-panel">
          <span class="countdown-label">Tiempo para Medianoche</span>
          <div class="countdown-clock">{{ countdownText }}</div>
          <p class="countdown-hint">
            ⚠️ Todos deben registrar su meta antes de las 00:00 para evitar penalizaciones.
          </p>
        </footer>
      </main>

      <!-- 3. SIDEBAR DERECHA: CHAT CONTEXTUAL Y ALERTAS -->
      <aside class="chat-panel">
        <header class="chat-header">
          <h3>Chat de {{ activeGroup.name }}</h3>
          <span class="chat-live-indicator">🟢 en vivo</span>
        </header>

        <!-- Alerta de Sistema -->
        <div class="system-alert-banner">
          <span class="alert-icon">⚠️</span>
          <div class="alert-text">
            <strong>ALERTA DE SISTEMA:</strong>
            <p>Penalización evitada hoy. ¡Mantened el ritmo en equipo!</p>
          </div>
        </div>

        <!-- Lista de Mensajes -->
        <div class="messages-container">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-bubble"
            :class="{ 'is-self': msg.isSelf }"
          >
            <span class="msg-avatar">{{ msg.avatar }}</span>
            <div class="msg-body">
              <div class="msg-header">
                <span class="sender-name">{{ msg.sender }}</span>
                <span class="msg-time">{{ msg.time }}</span>
              </div>
              <p class="msg-content">{{ msg.text }}</p>
            </div>
          </div>
        </div>

        <!-- Input para enviar mensaje -->
        <form class="chat-input-bar" @submit.prevent="sendMessage">
          <input
            v-model="newMessageText"
            type="text"
            placeholder="Envía un mensaje..."
          />
          <button type="submit" class="send-btn">➤</button>
        </form>
      </aside>
    </div>

    <!-- Modal Crear Grupo -->
    <div v-if="showCreateGroupModal" class="modal-backdrop">
      <div class="modal-card">
        <h3>+ Crear Nuevo Grupo</h3>
        <p>Elige un nombre divertido para tu equipo de hábitos.</p>
        <input
          v-model="newGroupName"
          type="text"
          placeholder="Ej: Los Invencibles"
          @keyup.enter="handleCreateGroup"
        />
        <div class="modal-actions">
          <button class="btn-cancel" @click="showCreateGroupModal = false">Cancelar</button>
          <button class="btn-confirm" @click="handleCreateGroup">Crear Grupo</button>
        </div>
      </div>
    </div>

    <!-- Modal Agregar Hábito -->
    <div v-if="showAddHabitModal" class="modal-backdrop">
      <div class="modal-card">
        <h3>+ Añadir Nuevo Hábito</h3>
        <p>¿Qué meta diaria quieres comprometerte a cumplir?</p>
        <input
          v-model="newHabitTitle"
          type="text"
          placeholder="Ej: Meditar 15 min, Leer 20 págs"
          @keyup.enter="handleAddHabit"
        />
        <div class="modal-actions">
          <button class="btn-cancel" @click="showAddHabitModal = false">Cancelar</button>
          <button class="btn-confirm" @click="handleAddHabit">Añadir</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
/* ESTRUCTURA GENERAL DE 3 PANELES (Inspirada en el mockup) */
.dashboard-layout {
  display: grid;
  grid-template-columns: 240px 1fr 340px;
  gap: 1.5rem;
  min-height: calc(100vh - 120px);
  color: #f1f1f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 1. SIDEBAR IZQUIERDA */
.sidebar-panel {
  background: #181628;
  border: 1px solid #2b2745;
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.sidebar-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #c4b5fd;
  margin: 0;
}

.icon-btn-add {
  background: #2e2852;
  color: #c4b5fd;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.icon-btn-add:hover {
  background: #8b5cf6;
  color: #fff;
}

.groups-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.group-item-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  color: #9490b8;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.group-item-btn:hover {
  background: #231f3b;
  color: #e0e0f5;
}

.group-item-btn.active {
  background: #282249;
  border-color: #6355a4;
  color: #fff;
}

.group-icon {
  font-size: 1.25rem;
}

.group-info {
  display: flex;
  flex-direction: column;
}

.group-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.group-code {
  font-size: 0.75rem;
  color: #7b75a6;
}

.join-btn {
  width: 100%;
  padding: 0.65rem;
  background: #2b254d;
  color: #a78bfa;
  border: 1px dashed #6355a4;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.join-btn:hover {
  background: #7c3aed;
  color: #fff;
}

/* 2. ÁREA CENTRAL */
.main-stage {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.group-hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-hero-header h1 {
  font-size: 1.85rem;
  font-weight: 800;
  color: #f5f3ff;
  margin: 0;
}

.subtitle {
  color: #8b85b5;
  font-size: 0.9rem;
  margin-top: 0.2rem;
}

.btn-primary-action {
  background: #8b5cf6;
  color: #fff;
  border: none;
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, background 0.2s;
}

.btn-primary-action:hover {
  background: #7c3aed;
  transform: translateY(-2px);
}

/* MARCADOR DE RACHA Y SALUD */
.scoreboard-card {
  background: #1b1830;
  border: 1px solid #332d56;
  border-radius: 16px;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2rem;
  align-items: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #8f8aa9;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.streak-value {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-top: 0.35rem;
}

.fire-emoji {
  font-size: 1.8rem;
}

.streak-value .num {
  font-size: 2.2rem;
  font-weight: 900;
  color: #fb923c;
}

.days-text {
  font-size: 1rem;
  color: #fbbf24;
  font-weight: 600;
}

.health-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-num {
  font-weight: 800;
  color: #34d399;
  font-size: 1.1rem;
}

.health-bar-track {
  width: 100%;
  height: 16px;
  background: #25213b;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid #3d3561;
}

.health-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #34d399 70%, #f59e0b 100%);
  border-radius: 999px;
  transition: width 0.4s ease;
}

/* SECCIÓN DE HÁBITOS (DAILY CHECK-IN) */
.section-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.section-title-row h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #e9e6fb;
  margin: 0;
}

.badge-active {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid #10b981;
  font-size: 0.75rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-weight: 700;
}

.habits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 1rem;
}

.habit-card {
  background: #1b1830;
  border: 1px solid #332d56;
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: transform 0.2s, border-color 0.2s;
}

.habit-card:hover {
  transform: translateY(-2px);
  border-color: #554a8a;
}

.habit-card.completed {
  border-color: #059669;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.15);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.member-avatar {
  font-size: 1.1rem;
}

.member-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #d8d4ec;
}

.status-badge-done {
  color: #10b981;
  font-weight: 800;
  background: rgba(16, 185, 129, 0.15);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.habit-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.2rem;
}

.habit-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
}

.habit-icon {
  font-size: 1.4rem;
}

.habit-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #7f7a9d;
}

.streak-pill {
  color: #fb923c;
  font-weight: 600;
}

.checkin-btn {
  width: 100%;
  padding: 0.65rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  margin-top: 0.25rem;
}

.btn-done {
  background: #10b981;
  color: #022c22;
}

.btn-done:hover {
  background: #059669;
  color: #fff;
}

.btn-pending {
  background: #332d56;
  color: #e9e6fb;
}

.btn-pending:hover {
  background: #10b981;
  color: #022c22;
}

/* RELOJ CUENTA REGRESIVA A MEDIANOCHE */
.midnight-countdown-panel {
  background: #151326;
  border: 1px dashed #3a3363;
  border-radius: 14px;
  padding: 1.5rem;
  text-align: center;
  margin-top: 1rem;
}

.countdown-label {
  font-size: 0.85rem;
  color: #8b85b5;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
}

.countdown-clock {
  font-size: 2.2rem;
  font-weight: 900;
  color: #a78bfa;
  font-family: monospace;
  margin: 0.4rem 0;
}

.countdown-hint {
  color: #7b75a6;
  font-size: 0.85rem;
  margin: 0;
}

/* 3. SIDEBAR DERECHA: CHAT CONTEXTUAL */
.chat-panel {
  background: #181628;
  border: 1px solid #2b2745;
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #282343;
}

.chat-header h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: #f5f3ff;
}

.chat-live-indicator {
  font-size: 0.75rem;
  color: #10b981;
  font-weight: 600;
}

.system-alert-banner {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  gap: 0.6rem;
  margin: 1rem 0;
}

.alert-icon {
  font-size: 1.1rem;
}

.alert-text strong {
  display: block;
  font-size: 0.75rem;
  color: #fbbf24;
  letter-spacing: 0.5px;
}

.alert-text p {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: #fde68a;
  line-height: 1.3;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 0.25rem;
  max-height: 380px;
}

.message-bubble {
  display: flex;
  gap: 0.6rem;
  background: #201c36;
  border-radius: 12px;
  padding: 0.65rem 0.85rem;
  border: 1px solid #2d274e;
}

.message-bubble.is-self {
  background: #2a2254;
  border-color: #55449e;
}

.msg-avatar {
  font-size: 1.2rem;
}

.msg-body {
  flex: 1;
}

.msg-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.sender-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #a78bfa;
}

.msg-time {
  font-size: 0.7rem;
  color: #6d6794;
}

.msg-content {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: #e5e3f5;
  line-height: 1.35;
}

.chat-input-bar {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #282343;
}

.chat-input-bar input {
  flex: 1;
  background: #100e1c;
  border: 1px solid #332d56;
  color: #fff;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  font-size: 0.88rem;
  outline: none;
}

.chat-input-bar input:focus {
  border-color: #8b5cf6;
}

.send-btn {
  background: #8b5cf6;
  color: #fff;
  border: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.send-btn:hover {
  background: #7c3aed;
}

/* MODALES */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-card {
  background: #1f1b38;
  border: 1px solid #3c3466;
  border-radius: 16px;
  padding: 2rem;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
}

.modal-card h3 {
  margin: 0 0 0.5rem;
  color: #f5f3ff;
}

.modal-card p {
  color: #9490b8;
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}

.modal-card input {
  width: 100%;
  background: #121020;
  border: 1px solid #3c3466;
  color: #fff;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
  outline: none;
}

.modal-card input:focus {
  border-color: #8b5cf6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-cancel {
  background: transparent;
  color: #9490b8;
  border: 1px solid #3c3466;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
}

.btn-confirm {
  background: #10b981;
  color: #022c22;
  font-weight: 700;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
}

@media (max-width: 1024px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
}
</style>
