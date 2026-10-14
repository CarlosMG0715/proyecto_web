<script setup lang="ts">
/**
  * VISTA DE GRUPO (GrupoView.vue)   Aquí se muestra la vista principal de un grupo, incluyendo la racha del equipo, los hábitos diarios, las notas de los miembros y el chat del grupo.
 */
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import GroupChat from '@/components/group/GroupChat.vue'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import { useGroupsStore } from '@/stores/groups'
import carlosAvatar from '@/assets/avatars/carlos.jpg'
import valeriaAvatar from '@/assets/avatars/valeria.jpg'

interface GroupHabit {
  id: string
  name: string
  icon: string
  carlosCompleted: boolean
  carlosNote?: string
  valeriaCompleted: boolean
  valeriaNote?: string
}

const route = useRoute()
const groupsStore = useGroupsStore()
const { hours, minutes, seconds } = useMidnightCountdown()

const isChatOpen = ref(true)

const groupId = computed(() => String(route.params.groupId || 'equipo-pow'))
const group = computed(() => groupsStore.groupById(groupId.value) || groupsStore.groups[0])

// Hábitos específicos del grupo
const habits = ref<GroupHabit[]>([
  {
    id: 'h1',
    name: 'Programar 1 hora',
    icon: '💻',
    carlosCompleted: true,
    carlosNote: 'Terminé las migraciones de Prisma y endpoints 🚀',
    valeriaCompleted: false,
    valeriaNote: '',
  },
  {
    id: 'h2',
    name: 'Leer 30 mins',
    icon: '📖',
    carlosCompleted: true,
    carlosNote: 'Capítulo 4 de Clean Code completado 📚',
    valeriaCompleted: true,
    valeriaNote: 'Hábitos Atómicos capítulo 2 leído ✨',
  },
])

function toggleHabit(habit: GroupHabit): void {
  habit.valeriaCompleted = !habit.valeriaCompleted
  if (habit.id === 'h1' && group.value) {
    groupsStore.toggleMyCheckIn(group.value.id)
  }
}

// Modal para crear nuevo hábito en el grupo
const isCreateHabitModalOpen = ref(false)
const newHabitName = ref('')
const newHabitIcon = ref('🎯')
const availableIcons = ['💻', '📖', '🏋️', '🎧', '🎯', '⚡', '🧠', '🧘']

function openCreateHabitModal(): void {
  newHabitName.value = ''
  newHabitIcon.value = '🎯'
  isCreateHabitModalOpen.value = true
}

function saveNewHabit(): void {
  if (!newHabitName.value.trim()) return
  habits.value.push({
    id: `h-${Date.now()}`,
    name: newHabitName.value.trim(),
    icon: newHabitIcon.value,
    carlosCompleted: false,
    valeriaCompleted: false,
    valeriaNote: '',
  })
  isCreateHabitModalOpen.value = false
}

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

        <!-- 1. FUEGUITO SUPER GRANDE EN EL CENTRO 🔥 (ESTILO DUOLINGO) -->
        <section class="duo-streak-hero-centered">
          <div class="giant-flame-bubble">
            <span class="giant-flame-icon">🔥</span>
          </div>
          <div class="streak-center-texts">
            <div class="streak-pill-tag">
              <span>RACHA DE EQUIPO</span>
            </div>
            <div class="streak-center-count">
              <strong class="giant-num">{{ group.streak }}</strong>
              <span class="giant-label">DÍAS EN LLAMAS</span>
            </div>
            <p class="streak-center-desc">
              ¡El fuego del equipo está en su punto máximo! Cumplan sus hábitos de hoy antes de medianoche para conservarlo.
            </p>
          </div>
        </section>

        <!-- 2. HÁBITOS DE HOY EN EL GRUPO (CON DIFERENTES HÁBITOS, NOTAS Y CREAR HÁBITO) -->
        <section class="habits-section">
          <div class="habits-header-row">
            <div>
              <h2>Hábitos del equipo hoy</h2>
              <p class="habits-sub">Cumple cada meta diaria y deja una nota de tu avance.</p>
            </div>
            <!-- Botón para añadir un hábito nuevo al grupo -->
            <button type="button" class="btn-create-habit" @click="openCreateHabitModal">
              <AppIcon name="plus" :size="16" :stroke-width="3" />
              <span>Crear hábito</span>
            </button>
          </div>

          <div class="habits-list">
            <div v-for="habit in habits" :key="habit.id" class="habit-group-block">
              <!-- Barra del Hábito -->
              <div class="habit-block-head">
                <div class="habit-title-wrap">
                  <span class="habit-emoji-icon">{{ habit.icon }}</span>
                  <strong class="habit-block-name">{{ habit.name }}</strong>
                </div>
                <span class="habit-active-tag">2 miembros asignados</span>
              </div>

              <!-- Tarjetas de Miembros con Notas -->
              <div class="habit-members-grid">
                <!-- Carlos -->
                <div class="member-card teammate">
                  <div class="member-top">
                    <UserAvatar name="Carlos" :src="carlosAvatar" :size="42" online />
                    <div class="member-info">
                      <strong class="member-name">Carlos</strong>
                      <span class="member-role">Admin</span>
                    </div>
                    <span class="done-pill">✓ Cumplió</span>
                  </div>
                  <div v-if="habit.carlosNote" class="member-note-box">
                    <span class="note-icon">💬</span>
                    <span class="note-text">"{{ habit.carlosNote }}"</span>
                  </div>
                </div>

                <!-- Valeria (Tú) -->
                <div class="member-card is-me" :class="{ 'is-completed': habit.valeriaCompleted }">
                  <div class="member-top">
                    <UserAvatar name="Valeria" :src="valeriaAvatar" :size="42" online />
                    <div class="member-info">
                      <strong class="member-name">Valeria</strong>
                      <span class="member-role you">Tú</span>
                    </div>
                    <span v-if="habit.valeriaCompleted" class="done-pill success">✓ Cumplido</span>
                    <span v-else class="done-pill pending">⏳ Pendiente</span>
                  </div>

                  <!-- Campo de Nota para que la persona escriba su avance -->
                  <div class="note-input-wrap">
                    <input
                      v-model="habit.valeriaNote"
                      type="text"
                      placeholder="Escribe una nota rápida... ej. Avancé en los componentes"
                      class="note-field"
                    />
                  </div>

                  <!-- Botón Táctil Duolingo -->
                  <button
                    type="button"
                    class="duo-habit-btn"
                    :class="habit.valeriaCompleted ? 'completed' : 'todo'"
                    @click="toggleHabit(habit)"
                  >
                    <span v-if="!habit.valeriaCompleted">
                      MARCAR COMO HECHO 🔥
                    </span>
                    <span v-else>
                      ¡COMPLETADO HOY! ✨
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 3. CUENTA REGRESIVA DE MEDIANOCHE (LIMPIO COMO ESTABA ANTES) -->
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

    <!-- Modal para Crear Nuevo Hábito en el Grupo -->
    <div v-if="isCreateHabitModalOpen" class="modal-overlay" @click.self="isCreateHabitModalOpen = false">
      <div class="modal-card">
        <header class="modal-head">
          <div>
            <h3>Crear hábito para el equipo</h3>
            <p>Agrega un hábito compartido para que todos hagan check-in diario.</p>
          </div>
          <button type="button" class="modal-close-btn" @click="isCreateHabitModalOpen = false">
            <AppIcon name="x" :size="18" />
          </button>
        </header>

        <form class="modal-body" @submit.prevent="saveNewHabit">
          <div class="form-field">
            <label>Nombre del hábito</label>
            <input
              v-model="newHabitName"
              type="text"
              placeholder="ej. Leer 30 mins, Ir al gym, Estudiar inglés"
              required
              autofocus
              class="modal-input"
            />
          </div>

          <div class="form-field">
            <label>Elige un icono</label>
            <div class="icon-selector">
              <button
                v-for="icon in availableIcons"
                :key="icon"
                type="button"
                class="icon-option"
                :class="{ selected: newHabitIcon === icon }"
                @click="newHabitIcon = icon"
              >
                {{ icon }}
              </button>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="isCreateHabitModalOpen = false">Cancelar</button>
            <button type="submit" class="btn-save">Guardar hábito 🔥</button>
          </div>
        </form>
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
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--bg);
}

.group-main {
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 1.5rem 2rem 3rem;
}

.group-container {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
}

/* Nav */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
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
  padding: 0.5rem 0.95rem;
  border-radius: 99px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(22, 19, 32, 0.6);
  color: #d1cde3;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.chat-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.chat-toggle-btn.active {
  background: rgba(168, 85, 247, 0.18);
  border-color: rgba(168, 85, 247, 0.4);
  color: #c4b5fd;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

/* Heading */
.group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.group-heading h1 {
  margin: 0;
  font-size: 1.95rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.group-heading p {
  margin: 0.35rem 0 0;
  font-size: 0.92rem;
  color: #94a3b8;
}

.code-chip {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.9rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.82rem;
}

.code-label {
  color: #94a3b8;
}

.code-chip strong {
  font-family: monospace;
  font-size: 0.92rem;
  color: #c4b5fd;
  letter-spacing: 0.05em;
}

/* ================================================= */
/* 1. FUEGUITO SUPER GRANDE EN EL CENTRO 🔥          */
/* ================================================= */
.duo-streak-hero-centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 1.2rem;
  padding: 2.2rem 2rem;
  border-radius: 32px;
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.18) 0%, rgba(22, 19, 32, 0.88) 100%);
  border: 2px solid rgba(249, 115, 22, 0.4);
  box-shadow:
    0 20px 50px -15px rgba(0, 0, 0, 0.8),
    0 0 50px rgba(249, 115, 22, 0.2);
}

.giant-flame-bubble {
  width: 110px;
  height: 110px;
  border-radius: 32px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.3) 0%, rgba(234, 88, 12, 0.15) 100%);
  border: 2px solid rgba(251, 146, 60, 0.5);
  box-shadow: 0 0 40px rgba(249, 115, 22, 0.5);
  animation: pulseGiantFlame 3s ease-in-out infinite alternate;
}

@keyframes pulseGiantFlame {
  0% { transform: scale(1); box-shadow: 0 0 30px rgba(249, 115, 22, 0.4); }
  100% { transform: scale(1.08); box-shadow: 0 0 55px rgba(249, 115, 22, 0.7); }
}

.giant-flame-icon {
  font-size: 4.6rem;
  filter: drop-shadow(0 0 20px rgba(249, 115, 22, 1));
}

.streak-center-texts {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.streak-pill-tag {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.85rem;
  border-radius: 99px;
  background: rgba(249, 115, 22, 0.22);
  color: #ffba88;
  border: 1px solid rgba(249, 115, 22, 0.45);
}

.streak-center-count {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.7rem;
}

.giant-num {
  font-size: 3.5rem;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
  text-shadow: 0 4px 20px rgba(249, 115, 22, 0.75);
}

.giant-label {
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #f97316;
}

.streak-center-desc {
  margin: 0;
  font-size: 0.92rem;
  color: #cbd5e1;
  max-width: 520px;
  line-height: 1.5;
}

/* ================================================= */
/* 2. HÁBITOS DEL GRUPO (MÚLTIPLES HÁBITOS Y NOTAS)   */
/* ================================================= */
.habits-section {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.habits-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.habits-header-row h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: #f8fafc;
}

.habits-sub {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: #94a3b8;
}

/* Botón Crear Hábito (Tactile 3D Duolingo) */
.btn-create-habit {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.35rem;
  border-radius: 99px;
  border: none;
  font-size: 0.88rem;
  font-weight: 800;
  color: #1a0f05;
  background: linear-gradient(135deg, #ff9a4d 0%, #f97316 100%);
  cursor: pointer;
  box-shadow: 0 4px 0 #c2410c, 0 6px 16px rgba(249, 115, 22, 0.35);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.btn-create-habit:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 0 #c2410c, 0 8px 20px rgba(249, 115, 22, 0.5);
}

.btn-create-habit:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #c2410c;
}

.habits-list {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.habit-group-block {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.4rem;
  border-radius: 24px;
  background: rgba(22, 19, 32, 0.65);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
}

.habit-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.habit-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.habit-emoji-icon {
  font-size: 1.35rem;
}

.habit-block-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: #ffffff;
}

.habit-active-tag {
  font-size: 0.74rem;
  font-weight: 700;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
}

.habit-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

/* Tarjeta del Miembro */
.member-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.15rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.member-card.is-me {
  background: rgba(249, 115, 22, 0.04);
  border-color: rgba(249, 115, 22, 0.25);
}

.member-card.is-completed {
  background: rgba(34, 197, 94, 0.05);
  border-color: rgba(34, 197, 94, 0.3);
}

.member-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.member-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.member-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #ffffff;
}

.member-role {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.member-role.you {
  color: #fb923c;
  font-weight: 800;
}

.done-pill {
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.done-pill.pending {
  background: rgba(249, 115, 22, 0.15);
  color: #fb923c;
  border-color: rgba(249, 115, 22, 0.3);
}

/* Caja de Notas */
.member-note-box {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  padding: 0.55rem 0.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.8rem;
  color: #cbd5e1;
  font-style: italic;
}

.note-input-wrap {
  width: 100%;
}

.note-field {
  width: 100%;
  padding: 0.55rem 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.25);
  color: #f1f0f7;
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s;
}

.note-field:focus {
  border-color: rgba(249, 115, 22, 0.5);
}

/* Botón Táctil Duolingo */
.duo-habit-btn {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 14px;
  border: none;
  font-size: 0.88rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  user-select: none;
}

.duo-habit-btn.todo {
  background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%);
  color: #1a0f05;
  box-shadow: 0 4px 0 #9a3412;
}

.duo-habit-btn.todo:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 0 #9a3412;
}

.duo-habit-btn.todo:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #9a3412;
}

.duo-habit-btn.completed {
  background: linear-gradient(180deg, #4ade80 0%, #16a34a 100%);
  color: #052e16;
  box-shadow: 0 4px 0 #15803d;
}

.duo-habit-btn.completed:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #15803d;
}

/* ================================================= */
/* 3. CUENTA REGRESIVA DE MEDIANOCHE (LIMPIO)        */
/* ================================================= */
.countdown-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.8rem;
  border-radius: 24px;
  background: rgba(22, 19, 32, 0.5);
  border: 1px dashed rgba(255, 255, 255, 0.12);
}

.countdown-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 0.4rem;
}

.countdown-digits {
  font-family: monospace;
  font-size: 2.1rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #f8fafc;
  text-shadow: 0 0 16px rgba(255, 255, 255, 0.25);
}

.countdown-hint {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
  max-width: 500px;
}

/* Modal Crear Hábito */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 1rem;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  border-radius: 24px;
  background: rgba(22, 19, 32, 0.95);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  padding: 1.8rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.2rem;
}

.modal-head h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  color: #ffffff;
}

.modal-head p {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: #94a3b8;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-field label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #e2e8f0;
}

.modal-input {
  padding: 0.75rem 1rem;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 0.9rem;
  outline: none;
}

.modal-input:focus {
  border-color: #f97316;
}

.icon-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.icon-option {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  font-size: 1.2rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-option.selected {
  background: rgba(249, 115, 22, 0.25);
  border-color: #f97316;
  transform: scale(1.08);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-cancel {
  padding: 0.65rem 1rem;
  border-radius: 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  font-weight: 700;
  cursor: pointer;
}

.btn-save {
  padding: 0.65rem 1.4rem;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ff9a4d, #f97316);
  color: #1a0f05;
  font-weight: 800;
  cursor: pointer;
}

/* Chat Pane */
.group-chat-pane {
  width: 380px;
  height: 100vh;
  border-left: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.slide-chat-enter-active,
.slide-chat-leave-active {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease;
}

.slide-chat-enter-from,
.slide-chat-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 1024px) {
  .group-chat-pane {
    position: fixed;
    right: 0;
    top: 0;
    z-index: 50;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.8);
  }
}
</style>
