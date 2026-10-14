<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { logout } from '@/services/authService'

interface MemberHabit {
  id: string
  name: string
  avatar: string
  avatarImg?: string
  habit: string
  icon: string
  progress: string
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

interface GroupData {
  id: string
  name: string
  inviteCode: string
  icon: string
  streak: number
  health: number
  category: string
  members: MemberHabit[]
  chatMessages: ChatMessage[]
  systemAlert: string
}

const router = useRouter()
const sessionStore = useSessionStore()

// 1. Navegación lateral izquierda (al iniciar sesión se muestra primero el Dashboard General)
const activeNav = ref<'dashboard' | 'groups' | 'calendar' | 'stats' | 'settings'>('dashboard')

// 2. Control del Chat (Abrir y Cerrar con animación). Empieza cerrado: se abre dentro de un grupo.
const isChatOpen = ref(false)

function toggleChat() {
  isChatOpen.value = !isChatOpen.value
}

function goToDashboard() {
  activeNav.value = 'dashboard'
  isChatOpen.value = false
}

// Iniciales del usuario para la "foto de perfil" (avatar circular)
const userInitials = computed(() => {
  const name = sessionStore.currentUser?.name || 'Valeria'
  return name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
})

// 3. Grupos detallados según lo que pidió Valeria:
const groups = ref<GroupData[]>([
  {
    id: 'pow',
    name: 'EQUIPO POW',
    inviteCode: 'POW-2026',
    icon: '🚀',
    streak: 18,
    health: 95,
    category: 'Ingeniería Web',
    members: [
      {
        id: 'carlos',
        name: 'Carlos',
        avatar: '👨‍💻',
        habit: 'Backend & Postgres',
        icon: '💻',
        progress: '18/18 días',
        streak: 18,
        completed: true,
      },
      {
        id: 'valeria',
        name: 'Valeria',
        avatar: '👑',
        habit: 'Frontend & Integración',
        icon: '🎨',
        progress: '17/18 días',
        streak: 17,
        completed: false, // ¡Interactivo para que Valeria le dé clic!
      },
    ],
    chatMessages: [
      {
        id: 'c1',
        sender: 'Carlos',
        avatar: '👨‍💻',
        text: '¡Valeria! Ya dejé el backend con migraciones y autenticación listo 🚀',
        time: '11:15',
      },
      {
        id: 'c2',
        sender: 'Valeria',
        avatar: '👑',
        text: '¡Quedó súper lindo! Estoy montando la interfaz del grupo con el chat y check-in ✨',
        time: '11:20',
        isSelf: true,
      },
      {
        id: 'c3',
        sender: 'Carlos',
        avatar: '👨‍💻',
        text: 'De una, acuérdate de marcar el check-in antes de medianoche para no romper la racha 🔥',
        time: '11:32',
      },
    ],
    systemAlert: '⚠️ RECORDATORIO: Valeria tiene 1 hábito pendiente hoy. ¡A por la racha perfecta!',
  },
  {
    id: 'imparables',
    name: 'Los Imparables',
    inviteCode: 'IMPARABLES-1',
    icon: '🔥',
    streak: 42,
    health: 85,
    category: 'Fitness & Hábitos',
    members: [
      {
        id: 'juan',
        name: 'Juan',
        avatar: '🏋️‍♂️',
        habit: 'Ir al Gym',
        icon: '💪',
        progress: '15/15 días',
        streak: 15,
        completed: true,
      },
      {
        id: 'camilo',
        name: 'Camilo',
        avatar: '📚',
        habit: 'Leer 30 mins',
        icon: '📖',
        progress: '14/15 días',
        streak: 14,
        completed: true,
      },
      {
        id: 'dylan',
        name: 'Dylan',
        avatar: '🎧',
        habit: 'Aprender Inglés',
        icon: '🗣️',
        progress: '12/15 días',
        streak: 12,
        completed: false,
      },
    ],
    chatMessages: [
      {
        id: 'i1',
        sender: 'Juan',
        avatar: '🏋️‍♂️',
        text: '¡Gimnasio liquidado a las 6:00 AM! 💪🔥',
        time: '07:30',
      },
      {
        id: 'i2',
        sender: 'Camilo',
        avatar: '📚',
        text: 'Terminé 25 páginas de Hábitos Atómicos, ¡ánimo Dylan!',
        time: '09:45',
      },
      {
        id: 'i3',
        sender: 'Dylan',
        avatar: '🎧',
        text: 'En eso estoy, haciendo mi sesión de escucha de Duolingo 🇬🇧',
        time: '10:10',
      },
    ],
    systemAlert: '⚠️ ALERTA: Dylan tiene pendiente su meta. Tiempo límite: 23:59.',
  },
])

const defaultGroup: GroupData = {
  id: 'empty',
  name: 'Sin grupo',
  inviteCode: 'N/A',
  icon: '📁',
  streak: 0,
  health: 100,
  category: 'General',
  members: [],
  chatMessages: [],
  systemAlert: '',
}

const activeGroupId = ref('pow')

const activeGroup = computed<GroupData>(() => {
  return groups.value.find((g) => g.id === activeGroupId.value) ?? groups.value[0] ?? defaultGroup
})

function selectGroup(id: string) {
  activeGroupId.value = id
  activeNav.value = 'groups'
}

// 4. Marcar hábito de forma interactiva
function toggleHabit(memberId: string) {
  const member = activeGroup.value.members.find((m) => m.id === memberId)
  if (member) {
    member.completed = !member.completed
    if (member.completed) {
      activeGroup.value.health = Math.min(100, activeGroup.value.health + 5)
    } else {
      activeGroup.value.health = Math.max(0, activeGroup.value.health - 5)
    }
  }
}

// 5. Reloj de medianoche dinámico
const countdown = ref('00h 00m 00s')
let interval: number | undefined

function updateClock() {
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(23, 59, 59, 999)

  const diff = midnight.getTime() - now.getTime()
  if (diff <= 0) {
    countdown.value = '¡Medianoche!'
    return
  }
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((diff % (1000 * 60)) / 1000)
  countdown.value = `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

onMounted(() => {
  updateClock()
  interval = window.setInterval(updateClock, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

// 6. Enviar mensajes al chat del grupo activo
const chatInput = ref('')

function handleSendMessage() {
  if (!chatInput.value.trim()) return

  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

  activeGroup.value.chatMessages.push({
    id: String(Date.now()),
    sender: sessionStore.currentUser?.name || 'Valeria',
    avatar: '👑',
    text: chatInput.value.trim(),
    time,
    isSelf: true,
  })

  chatInput.value = ''
}

// 7. Modales de Crear Grupo y Hábito
const showCreateGroupModal = ref(false)
const newGroupName = ref('')
const newGroupCategory = ref('')

function handleCreateGroup() {
  if (!newGroupName.value.trim()) return
  const id = `grp-${Date.now()}`
  const code = `${newGroupName.value.slice(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`

  groups.value.push({
    id,
    name: newGroupName.value.trim(),
    inviteCode: code,
    icon: '🎯',
    streak: 1,
    health: 100,
    category: newGroupCategory.value || 'General',
    members: [
      {
        id: 'me',
        name: sessionStore.currentUser?.name || 'Valeria',
        avatar: '👑',
        habit: 'Mi primera meta',
        icon: '⭐',
        progress: '0/1 días',
        streak: 1,
        completed: false,
      },
    ],
    chatMessages: [
      {
        id: 'init',
        sender: 'Sistema',
        avatar: '🤖',
        text: `¡Bienvenidos al grupo ${newGroupName.value.trim()}! Creado con éxito.`,
        time: 'Ahora',
      },
    ],
    systemAlert: '¡Grupo recién creado! Invita a tus amigos con el código.',
  })

  activeGroupId.value = id
  newGroupName.value = ''
  newGroupCategory.value = ''
  showCreateGroupModal.value = false
}

// Cerrar sesión
async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <!-- ============================================== -->
    <!-- 1. BARRA LATERAL IZQUIERDA (Menú + Grupos) -->
    <!-- ============================================== -->
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-badge">💜</div>
        <div class="brand-text">
          <h2>Monitor de Hábitos</h2>
          <span class="brand-sub">Group Accountability</span>
        </div>
      </div>

      <!-- Menú principal -->
      <nav class="nav-menu">
        <button
          class="nav-link"
          :class="{ active: activeNav === 'dashboard' }"
          @click="goToDashboard"
        >
          <span class="icon">📊</span>
          <span>Dashboard General</span>
        </button>
        <button
          class="nav-link"
          :class="{ active: activeNav === 'groups' }"
          @click="activeNav = 'groups'"
        >
          <span class="icon">👥</span>
          <span>Mis Grupos</span>
        </button>
        <button
          class="nav-link"
          :class="{ active: activeNav === 'calendar' }"
          @click="activeNav = 'calendar'"
        >
          <span class="icon">📅</span>
          <span>Calendario</span>
        </button>
        <button
          class="nav-link"
          :class="{ active: activeNav === 'stats' }"
          @click="activeNav = 'stats'"
        >
          <span class="icon">📈</span>
          <span>Estadísticas</span>
        </button>
        <button
          class="nav-link"
          :class="{ active: activeNav === 'settings' }"
          @click="activeNav = 'settings'"
        >
          <span class="icon">⚙️</span>
          <span>Configuración</span>
        </button>
      </nav>

      <!-- Sección Mis Grupos con botón llamativo -->
      <div class="groups-section">
        <div class="groups-title-row">
          <span class="section-label">Tus Equipos</span>
          <button class="add-mini-btn" title="Crear Grupo" @click="showCreateGroupModal = true">
            +
          </button>
        </div>

        <div class="groups-list">
          <button
            v-for="grp in groups"
            :key="grp.id"
            class="group-card-tab"
            :class="{ active: grp.id === activeGroup.id && activeNav === 'groups' }"
            @click="selectGroup(grp.id)"
          >
            <span class="group-tab-icon">{{ grp.icon }}</span>
            <div class="group-tab-details">
              <span class="group-tab-name">{{ grp.name }}</span>
              <span class="group-tab-streak">🔥 {{ grp.streak }} días</span>
            </div>
            <span class="code-badge">{{ grp.inviteCode }}</span>
          </button>
        </div>

        <button class="create-group-btn" @click="showCreateGroupModal = true">
          ✨ + Crear Nuevo Grupo
        </button>
      </div>

      <!-- Footer lateral: Perfil de usuario y Logout -->
      <div class="sidebar-footer">
        <div class="user-profile-chip">
          <span class="user-avatar-circle">👑</span>
          <div class="user-profile-info">
            <span class="user-name">{{ sessionStore.currentUser?.name || 'Valeria' }}</span>
            <span class="user-role">Estudiante Full-Stack</span>
          </div>
        </div>
        <button class="logout-icon-btn" title="Cerrar Sesión" @click="handleLogout">
          🚪
        </button>
      </div>
    </aside>

    <!-- ============================================== -->
    <!-- 2. ÁREA CENTRAL (DASHBOARD O VISTA DE GRUPO) -->
    <!-- ============================================== -->
    <main class="main-content">
      <!-- HEADER SUPERIOR -->
      <header class="top-bar">
        <div class="top-bar-left">
          <span class="breadcrumb">Hábitos / {{ activeNav === 'dashboard' ? 'Dashboard General' : activeGroup.name }}</span>
        </div>
        <div class="top-bar-right">
          <!-- Botón para alternar el Chat -->
          <button
            v-if="activeNav !== 'dashboard'"
            class="chat-toggle-pill"
            :class="{ active: isChatOpen }"
            @click="toggleChat"
          >
            <span class="chat-icon">💬</span>
            <span>{{ isChatOpen ? 'Ocultar Chat' : 'Abrir Chat del Grupo' }}</span>
            <span class="badge-live-dot"></span>
          </button>
        </div>
      </header>

      <!-- VISTA 1: DASHBOARD GENERAL (Resumen y Gráficos) -->
      <section v-if="activeNav === 'dashboard'" class="dashboard-overview">
        <div class="hero-welcome">
          <div class="hero-profile">
            <div class="profile-photo">
              <span>{{ userInitials }}</span>
              <span class="online-dot"></span>
            </div>
            <div class="welcome-text">
              <h1>¡Hola de nuevo, {{ sessionStore.currentUser?.name || 'Valeria' }}! 👋</h1>
              <p>Aquí tienes el estado general de todos tus hábitos y compromisos en equipo.</p>
              <span class="profile-email">{{ sessionStore.currentUser?.email || 'valeria@pow.dev' }}</span>
            </div>
          </div>
          <div class="overall-streak-badge">
            <span class="big-fire">🔥</span>
            <div>
              <span class="streak-num">18 DÍAS</span>
              <span class="streak-label">Racha General Activa</span>
            </div>
          </div>
        </div>

        <!-- Métricas Rápidas -->
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-icon">👥</span>
            <div class="metric-data">
              <span class="metric-val">{{ groups.length }}</span>
              <span class="metric-sub">Grupos Activos</span>
            </div>
          </div>
          <div class="metric-card">
            <span class="metric-icon">🎯</span>
            <div class="metric-data">
              <span class="metric-val">94%</span>
              <span class="metric-sub">Tasa de Cumplimiento</span>
            </div>
          </div>
          <div class="metric-card">
            <span class="metric-icon">🛡️</span>
            <div class="metric-data">
              <span class="metric-val">0</span>
              <span class="metric-sub">Penalizaciones Sufridas</span>
            </div>
          </div>
        </div>

        <!-- Gráfico Semanal Visual -->
        <div class="stats-overview-card">
          <h3>Progreso de Hábitos Esta Semana</h3>
          <p class="chart-sub">Cumplimiento diario de tus metas personales</p>
          <div class="week-chart">
            <div class="day-col completed">
              <div class="bar" style="height: 90%;"></div>
              <span class="day-label">Lun</span>
            </div>
            <div class="day-col completed">
              <div class="bar" style="height: 100%;"></div>
              <span class="day-label">Mar</span>
            </div>
            <div class="day-col completed">
              <div class="bar" style="height: 85%;"></div>
              <span class="day-label">Mié</span>
            </div>
            <div class="day-col completed">
              <div class="bar" style="height: 95%;"></div>
              <span class="day-label">Jue</span>
            </div>
            <div class="day-col active-today">
              <div class="bar" style="height: 60%;"></div>
              <span class="day-label">Hoy</span>
            </div>
            <div class="day-col pending">
              <div class="bar" style="height: 15%;"></div>
              <span class="day-label">Sáb</span>
            </div>
            <div class="day-col pending">
              <div class="bar" style="height: 15%;"></div>
              <span class="day-label">Dom</span>
            </div>
          </div>
        </div>

        <!-- Accesos rápidos a los grupos -->
        <div class="quick-groups">
          <h3>Tus Grupos</h3>
          <div class="quick-grid">
            <div
              v-for="grp in groups"
              :key="grp.id"
              class="quick-group-box"
              @click="selectGroup(grp.id)"
            >
              <div class="quick-group-top">
                <span class="grp-icon-big">{{ grp.icon }}</span>
                <span class="health-pill">{{ grp.health }}% Salud</span>
              </div>
              <h4>{{ grp.name }}</h4>
              <p>{{ grp.members.length }} integrantes activos</p>
              <span class="view-link">Entrar al grupo →</span>
            </div>
          </div>
        </div>
      </section>

      <!-- VISTA 2: VISTA DETALLADA DEL GRUPO (Como el Mockup de la imagen) -->
      <section v-else class="group-detail-view">
        <div class="group-header-banner">
          <div>
            <h1>{{ activeGroup.name }}</h1>
            <span class="group-category-pill">{{ activeGroup.category }}</span>
            <span class="invite-code-pill">Código: <strong>{{ activeGroup.inviteCode }}</strong></span>
          </div>
        </div>

        <!-- Marcador Racha y Barra de Salud -->
        <div class="scoreboard-hero">
          <div class="streak-column">
            <span class="card-caption">Racha de Equipo: {{ activeGroup.streak }} Días</span>
            <div class="streak-fire-row">
              <span class="fire-icon">🔥</span>
              <span class="streak-number">{{ activeGroup.streak }}</span>
            </div>
          </div>

          <div class="health-column">
            <div class="health-title-row">
              <span class="card-caption">Salud del Grupo</span>
              <span class="health-numeric">{{ activeGroup.health }} / 100</span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${activeGroup.health}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Tarjetas de Miembros y Hábitos Diarios -->
        <div class="habits-container">
          <div class="habits-header">
            <h2>Dynamic Daily Check-In</h2>
            <span class="today-chip">Hoy</span>
          </div>

          <div class="habits-cards-grid">
            <div
              v-for="member in activeGroup.members"
              :key="member.id"
              class="member-habit-card"
              :class="{ completed: member.completed }"
            >
              <div class="card-user-row">
                <div class="user-identity">
                  <span class="user-emoji">{{ member.avatar }}</span>
                  <span class="user-display-name">{{ member.name }}</span>
                </div>
                <span v-if="member.completed" class="check-badge-done">✔</span>
              </div>

              <div class="habit-content-row">
                <span class="habit-text">{{ member.habit }}</span>
                <span class="habit-emoji-icon">{{ member.icon }}</span>
              </div>

              <div class="habit-stats-row">
                <span class="days-text">{{ member.progress }}</span>
                <span class="streak-text">🔥 {{ member.streak }}</span>
              </div>

              <!-- BOTÓN DE CHECK-IN INTERACTIVO -->
              <button
                class="check-action-btn"
                :class="{ 'is-completed': member.completed, 'is-pending': !member.completed }"
                @click="toggleHabit(member.id)"
              >
                {{ member.completed ? '✔ Completado' : '⏳ Marcar Cumplido' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Cuenta Regresiva de Medianoche (Cron Job) -->
        <div class="midnight-timer-box">
          <span class="timer-title">Tiempo para Medianoche</span>
          <div class="timer-digits">{{ countdown }}</div>
          <p class="timer-warning">
            ⏰ El cron job de verificación se ejecuta a las 00:00:00. Las penalizaciones colectivas se aplicarán si algún integrante no cumple.
          </p>
        </div>
      </section>
    </main>

    <!-- ============================================== -->
    <!-- 3. BARRA LATERAL DERECHA (Chat Desplegable) -->
    <!-- ============================================== -->
    <transition name="slide-chat">
      <aside v-if="isChatOpen && activeNav !== 'dashboard'" class="chat-drawer">
        <div class="chat-top">
          <div class="chat-title-box">
            <h3>Chat de {{ activeGroup.name }}</h3>
            <span class="live-dot-tag">🟢 En Vivo</span>
          </div>
          <button class="close-chat-btn" title="Cerrar Chat" @click="isChatOpen = false">
            ✕
          </button>
        </div>

        <!-- Alerta de Sistema Destacada -->
        <div class="system-alert-card">
          <div class="alert-badge">⚠️ ALERTA DE SISTEMA</div>
          <p>{{ activeGroup.systemAlert }}</p>
        </div>

        <!-- Lista de Mensajes -->
        <div class="chat-scroll-area">
          <div
            v-for="msg in activeGroup.chatMessages"
            :key="msg.id"
            class="chat-bubble"
            :class="{ 'self-message': msg.isSelf }"
          >
            <span class="avatar-icon">{{ msg.avatar }}</span>
            <div class="bubble-content">
              <div class="bubble-header">
                <span class="name">{{ msg.sender }}</span>
                <span class="time">{{ msg.time }}</span>
              </div>
              <p class="text">{{ msg.text }}</p>
            </div>
          </div>
        </div>

        <!-- Barra inferior para enviar -->
        <form class="chat-input-container" @submit.prevent="handleSendMessage">
          <input
            v-model="chatInput"
            type="text"
            placeholder="Envía un mensaje al equipo..."
          />
          <button type="submit" class="send-message-btn" :disabled="!chatInput.trim()">
            ➤
          </button>
        </form>
      </aside>
    </transition>

    <!-- MODAL CREAR GRUPO -->
    <div v-if="showCreateGroupModal" class="modal-overlay">
      <div class="modal-window">
        <h3>✨ Crear Nuevo Grupo de Hábitos</h3>
        <p>Arma un nuevo equipo de compromiso con tus amigos.</p>
        <div class="form-field">
          <label>Nombre del Grupo</label>
          <input v-model="newGroupName" type="text" placeholder="Ej: Hackers POW" />
        </div>
        <div class="form-field">
          <label>Categoría</label>
          <input v-model="newGroupCategory" type="text" placeholder="Ej: Programación, Fitness, Lectura" />
        </div>
        <div class="modal-footer-btns">
          <button class="btn-cancel" @click="showCreateGroupModal = false">Cancelar</button>
          <button class="btn-create" @click="handleCreateGroup">Crear Grupo</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ================================================= */
/* PALETA OSCURA MODERNA (Inspirada en el Mockup)     */
/* ================================================= */
.app-shell {
  display: flex;
  min-height: 100vh;
  background-color: #0c0a17;
  color: #f1f0f7;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
}

/* 1. SIDEBAR IZQUIERDA */
.sidebar {
  width: 270px;
  background-color: #131122;
  border-right: 1px solid #231f38;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #1f1b34;
}

.brand-badge {
  font-size: 1.6rem;
  background: #241d40;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text h2 {
  font-size: 1.05rem;
  font-weight: 800;
  color: #f5f3ff;
  margin: 0;
}

.brand-sub {
  font-size: 0.75rem;
  color: #8b85b5;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 1.25rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #8b85b5;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #1a172e;
  color: #e9e6fb;
}

.nav-link.active {
  background: #231d42;
  border-color: #55449e;
  color: #c4b5fd;
}

.groups-section {
  margin-top: 1.75rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.groups-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #6d6794;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-mini-btn {
  background: #201a3a;
  border: 1px solid #362c61;
  color: #c4b5fd;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-mini-btn:hover {
  background: #8b5cf6;
  color: #fff;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.group-card-tab {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: #9490b8;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.group-card-tab:hover {
  background: #1a172e;
  color: #fff;
}

.group-card-tab.active {
  background: #201a3a;
  border-color: #4b3d87;
  color: #fff;
}

.group-tab-icon {
  font-size: 1.2rem;
}

.group-tab-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.group-tab-name {
  font-weight: 700;
  font-size: 0.88rem;
}

.group-tab-streak {
  font-size: 0.72rem;
  color: #fb923c;
}

.code-badge {
  font-size: 0.68rem;
  background: #151126;
  color: #7b75a6;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.create-group-btn {
  margin-top: 1rem;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #fff;
  border: none;
  padding: 0.75rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.2s;
}

.create-group-btn:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #1f1b34;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-profile-chip {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-avatar-circle {
  font-size: 1.2rem;
  background: #251d45;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-profile-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: #f5f3ff;
}

.user-role {
  font-size: 0.7rem;
  color: #8b85b5;
}

.logout-icon-btn {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 6px;
}

.logout-icon-btn:hover {
  background: #281d36;
}

/* 2. ÁREA CENTRAL */
.main-content {
  flex: 1;
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breadcrumb {
  font-size: 0.88rem;
  color: #7b75a6;
  font-weight: 600;
}

.chat-toggle-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #1a172e;
  border: 1px solid #322a57;
  color: #c4b5fd;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-toggle-pill.active {
  background: #2a2052;
  border-color: #7c3aed;
  color: #fff;
}

.badge-live-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
}

/* VISTA DE GRUPO */
.group-header-banner h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0 0 0.5rem;
  color: #f5f3ff;
}

.group-category-pill {
  background: #1c1836;
  color: #a78bfa;
  border: 1px solid #3c326b;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  margin-right: 0.5rem;
}

.invite-code-pill {
  font-size: 0.8rem;
  color: #9490b8;
}

/* MARCADOR RACHA Y SALUD */
.scoreboard-hero {
  background: #141124;
  border: 1px solid #282147;
  border-radius: 18px;
  padding: 1.5rem 2rem;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 2rem;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.card-caption {
  font-size: 0.82rem;
  font-weight: 700;
  color: #8b85b5;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.streak-fire-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.3rem;
}

.fire-icon {
  font-size: 2rem;
}

.streak-number {
  font-size: 2.6rem;
  font-weight: 900;
  color: #fb923c;
}

.health-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-numeric {
  font-size: 1.25rem;
  font-weight: 900;
  color: #34d399;
}

.progress-track {
  width: 100%;
  height: 20px;
  background: #1f1b34;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid #342d59;
  margin-top: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #34d399 70%, #f59e0b 100%);
  border-radius: 999px;
  transition: width 0.4s ease;
}

/* TARJETAS DE HÁBITOS */
.habits-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.habits-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.habits-header h2 {
  font-size: 1.35rem;
  font-weight: 800;
  color: #ede9fe;
  margin: 0;
}

.today-chip {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
  color: #34d399;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
}

.habits-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}

.member-habit-card {
  background: #141124;
  border: 1px solid #282147;
  border-radius: 16px;
  padding: 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: all 0.2s;
}

.member-habit-card:hover {
  transform: translateY(-2px);
  border-color: #4b3d87;
}

.member-habit-card.completed {
  border-color: #059669;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
}

.card-user-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-identity {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.user-emoji {
  font-size: 1.2rem;
}

.user-display-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #f5f3ff;
}

.check-badge-done {
  color: #10b981;
  background: rgba(16, 185, 129, 0.2);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 800;
}

.habit-content-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.habit-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.habit-emoji-icon {
  font-size: 1.5rem;
}

.habit-stats-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: #8b85b5;
}

.streak-text {
  color: #fb923c;
  font-weight: 700;
}

.check-action-btn {
  width: 100%;
  padding: 0.75rem;
  border-radius: 10px;
  font-weight: 800;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.is-completed {
  background: #10b981;
  color: #022c22;
}

.is-completed:hover {
  background: #059669;
  color: #fff;
}

.is-pending {
  background: #251d45;
  color: #e0dcf8;
}

.is-pending:hover {
  background: #10b981;
  color: #022c22;
}

/* RELOJ MEDIANOCHE */
.midnight-timer-box {
  background: #110e20;
  border: 1px dashed #3c326b;
  border-radius: 16px;
  padding: 1.75rem;
  text-align: center;
  margin-top: 1rem;
}

.timer-title {
  font-size: 0.82rem;
  color: #8b85b5;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
}

.timer-digits {
  font-size: 2.6rem;
  font-weight: 900;
  color: #a78bfa;
  font-family: monospace;
  margin: 0.5rem 0;
}

.timer-warning {
  font-size: 0.85rem;
  color: #7b75a6;
  margin: 0;
  max-width: 600px;
  margin: 0 auto;
}

/* 3. BARRA LATERAL DERECHA (Chat) */
.chat-drawer {
  width: 360px;
  background-color: #131122;
  border-left: 1px solid #231f38;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  flex-shrink: 0;
}

.chat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid #1f1b34;
}

.chat-title-box h3 {
  font-size: 1rem;
  font-weight: 800;
  margin: 0;
  color: #f5f3ff;
}

.live-dot-tag {
  font-size: 0.72rem;
  color: #10b981;
  font-weight: 700;
}

.close-chat-btn {
  background: transparent;
  border: none;
  color: #6d6794;
  font-size: 1.1rem;
  cursor: pointer;
}

.close-chat-btn:hover {
  color: #fff;
}

.system-alert-card {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 12px;
  padding: 0.85rem;
  margin: 1rem 0;
}

.alert-badge {
  font-size: 0.7rem;
  font-weight: 800;
  color: #fbbf24;
  letter-spacing: 0.5px;
}

.system-alert-card p {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: #fde68a;
  line-height: 1.35;
}

.chat-scroll-area {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-right: 0.35rem;
  max-height: calc(100vh - 280px);
}

.chat-bubble {
  display: flex;
  gap: 0.65rem;
  background: #19162e;
  border: 1px solid #262045;
  border-radius: 14px;
  padding: 0.75rem 0.9rem;
}

.chat-bubble.self-message {
  background: #251d45;
  border-color: #4b3d87;
}

.avatar-icon {
  font-size: 1.3rem;
}

.bubble-content {
  flex: 1;
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.bubble-header .name {
  font-size: 0.82rem;
  font-weight: 700;
  color: #c4b5fd;
}

.bubble-header .time {
  font-size: 0.7rem;
  color: #6d6794;
}

.bubble-content .text {
  margin: 0.3rem 0 0;
  font-size: 0.86rem;
  color: #e5e3f5;
  line-height: 1.35;
}

.chat-input-container {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid #1f1b34;
}

.chat-input-container input {
  flex: 1;
  background: #0c0a17;
  border: 1px solid #2e2654;
  color: #fff;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  font-size: 0.88rem;
  outline: none;
}

.chat-input-container input:focus {
  border-color: #8b5cf6;
}

.send-message-btn {
  background: #8b5cf6;
  color: #fff;
  border: none;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
}

.send-message-btn:hover:not(:disabled) {
  background: #7c3aed;
}

.send-message-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* VISTA DASHBOARD GENERAL (Gráficos) */
.hero-welcome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #1d163d 0%, #131122 100%);
  border: 1px solid #3c2f70;
  border-radius: 20px;
  padding: 2rem;
}

.welcome-text h1 {
  font-size: 1.85rem;
  font-weight: 900;
  margin: 0 0 0.35rem;
  color: #f5f3ff;
}

.welcome-text p {
  color: #9490b8;
  margin: 0;
}

.overall-streak-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #251d45;
  border: 1px solid #55449e;
  padding: 0.85rem 1.35rem;
  border-radius: 16px;
}

.big-fire {
  font-size: 2.2rem;
}

.streak-num {
  display: block;
  font-size: 1.4rem;
  font-weight: 900;
  color: #fb923c;
}

.streak-label {
  font-size: 0.72rem;
  color: #c4b5fd;
  text-transform: uppercase;
  font-weight: 700;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.metric-card {
  background: #141124;
  border: 1px solid #282147;
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.metric-icon {
  font-size: 1.8rem;
  background: #1f1a3a;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-val {
  display: block;
  font-size: 1.7rem;
  font-weight: 900;
  color: #fff;
}

.metric-sub {
  font-size: 0.8rem;
  color: #8b85b5;
}

.stats-overview-card {
  background: #141124;
  border: 1px solid #282147;
  border-radius: 18px;
  padding: 1.75rem;
}

.stats-overview-card h3 {
  margin: 0;
  font-size: 1.15rem;
}

.chart-sub {
  color: #7b75a6;
  font-size: 0.82rem;
  margin: 0.2rem 0 1.5rem;
}

.week-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 140px;
  padding-top: 1rem;
  border-bottom: 1px solid #282147;
}

.day-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  height: 100%;
  justify-content: flex-end;
}

.bar {
  width: 32px;
  border-radius: 8px 8px 0 0;
  transition: height 0.4s;
}

.day-col.completed .bar {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
}

.day-col.active-today .bar {
  background: linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%);
}

.day-col.pending .bar {
  background: #251f3d;
}

.day-label {
  font-size: 0.8rem;
  color: #8b85b5;
  font-weight: 600;
}

.quick-groups h3 {
  margin: 1.5rem 0 1rem;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

.quick-group-box {
  background: #141124;
  border: 1px solid #282147;
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-group-box:hover {
  transform: translateY(-2px);
  border-color: #55449e;
}

.quick-group-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grp-icon-big {
  font-size: 1.6rem;
}

.health-pill {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.quick-group-box h4 {
  margin: 0.85rem 0 0.25rem;
  font-size: 1.1rem;
  color: #fff;
}

.quick-group-box p {
  margin: 0 0 1rem;
  font-size: 0.82rem;
  color: #8b85b5;
}

.view-link {
  font-size: 0.85rem;
  font-weight: 700;
  color: #c4b5fd;
}

/* MODALES */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-window {
  background: #161229;
  border: 1px solid #3c326b;
  border-radius: 20px;
  padding: 2rem;
  width: 90%;
  max-width: 440px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.modal-window h3 {
  margin: 0 0 0.4rem;
  color: #f5f3ff;
}

.modal-window p {
  color: #8b85b5;
  font-size: 0.88rem;
  margin-bottom: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.form-field label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #c4b5fd;
}

.form-field input {
  background: #0c0a17;
  border: 1px solid #322a57;
  color: #fff;
  padding: 0.75rem;
  border-radius: 10px;
  outline: none;
}

.form-field input:focus {
  border-color: #8b5cf6;
}

.modal-footer-btns {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-cancel {
  background: transparent;
  color: #8b85b5;
  border: 1px solid #322a57;
  padding: 0.65rem 1.1rem;
  border-radius: 10px;
  cursor: pointer;
}

.btn-create {
  background: #10b981;
  color: #022c22;
  font-weight: 800;
  border: none;
  padding: 0.65rem 1.35rem;
  border-radius: 10px;
  cursor: pointer;
}

/* ================================================= */
/* FOTO DE PERFIL EN EL DASHBOARD                     */
/* ================================================= */
.hero-profile {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.profile-photo {
  position: relative;
  flex-shrink: 0;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.8rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  box-shadow: 0 0 0 4px #131122, 0 0 0 6px #8b5cf6, 0 10px 30px rgba(139, 92, 246, 0.45);
}

.online-dot {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #10b981;
  border: 3px solid #131122;
}

.profile-email {
  display: inline-block;
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.12);
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}
</style>
