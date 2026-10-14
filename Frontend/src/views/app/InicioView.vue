<script setup lang="ts">
/**
 * INICIO (Dashboard General de Kordia).
 * 
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useCreateGroupModal } from '@/composables/useCreateGroupModal'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import type { Group } from '@/types/group'
import valeriaAvatar from '@/assets/avatars/valeria.jpg'

const session = useSessionStore()
const groupsStore = useGroupsStore()
const createModal = useCreateGroupModal()
const { hours, minutes, seconds } = useMidnightCountdown()

const userName = computed(() => session.currentUser?.name ?? 'Valeria')
const firstName = computed(() => userName.value.split(' ')[0] ?? userName.value)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return '¡Buenos días'
  if (h < 19) return '¡Buenas tardes'
  return '¡Buenas noches'
})

const todayText = computed(() =>
  new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
)

const timeLeftFormatted = computed(
  () => `${hours.value}h ${String(minutes.value).padStart(2, '0')}m ${String(seconds.value).padStart(2, '0')}s`,
)

const powGroup = computed<Group | undefined>(() =>
  groupsStore.groups.find((g) => g.id === 'equipo-pow') ?? groupsStore.groups[0],
)

// Estado del Check General del Sistema
const isGlobalStreakClaimed = ref(false)
const showMissingHabitsPanel = ref(false)

// Verificar si todos los hábitos en todos los grupos están completados
const allHabitsDone = computed(() => groupsStore.pendingToday === 0 && groupsStore.doneToday > 0)

// Hábitos pendientes del usuario en los grupos
const pendingHabitsList = computed(() => {
  const list: { groupId: string; groupName: string; habit: string }[] = []
  for (const g of groupsStore.groups) {
    const me = g.members.find((m) => m.isCurrentUser)
    if (me && !me.checkedInToday) {
      list.push({ groupId: g.id, groupName: g.name, habit: me.habit })
    }
  }
  return list
})

// Hábitos completados del usuario en los grupos
const completedHabitsList = computed(() => {
  const list: { groupId: string; groupName: string; habit: string; streak: number }[] = []
  for (const g of groupsStore.groups) {
    const me = g.members.find((m) => m.isCurrentUser)
    if (me && me.checkedInToday) {
      list.push({ groupId: g.id, groupName: g.name, habit: me.habit, streak: me.streak })
    }
  }
  return list
})

function handleClaimGlobalStreak(): void {
  if (!allHabitsDone.value) {
    showMissingHabitsPanel.value = !showMissingHabitsPanel.value
    return
  }
  isGlobalStreakClaimed.value = true
  showMissingHabitsPanel.value = false
}

const weekAverage = computed(() => {
  const days = groupsStore.weekProgress
  if (days.length === 0) return 0
  return Math.round(days.reduce((a, d) => a + d.value, 0) / days.length)
})

// Actividad general limpia y simple
const generalActivities = [
  {
    id: 'a1',
    icon: '🔥',
    text: 'Carlos completó su check-in en EQUIPO POW',
    note: 'Terminé las migraciones de Prisma y endpoints 🚀',
    time: 'Hace 2 horas',
  },
  {
    id: 'a2',
    icon: '⭐',
    text: 'Valeria alcanzó 6 días de racha general en Kordia',
    note: 'Constancia diaria al 100% ✨',
    time: 'Hoy',
  },
  {
    id: 'a3',
    icon: '🛡️',
    text: 'EQUIPO POW cerró ayer sin ninguna deserción',
    note: 'La racha del grupo se incrementó a 6 días',
    time: 'Ayer',
  },
]
</script>

<template>
  <div class="inicio-page">
    <div class="inicio-container">
      <!-- 1. HEADER GENERAL CON PERFIL Y NIVEL -->
      <header class="gamified-hero-header">
        <div class="user-greeting-box">
          <UserAvatar :name="userName" :src="valeriaAvatar" :size="60" ring online />
          <div class="user-titles">
            <span class="date-badge">{{ todayText }}</span>
            <h1>{{ greeting }}, <span class="highlight-name">{{ firstName }}</span>!</h1>
          </div>
        </div>

        <!-- Tarjeta de Nivel de XP -->
        <div class="user-level-card">
          <div class="level-top-row">
            <span class="level-badge">⚡ NIVEL 3</span>
            <span class="xp-counter"><strong>380</strong> / 500 XP</span>
          </div>
          <div class="level-bar-track">
            <div class="level-bar-fill" style="width: 76%"></div>
          </div>
          <span class="level-caption">Explorador Imparable · Sube de nivel con tus hábitos</span>
        </div>
      </header>

      <!-- 2. EL GRAN FUEGUITO DE RACHA GENERAL EN KORDIA 🔥 -->
      <section class="duo-streak-hero-card">
        <div class="flame-master-row">
          <div class="giant-flame-bubble">
            <span class="super-giant-flame">🔥</span>
          </div>
          <div class="streak-texts">
            <div class="streak-badge-row">
              <span class="tag-general-flame">RACHA GENERAL</span>
              <span class="tag-kordia-status">CONSTANCIA EN LA APP</span>
            </div>
            <div class="streak-counter-box">
              <strong class="streak-huge-number">{{ groupsStore.bestStreak }}</strong>
              <span class="streak-unit-label">DÍAS CONSECUTIVOS</span>
            </div>
            <p class="streak-desc">
              Llevas <strong>{{ groupsStore.bestStreak }} días</strong> consecutivos de constancia en tus hábitos.
            </p>
          </div>
        </div>

        <!-- Días de la semana interactivos -->
        <div class="week-streak-row">
          <div
            v-for="day in groupsStore.weekProgress"
            :key="day.key"
            class="day-col"
            :class="{ 'is-today': day.isToday, 'is-done': day.value === 100 }"
          >
            <span class="day-label">{{ day.label }}</span>
            <div class="day-dot">
              <span v-if="day.value === 100" class="dot-check">✓</span>
              <span v-else-if="day.isToday && isGlobalStreakClaimed" class="dot-check">✓</span>
              <span v-else-if="day.isToday" class="dot-flame">🔥</span>
              <span v-else class="dot-empty"></span>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. EL GRAN BOTÓN: CHECK GENERAL DE RACHA 🔥 -->
      <section class="master-check-container">
        <!-- Modal emergente si faltan hábitos -->
        <Teleport to="body">
          <Transition name="modal-pop">
            <div
              v-if="showMissingHabitsPanel && !allHabitsDone"
              class="missing-habits-modal-backdrop"
              @click.self="showMissingHabitsPanel = false"
            >
              <div class="missing-habits-modal-card">
                <div class="modal-card-top">
                  <div class="modal-title-flex">
                    <span class="modal-flame-icon">🎯</span>
                    <div>
                      <h3 class="modal-heading">Hábitos pendientes</h3>
                      <p class="modal-sub">Completa tus metas en los equipos para registrar el check de hoy</p>
                    </div>
                  </div>
                  <button type="button" class="btn-close-modal" @click="showMissingHabitsPanel = false">✕</button>
                </div>

                <div class="modal-habits-list">
                  <div v-for="item in pendingHabitsList" :key="item.groupId" class="modal-habit-item">
                    <div class="modal-habit-details">
                      <span class="modal-group-pill">{{ item.groupName }}</span>
                      <strong class="modal-habit-name">{{ item.habit }}</strong>
                    </div>
                    <RouterLink
                      :to="{ name: 'grupo', params: { groupId: item.groupId } }"
                      class="btn-modal-action"
                      @click="showMissingHabitsPanel = false"
                    >
                      Ir al equipo ↗
                    </RouterLink>
                  </div>
                </div>

                <div class="modal-card-bottom">
                  <button type="button" class="btn-modal-dismiss" @click="showMissingHabitsPanel = false">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Botón Táctil: CHECK GENERAL -->
        <button
          type="button"
          class="epic-master-check-btn"
          :class="{
            'is-ready': allHabitsDone && !isGlobalStreakClaimed,
            'is-claimed': isGlobalStreakClaimed,
            'is-locked': !allHabitsDone
          }"
          @click="handleClaimGlobalStreak"
        >
          <!-- Estado 1: Ya reclamado hoy -->
          <span v-if="isGlobalStreakClaimed" class="btn-check-content">
            <span class="btn-status-emoji">✨</span>
            <span class="btn-label-text">CHECK COMPLETADO</span>
          </span>

          <!-- Estado 2: Todos los hábitos listos -> Listo para hacer Check -->
          <span v-else-if="allHabitsDone" class="btn-check-content">
            <span class="btn-status-emoji">🔥</span>
            <span class="btn-label-text">CHECK GENERAL (+100 XP)</span>
          </span>

          <!-- Estado 3: Faltan hábitos -> Alerta/Bloqueado -->
          <span v-else class="btn-check-content">
            <span class="btn-status-emoji">⚡</span>
            <span class="btn-label-text">CHECK GENERAL</span>
          </span>
        </button>
      </section>

      <!-- 4. RECORDATORIOS DE HÁBITOS DE HOY (SOLO LECTURA CON CONTADOR EN ROJO) -->
      <section class="reminders-section">
        <div class="section-title-bar">
          <div class="title-with-pill">
            <h2>Recordatorios de hoy</h2>
            <span class="reminders-tag">METAS DE HOY</span>
          </div>

          <!-- Contador de urgencia en rojo llamativo -->
          <div class="urgent-countdown-pill" :class="{ 'all-cleared': allHabitsDone }">
            <span class="urgent-icon">⏰</span>
            <span v-if="!allHabitsDone" class="urgent-text">
              Racha en peligro: <strong>{{ timeLeftFormatted }}</strong>
            </span>
            <span v-else class="cleared-text">
              ¡Hábitos de hoy al día! ✨
            </span>
          </div>
        </div>

        <!-- Tarjetas de Recordatorios (Sin botón de check aquí; informativas) -->
        <div class="reminders-display-list">
          <!-- Hábitos pendientes -->
          <div
            v-for="item in pendingHabitsList"
            :key="item.groupId"
            class="reminder-item-card pending"
          >
            <div class="reminder-item-left">
              <span class="reminder-icon">💻</span>
              <div class="reminder-meta">
                <div class="meta-tags">
                  <span class="group-name-tag">{{ item.groupName }}</span>
                  <span class="urgent-state-tag">PENDIENTE HOY</span>
                </div>
                <strong class="habit-title">{{ item.habit }}</strong>
                <span class="habit-hint">Debes registrar tu avance dentro del grupo antes de medianoche</span>
              </div>
            </div>

            <!-- Enlace para ir al grupo a completarlo -->
            <RouterLink :to="{ name: 'grupo', params: { groupId: item.groupId } }" class="btn-go-to-group">
              Ir al grupo ↗
            </RouterLink>
          </div>

          <!-- Hábitos ya completados -->
          <div
            v-for="item in completedHabitsList"
            :key="item.groupId"
            class="reminder-item-card completed"
          >
            <div class="reminder-item-left">
              <span class="reminder-icon done">✓</span>
              <div class="reminder-meta">
                <div class="meta-tags">
                  <span class="group-name-tag">{{ item.groupName }}</span>
                  <span class="done-state-tag">COMPLETADO HOY ✨</span>
                </div>
                <strong class="habit-title">{{ item.habit }}</strong>
                <span class="habit-hint">¡Meta cumplida! Sumaste a la racha de tu equipo</span>
              </div>
            </div>

            <RouterLink :to="{ name: 'grupo', params: { groupId: item.groupId } }" class="btn-view-group">
              Ver grupo
            </RouterLink>
          </div>
        </div>
      </section>

      <!-- 5. STATS DE EFICIENCIA Y GRÁFICO SEMANAL -->
      <section class="stats-and-chart-section">
        <!-- 3 Métricas Clave -->
        <div class="stats-triad-grid">
          <div class="stat-box-card">
            <span class="stat-emoji-bubble purple">📈</span>
            <div class="stat-data">
              <span class="stat-label">Eficiencia general</span>
              <strong class="stat-value">{{ groupsStore.completionRate30 }}%</strong>
              <span class="stat-hint">Últimos 30 días en Kordia</span>
            </div>
          </div>

          <div class="stat-box-card">
            <span class="stat-emoji-bubble green">🎯</span>
            <div class="stat-data">
              <span class="stat-label">Metas de hoy</span>
              <strong class="stat-value">{{ groupsStore.doneToday }} / {{ groupsStore.doneToday + groupsStore.pendingToday }}</strong>
              <span class="stat-hint">{{ groupsStore.pendingToday > 0 ? `${groupsStore.pendingToday} por completar` : '¡Todas al día!' }}</span>
            </div>
          </div>

          <div class="stat-box-card">
            <span class="stat-emoji-bubble orange">🔥</span>
            <div class="stat-data">
              <span class="stat-label">Mejor racha</span>
              <strong class="stat-value">{{ groupsStore.bestStreak }} días</strong>
              <span class="stat-hint">Récord personal</span>
            </div>
          </div>
        </div>

        <!-- Gráfico Semanal Orgánico y Limpio -->
        <div class="chart-showcase-card">
          <div class="chart-header-row">
            <div>
              <h3>Constancia de la semana</h3>
              <p class="chart-desc">Promedio de cumplimiento: <strong>{{ weekAverage }}%</strong> en los últimos 7 días</p>
            </div>
            <span class="chart-pill-badge">Últimos 7 días</span>
          </div>

          <!-- Barras redondeadas sin cuadrículas de IA -->
          <div class="bars-track-row">
            <div
              v-for="d in groupsStore.weekProgress"
              :key="d.key"
              class="bar-item-col"
              :class="{ 'is-today': d.isToday }"
            >
              <div class="bar-vertical-capsule">
                <div
                  class="bar-fill-gradient"
                  :class="{ full: d.value === 100, today: d.isToday }"
                  :style="{ height: `${Math.max(d.value, 8)}%` }"
                >
                  <span class="bar-percent-tag">{{ d.value }}%</span>
                </div>
              </div>
              <span class="bar-day-title">{{ d.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. TUS EQUIPOS (CARDS AMIGABLES CON RACHA DE CADA GRUPO) -->
      <section class="groups-section">
        <div class="section-title-bar">
          <h2>Tus equipos</h2>
          <span class="groups-count-pill">{{ groupsStore.groups.length }} activo</span>
        </div>

        <div class="groups-display-grid">
          <!-- Tarjeta de EQUIPO POW -->
          <article v-for="g in groupsStore.groups" :key="g.id" class="team-showcase-card">
            <div class="team-top-head">
              <div class="team-identity">
                <span class="team-symbol">⚡</span>
                <div class="team-names">
                  <strong>{{ g.name }}</strong>
                  <span>{{ g.category }}</span>
                </div>
              </div>
              <!-- Racha específica de este grupo -->
              <div class="team-streak-badge">
                <span>🔥</span>
                <strong>{{ g.streak }} días</strong>
              </div>
            </div>

            <!-- Avatares de miembros y estado -->
            <div class="team-roster-row">
              <div class="roster-cluster">
                <UserAvatar v-for="m in g.members" :key="m.id" :name="m.name" :src="m.avatarUrl" :size="34" />
              </div>
              <span class="roster-status-note">
                {{ g.members.filter(m => m.checkedInToday).length }}/{{ g.members.length }} miembros cumplieron hoy
              </span>
            </div>

            <!-- Botón de Entrada al Grupo -->
            <RouterLink :to="{ name: 'grupo', params: { groupId: g.id } }" class="team-enter-btn">
              <span>Ir al equipo</span>
              <AppIcon name="arrow-right" :size="16" />
            </RouterLink>
          </article>

          <!-- Tarjeta para crear nuevo grupo -->
          <button type="button" class="create-group-ghost-card" @click="createModal.open">
            <div class="ghost-plus-circle">
              <AppIcon name="plus" :size="22" :stroke-width="2.5" />
            </div>
            <strong>Crear nuevo grupo</strong>
            <span>Invita a tus amigos y compitan juntos</span>
          </button>
        </div>
      </section>

      <!-- 7. ACTIVIDAD GENERAL (SIMPLE Y LIMPIO) -->
      <section class="general-activity-section">
        <div class="section-title-bar">
          <h2>Actividad general</h2>
        </div>

        <div class="general-activity-list">
          <div v-for="item in generalActivities" :key="item.id" class="activity-row">
            <span class="activity-icon-badge">{{ item.icon }}</span>
            <div class="activity-row-content">
              <p class="activity-main-text">{{ item.text }}</p>
              <span v-if="item.note" class="activity-note-sub">"{{ item.note }}"</span>
            </div>
            <span class="activity-time-pill">{{ item.time }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.inicio-page {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background-color: var(--bg);
  color: #f1f0f7;
  padding: 1.8rem 2.2rem 3.5rem;
}

.inicio-container {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
}

/* ================================================= */
/* 1. HEADER GENERAL CON PERFIL Y NIVEL              */
/* ================================================= */
.gamified-hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 0.4rem 0;
}

.user-greeting-box {
  display: flex;
  align-items: center;
  gap: 1.1rem;
}

.user-titles {
  display: flex;
  flex-direction: column;
}

.date-badge {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: capitalize;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

.user-titles h1 {
  margin: 0.15rem 0 0.1rem;
  font-size: 1.85rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.highlight-name {
  background: linear-gradient(135deg, #ff9a4d 0%, #f97316 60%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sub-welcome {
  margin: 0;
  font-size: 0.88rem;
  color: #a7a2bc;
}

/* Tarjeta de Nivel de XP */
.user-level-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.85rem 1.2rem;
  border-radius: 18px;
  background: rgba(22, 19, 32, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 250px;
  box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);
}

.level-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.level-badge {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #fbbf24;
}

.xp-counter {
  font-size: 0.76rem;
  color: #94a3b8;
}

.xp-counter strong {
  color: #ffffff;
}

.level-bar-track {
  width: 100%;
  height: 7px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.level-bar-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #f59e0b 0%, #f97316 100%);
  box-shadow: 0 0 10px rgba(249, 115, 22, 0.6);
  transition: width 0.4s ease;
}

.level-caption {
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 600;
}

/* ================================================= */
/* 2. GRAN FUEGUITO DE RACHA GENERAL 🔥              */
/* ================================================= */
.duo-streak-hero-card {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: 1.8rem 2rem;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(22, 19, 32, 0.88) 100%);
  border: 1.5px solid rgba(249, 115, 22, 0.35);
  box-shadow:
    0 16px 40px -12px rgba(0, 0, 0, 0.75),
    0 0 35px rgba(249, 115, 22, 0.15);
}

.flame-master-row {
  display: flex;
  align-items: center;
  gap: 1.6rem;
}

.giant-flame-bubble {
  width: 88px;
  height: 88px;
  border-radius: 26px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.3) 0%, rgba(234, 88, 12, 0.14) 100%);
  border: 1.5px solid rgba(251, 146, 60, 0.45);
  box-shadow: 0 0 28px rgba(249, 115, 22, 0.45);
  flex-shrink: 0;
  animation: pulseFlame 3s ease-in-out infinite alternate;
}

@keyframes pulseFlame {
  0% { transform: scale(1); }
  100% { transform: scale(1.05); }
}

.super-giant-flame {
  font-size: 3.2rem;
  filter: drop-shadow(0 0 16px rgba(249, 115, 22, 0.9));
}

.streak-texts {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.streak-badge-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tag-general-flame {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.55rem;
  border-radius: 99px;
  background: rgba(249, 115, 22, 0.22);
  color: #ffba88;
  border: 1px solid rgba(249, 115, 22, 0.4);
}

.tag-kordia-status {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #c4b5fd;
}

.streak-counter-box {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}

.streak-huge-number {
  font-size: 2.9rem;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
  text-shadow: 0 2px 14px rgba(249, 115, 22, 0.6);
}

.streak-unit-label {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #f97316;
}

.streak-desc {
  margin: 0;
  font-size: 0.88rem;
  color: #cbd5e1;
  line-height: 1.45;
}

/* Calendario semanal de racha */
.week-streak-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.day-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.day-label {
  font-size: 0.76rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}

.day-col.is-today .day-label {
  color: #f97316;
  font-weight: 900;
}

.day-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
}

.day-col.is-done .day-dot {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border-color: #fb923c;
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.6);
  color: #fff;
}

.day-col.is-today .day-dot {
  border-color: #f97316;
  box-shadow: 0 0 14px rgba(249, 115, 22, 0.5);
}

.dot-check {
  font-size: 0.9rem;
  font-weight: 900;
}

.dot-flame {
  font-size: 1.1rem;
}

.dot-empty {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

/* ================================================= */
/* 3. EL GRAN BOTÓN: CHECK GENERAL DE RACHA 🔥       */
/* ================================================= */
.master-check-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
}

/* Modal flotante de Hábitos pendientes */
.missing-habits-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(8, 7, 15, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.missing-habits-modal-card {
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, #1f1b2e 0%, #161224 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 1.6rem 1.8rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 30px rgba(249, 115, 22, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.3rem;
  animation: modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScaleIn {
  0% { transform: scale(0.92); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.modal-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.modal-title-flex {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.modal-flame-icon {
  font-size: 1.7rem;
}

.modal-heading {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: #ffffff;
}

.modal-sub {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: #94a3b8;
  line-height: 1.35;
}

.btn-close-modal {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.15s;
}

.btn-close-modal:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.modal-habits-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.modal-habit-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  gap: 0.85rem;
}

.modal-habit-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.modal-group-pill {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #a78bfa;
  text-transform: uppercase;
}

.modal-habit-name {
  font-size: 0.95rem;
  color: #f8fafc;
}

.btn-modal-action {
  font-size: 0.8rem;
  font-weight: 800;
  color: #fb923c;
  background: rgba(249, 115, 22, 0.12);
  border: 1px solid rgba(249, 115, 22, 0.3);
  padding: 0.45rem 0.85rem;
  border-radius: 10px;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.15s;
}

.btn-modal-action:hover {
  background: rgba(249, 115, 22, 0.22);
  color: #ffffff;
}

.modal-card-bottom {
  display: flex;
  justify-content: flex-end;
}

.btn-modal-dismiss {
  padding: 0.55rem 1.25rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #e2e8f0;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-modal-dismiss:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.modal-pop-enter-active,
.modal-pop-leave-active {
  transition: opacity 0.2s ease;
}

.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
}

/* Botón Gigante Epic Check */
.epic-master-check-btn {
  width: 100%;
  padding: 1.25rem 2rem;
  border-radius: 24px;
  border: none;
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}

.btn-check-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
}

.btn-status-emoji {
  font-size: 1.35rem;
}

/* Estado Bloqueado / Faltan hábitos */
.epic-master-check-btn.is-locked {
  background: linear-gradient(180deg, #332d47 0%, #1c1829 100%);
  color: #e2e8f0;
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 6px 0 #120f1c, 0 10px 24px rgba(0, 0, 0, 0.5);
}

.epic-master-check-btn.is-locked:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 8px 0 #120f1c, 0 14px 28px rgba(0, 0, 0, 0.6);
}

.epic-master-check-btn.is-locked:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #120f1c;
}

/* Estado Listo para activar */
.epic-master-check-btn.is-ready {
  background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%);
  color: #1a0f05;
  box-shadow: 0 6px 0 #9a3412, 0 12px 30px rgba(249, 115, 22, 0.55);
  animation: pulseReadyCheck 2s ease-in-out infinite alternate;
}

@keyframes pulseReadyCheck {
  0% { transform: scale(1); box-shadow: 0 6px 0 #9a3412, 0 10px 25px rgba(249, 115, 22, 0.4); }
  100% { transform: scale(1.02); box-shadow: 0 8px 0 #9a3412, 0 16px 36px rgba(249, 115, 22, 0.7); }
}

.epic-master-check-btn.is-ready:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #9a3412;
}

/* Estado Ya Activado / Blindado */
.epic-master-check-btn.is-claimed {
  background: linear-gradient(180deg, #4ade80 0%, #16a34a 100%);
  color: #052e16;
  box-shadow: 0 6px 0 #15803d, 0 12px 28px rgba(34, 197, 94, 0.4);
}

.master-check-hint {
  font-size: 0.8rem;
  color: #94a3b8;
  text-align: center;
}

/* ================================================= */
/* 4. RECORDATORIOS DE HÁBITOS DE HOY                */
/* ================================================= */
.reminders-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.title-with-pill {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title-bar h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: #ffffff;
}

.reminders-tag {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.55rem;
  border-radius: 99px;
  background: rgba(168, 85, 247, 0.18);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.35);
}

/* Contador en rojo estilo Duolingo */
.urgent-countdown-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem;
  border-radius: 99px;
  background: rgba(239, 68, 68, 0.18);
  border: 1.5px solid rgba(239, 68, 68, 0.55);
  color: #fca5a5;
  font-size: 0.84rem;
  font-weight: 700;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.35);
  animation: urgentGlow 2s ease-in-out infinite alternate;
}

@keyframes urgentGlow {
  0% { transform: scale(1); box-shadow: 0 0 12px rgba(239, 68, 68, 0.3); }
  100% { transform: scale(1.02); box-shadow: 0 0 24px rgba(239, 68, 68, 0.6); }
}

.urgent-countdown-pill.all-cleared {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
  box-shadow: 0 0 14px rgba(34, 197, 94, 0.3);
  animation: none;
}

.reminders-display-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.reminder-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 1.2rem 1.5rem;
  border-radius: 20px;
  background: rgba(22, 19, 32, 0.75);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.5);
  flex-wrap: wrap;
}

.reminder-item-card.pending {
  border-color: rgba(239, 68, 68, 0.3);
}

.reminder-item-card.completed {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.04);
}

.reminder-item-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.reminder-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  font-size: 1.3rem;
}

.reminder-icon.done {
  background: rgba(34, 197, 94, 0.18);
  border-color: #22c55e;
  color: #4ade80;
  font-weight: 900;
  font-size: 1.15rem;
}

.reminder-meta {
  display: flex;
  flex-direction: column;
}

.meta-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.group-name-tag {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #a855f7;
}

.urgent-state-tag {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.12rem 0.5rem;
  border-radius: 99px;
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.done-state-tag {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.12rem 0.5rem;
  border-radius: 99px;
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.habit-title {
  font-size: 1.05rem;
  font-weight: 900;
  color: #ffffff;
  margin-top: 2px;
}

.habit-hint {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-top: 1px;
}

.btn-go-to-group {
  padding: 0.65rem 1.2rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 800;
  color: #1a0f05;
  background: linear-gradient(135deg, #ff9a4d, #f97316);
  text-decoration: none;
  box-shadow: 0 4px 0 #9a3412;
  transition: transform 0.12s ease;
}

.btn-go-to-group:hover {
  transform: translateY(-2px);
}

.btn-view-group {
  padding: 0.65rem 1.2rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 800;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
  text-decoration: none;
  transition: background 0.15s;
}

.btn-view-group:hover {
  background: rgba(34, 197, 94, 0.2);
}

/* ================================================= */
/* 5. STATS DE EFICIENCIA Y GRÁFICO SEMANAL          */
/* ================================================= */
.stats-and-chart-section {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.stats-triad-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.stat-box-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem 1.4rem;
  border-radius: 20px;
  background: rgba(22, 19, 32, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.4);
}

.stat-emoji-bubble {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 1.35rem;
}

.stat-emoji-bubble.purple { background: rgba(168, 85, 247, 0.16); }
.stat-emoji-bubble.green { background: rgba(34, 197, 94, 0.16); }
.stat-emoji-bubble.orange { background: rgba(249, 115, 22, 0.16); }

.stat-data {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.76rem;
  font-weight: 700;
  color: #94a3b8;
}

.stat-value {
  font-size: 1.45rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.2;
}

.stat-hint {
  font-size: 0.74rem;
  color: #64748b;
  margin-top: 1px;
}

/* Gráfico Semanal */
.chart-showcase-card {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding: 1.6rem 1.8rem;
  border-radius: 24px;
  background: rgba(22, 19, 32, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.chart-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-header-row h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #ffffff;
}

.chart-desc {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: #94a3b8;
}

.chart-desc strong {
  color: #f97316;
}

.chart-pill-badge {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.2rem 0.65rem;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}

.bars-track-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 140px;
  padding: 0 0.5rem;
}

.bar-item-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  height: 100%;
  flex: 1;
}

.bar-vertical-capsule {
  width: 24px;
  height: 110px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 2px;
  position: relative;
}

.bar-fill-gradient {
  width: 100%;
  border-radius: 99px;
  background: linear-gradient(180deg, #a855f7 0%, #6b21a8 100%);
  position: relative;
  transition: height 0.4s ease;
}

.bar-fill-gradient.today {
  background: linear-gradient(180deg, #ff9a4d 0%, #f97316 100%);
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.5);
}

.bar-fill-gradient.full {
  background: linear-gradient(180deg, #4ade80 0%, #16a34a 100%);
}

.bar-percent-tag {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  font-weight: 800;
  color: #94a3b8;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.bar-item-col:hover .bar-percent-tag {
  opacity: 1;
  color: #ffffff;
}

.bar-day-title {
  font-size: 0.74rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.bar-item-col.is-today .bar-day-title {
  color: #f97316;
  font-weight: 900;
}

/* ================================================= */
/* 6. TUS EQUIPOS                                    */
/* ================================================= */
.groups-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.groups-count-pill {
  font-size: 0.78rem;
  font-weight: 700;
  color: #94a3b8;
}

.groups-display-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.2rem;
}

.team-showcase-card {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.4rem;
  border-radius: 24px;
  background: rgba(22, 19, 32, 0.7);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.team-showcase-card:hover {
  transform: translateY(-2px);
  border-color: rgba(249, 115, 22, 0.35);
}

.team-top-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.team-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.team-symbol {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.35);
  font-size: 1.2rem;
}

.team-names {
  display: flex;
  flex-direction: column;
}

.team-names strong {
  font-size: 1.05rem;
  font-weight: 800;
  color: #ffffff;
}

.team-names span {
  font-size: 0.78rem;
  color: #94a3b8;
}

.team-streak-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 99px;
  background: rgba(249, 115, 22, 0.14);
  border: 1px solid rgba(249, 115, 22, 0.3);
  font-size: 0.85rem;
  color: #ffba88;
}

.team-roster-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.roster-cluster {
  display: flex;
  align-items: center;
}

.roster-cluster > * {
  margin-right: -8px;
}

.roster-status-note {
  font-size: 0.82rem;
  font-weight: 700;
  color: #94a3b8;
}

.team-enter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.85rem;
  border-radius: 16px;
  font-size: 0.92rem;
  font-weight: 800;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-decoration: none;
  transition: background 0.15s ease, transform 0.15s ease;
}

.team-enter-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.create-group-ghost-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.8rem;
  border-radius: 24px;
  background: rgba(22, 19, 32, 0.35);
  border: 1.5px dashed rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.create-group-ghost-card:hover {
  border-color: rgba(249, 115, 22, 0.4);
  background: rgba(249, 115, 22, 0.04);
  transform: translateY(-2px);
  color: #f1f5f9;
}

.ghost-plus-circle {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f97316;
}

.create-group-ghost-card strong {
  font-size: 0.95rem;
  font-weight: 800;
}

.create-group-ghost-card span {
  font-size: 0.78rem;
  color: #64748b;
  text-align: center;
}

/* ================================================= */
/* 7. ACTIVIDAD GENERAL (SIMPLE Y LIMPIO)            */
/* ================================================= */
.general-activity-section {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.general-activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.activity-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1.15rem;
  border-radius: 16px;
  background: rgba(22, 19, 32, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.activity-icon-badge {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.activity-row-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.activity-main-text {
  margin: 0;
  font-size: 0.88rem;
  color: #e2e8f0;
}

.activity-note-sub {
  font-size: 0.78rem;
  color: #ffba88;
  font-style: italic;
  margin-top: 1px;
}

.activity-time-pill {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .inicio-page {
    padding: 1.2rem 1rem 2rem;
  }
  .gamified-hero-header {
    flex-direction: column;
    align-items: stretch;
  }
  .flame-master-row {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  .streak-badge-row,
  .streak-counter-box {
    justify-content: center;
  }
  .reminder-item-card {
    flex-direction: column;
    align-items: stretch;
  }
  .bars-track-row {
    height: 120px;
  }
}
</style>
