<script setup lang="ts">
/**
 * PÁGINA PRINCIPAL / LANDING PAGE
 * Presentación explicativa en slides interactivos sobre el funcionamiento del sistema.
 * Si el usuario ya inició sesión, detecta su cuenta y le permite "Volver al Panel Principal".
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon, { type IconName } from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { logout } from '@/services/authService'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()

interface Slide {
  badge: string
  title: string
  description: string
  icon: IconName
  highlight: string
  color: string
}

const slides: Slide[] = [
  {
    badge: 'Paso 1 · Creación de Equipos',
    title: 'Crea tu equipo con metas compartidas',
    description:
      'Arma tu grupo de compromiso e invita a tus amigos o compañeros con un código único (ej: POW-2026). Cada integrante define su hábito diario específico.',
    icon: 'users',
    highlight: 'Código de invitación único · Roles y miembros activos',
    color: '#8b5cf6',
  },
  {
    badge: 'Paso 2 · Dynamic Daily Check-In',
    title: 'Marca tu hábito diario con un solo clic',
    description:
      'Registra tu cumplimiento en tiempo real. Mira las tarjetas interactivas de tus compañeros, las rachas individuales de fuego 🔥 y cómo tu esfuerzo sube la salud del equipo.',
    icon: 'target',
    highlight: 'Check-in reactivo · Borde neón · Rachas de constancia',
    color: '#22c55e',
  },
  {
    badge: 'Paso 3 · Regla de Medianoche',
    title: 'Cierre automático diario a las 00:00:00',
    description:
      'Cada medianoche se ejecuta un proceso automático (Cron Job). Si algún integrante no cumplió su meta antes de las 12:00 AM, todo el equipo sufre una penalización en su barra de salud.',
    icon: 'clock',
    highlight: 'Detección de deserción · Penalización colectiva · Transacciones ACID',
    color: '#f59e0b',
  },
  {
    badge: 'Paso 4 · Chat y Alertas en Vivo',
    title: 'Chat integrado y alertas automáticas',
    description:
      'Comunícate con tu equipo sin salir de la app. El sistema envía alertas destacadas avisando quién tiene pendiente su meta para que todos cumplan a tiempo.',
    icon: 'message',
    highlight: 'Presencia en vivo · Avisos automáticos de riesgo de racha',
    color: '#38bdf8',
  },
]

const currentSlide = ref(0)
let autoplayInterval: number | undefined

function nextSlide(): void {
  currentSlide.value = (currentSlide.value + 1) % slides.length
}

function prevSlide(): void {
  currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length
}

function goToSlide(index: number): void {
  currentSlide.value = index
}

onMounted(() => {
  autoplayInterval = window.setInterval(nextSlide, 7000)
})

onUnmounted(() => {
  if (autoplayInterval !== undefined) clearInterval(autoplayInterval)
})

const userName = computed(() => session.currentUser?.name || 'Valeria')
const userEmail = computed(() => session.currentUser?.email || '')

async function handleLogout(): Promise<void> {
  await logout()
}
</script>

<template>
  <div class="landing-page">
    <!-- Navbar superior moderna -->
    <header class="landing-navbar">
      <div class="nav-brand">
        <span class="brand-badge">
          <AppIcon name="check" :size="18" :stroke-width="3" />
        </span>
        <div class="brand-text">
          <strong>Monitor de Hábitos</strong>
          <small>Group Accountability</small>
        </div>
      </div>

      <div class="nav-actions">
        <!-- Si el usuario YA inició sesión: muestra su perfil y botón para volver -->
        <template v-if="session.isAuthenticated">
          <div class="user-chip">
            <UserAvatar :name="userName" :size="30" online />
            <span class="user-name">{{ userName }}</span>
          </div>
          <RouterLink to="/app/inicio" class="btn btn-primary">
            <span>Volver al Panel Principal</span>
            <AppIcon name="arrow-right" :size="15" />
          </RouterLink>
          <button type="button" class="btn btn-ghost" title="Cerrar sesión" @click="handleLogout">
            <AppIcon name="logout" :size="16" />
          </button>
        </template>

        <!-- Si NO hay sesión iniciada: botones de Ingresar / Registro -->
        <template v-else>
          <RouterLink to="/login" class="btn btn-ghost">Iniciar Sesión</RouterLink>
          <RouterLink to="/login" class="btn btn-primary">
            <span>Registrarse gratis</span>
            <AppIcon name="arrow-right" :size="15" />
          </RouterLink>
        </template>
      </div>
    </header>

    <!-- Contenido Principal: Hero + Carrusel Explicativo -->
    <main class="landing-main">
      <div class="hero-intro">
        <span class="hero-pill">
          <AppIcon name="flame" :size="14" />
          Constancia Grupal & Detección de Deserción
        </span>
        <h1>Cómo funciona el Monitor de Hábitos</h1>
        <p class="hero-sub">
          Diseñado para que ningún miembro de tu equipo abandone. Un sistema donde la constancia individual protege el éxito de todos.
        </p>
      </div>

      <!-- Carrusel / Slides Explicativos -->
      <section class="slides-card panel">
        <div class="slide-content-grid">
          <!-- Información del Slide Actual -->
          <div class="slide-text-col">
            <span class="slide-step-badge" :style="{ color: slides[currentSlide]?.color }">
              {{ slides[currentSlide]?.badge }}
            </span>

            <h2>{{ slides[currentSlide]?.title }}</h2>

            <p class="slide-desc">
              {{ slides[currentSlide]?.description }}
            </p>

            <div class="slide-highlight-box">
              <AppIcon name="shield" :size="16" />
              <span>{{ slides[currentSlide]?.highlight }}</span>
            </div>
          </div>

          <!-- Gráfico visual del Slide -->
          <div class="slide-visual-col">
            <div
              class="visual-card-preview"
              :style="{ borderColor: slides[currentSlide]?.color }"
            >
              <div class="preview-glow" :style="{ background: slides[currentSlide]?.color }"></div>
              <div class="preview-icon" :style="{ background: slides[currentSlide]?.color }">
                <AppIcon :name="slides[currentSlide]?.icon ?? 'target'" :size="38" />
              </div>

              <!-- Vista previa simulada según el slide -->
              <div v-if="currentSlide === 0" class="mini-mockup-team">
                <div class="team-header">
                  <strong>EQUIPO POW</strong>
                  <span class="code-tag">POW-2026</span>
                </div>
                <div class="member-pills">
                  <span>👨‍💻 Carlos · Admin</span>
                  <span>👑 Valeria · Miembro</span>
                </div>
              </div>

              <div v-else-if="currentSlide === 1" class="mini-mockup-check">
                <div class="check-box-done">
                  <AppIcon name="check" :size="20" :stroke-width="3" />
                  <span>¡Meta cumplida hoy!</span>
                </div>
                <span class="streak-demo">🔥 6 Días de racha activa</span>
              </div>

              <div v-else-if="currentSlide === 2" class="mini-mockup-midnight">
                <span class="timer-tag">Cierre de Medianoche</span>
                <span class="clock-digits">00:00:00</span>
                <span class="penalty-tag">⚠️ Salud del grupo: 88/100</span>
              </div>

              <div v-else class="mini-mockup-chat">
                <div class="chat-bubble-demo">
                  <span class="alert-tag">⚠️ ALERTA SISTEMA</span>
                  <p>Valeria tiene 1 hábito pendiente antes de medianoche.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Controles del Carrusel (Flechas y Puntos) -->
        <div class="slides-controls">
          <button type="button" class="slide-nav-btn" @click="prevSlide" title="Slide anterior">
            <AppIcon name="chevron-left" :size="18" />
          </button>

          <div class="dots-row">
            <button
              v-for="(s, idx) in slides"
              :key="idx"
              type="button"
              class="dot-btn"
              :class="{ active: currentSlide === idx }"
              :title="s.badge"
              @click="goToSlide(idx)"
            ></button>
          </div>

          <button type="button" class="slide-nav-btn" @click="nextSlide" title="Slide siguiente">
            <AppIcon name="chevron-right" :size="18" />
          </button>
        </div>
      </section>

      <!-- SECCIÓN INFERIOR: Botón de Acción Dinámico -->
      <section class="landing-cta-box panel">
        <template v-if="session.isAuthenticated">
          <div class="cta-user-status">
            <UserAvatar :name="userName" :size="48" online ring />
            <div>
              <h3>¡Sesión activa de {{ userName }}!</h3>
              <p>Tu equipo y tus hábitos de hoy te están esperando en el panel.</p>
            </div>
          </div>
          <RouterLink to="/app/inicio" class="cta-big-btn">
            <span>Volver al Panel Principal (Dashboard)</span>
            <AppIcon name="arrow-right" :size="18" />
          </RouterLink>
        </template>

        <template v-else>
          <div class="cta-user-status">
            <div class="rocket-icon">🚀</div>
            <div>
              <h3>¿Lista para empezar a construir disciplina?</h3>
              <p>Inicia sesión o crea tu cuenta gratuita para unirte a tu equipo.</p>
            </div>
          </div>
          <div class="cta-buttons-row">
            <RouterLink to="/login" class="cta-big-btn">
              <span>Iniciar Sesión</span>
              <AppIcon name="arrow-right" :size="18" />
            </RouterLink>
          </div>
        </template>
      </section>
    </main>

    <!-- Footer Discreto -->
    <footer class="landing-footer">
      <p>Monitor de Hábitos Grupales con Detección de Deserción · Proyecto POW 2026</p>
    </footer>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(130% 130% at 50% 0%, rgba(139, 92, 246, 0.16), transparent 55%),
    radial-gradient(90% 90% at 85% 85%, rgba(34, 197, 94, 0.08), transparent 50%),
    var(--bg);
  color: var(--text);
}

/* Navbar */
.landing-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 2.5rem;
  border-bottom: 1px solid var(--border);
  background: rgba(16, 15, 23, 0.85);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #a78bfa, var(--primary-strong));
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.5);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-text strong {
  font-size: 0.96rem;
  font-weight: 800;
}

.brand-text small {
  font-size: 0.72rem;
  color: var(--muted);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.7rem;
  border-radius: 99px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.user-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
}

/* Main */
.landing-main {
  flex: 1;
  max-width: 980px;
  width: 100%;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.hero-intro {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 99px;
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.35);
  color: #c4b5fd;
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 1.1rem;
}

.hero-intro h1 {
  margin: 0;
  font-size: 2.3rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hero-sub {
  max-width: 620px;
  margin: 0.75rem auto 0;
  font-size: 1.02rem;
  color: var(--text-soft);
  line-height: 1.55;
}

/* Slides Card */
.slides-card {
  padding: 2.5rem;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.slide-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 2.5rem;
  align-items: center;
  min-height: 260px;
}

.slide-step-badge {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.6rem;
}

.slide-text-col h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.slide-desc {
  margin: 0.85rem 0 1.25rem;
  font-size: 0.95rem;
  color: var(--text-soft);
  line-height: 1.6;
}

.slide-highlight-box {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 0.82rem;
  font-weight: 600;
  color: #c4b5fd;
}

/* Visual Mockup inside Slide */
.slide-visual-col {
  display: flex;
  justify-content: center;
}

.visual-card-preview {
  position: relative;
  width: 100%;
  max-width: 320px;
  min-height: 240px;
  padding: 1.8rem 1.4rem;
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  border: 1.5px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.5);
}

.preview-glow {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 160px;
  height: 160px;
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.25;
  pointer-events: none;
}

.preview-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: #fff;
  margin-bottom: 1.25rem;
  box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.4);
}

.mini-mockup-team {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
}

.team-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
}

.code-tag {
  font-family: monospace;
  background: rgba(139, 92, 246, 0.2);
  color: #c4b5fd;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
}

.member-pills {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-soft);
}

.mini-mockup-check {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.check-box-done {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.9rem;
  border-radius: 99px;
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  font-weight: 700;
  font-size: 0.85rem;
}

.streak-demo {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--flame);
}

.mini-mockup-midnight {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.timer-tag {
  font-size: 0.72rem;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}

.clock-digits {
  font-size: 1.6rem;
  font-weight: 800;
  color: #a78bfa;
}

.penalty-tag {
  font-size: 0.75rem;
  color: #f59e0b;
  font-weight: 600;
}

.mini-mockup-chat {
  display: flex;
  flex-direction: column;
}

.chat-bubble-demo {
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid rgba(56, 189, 248, 0.3);
  text-align: left;
}

.alert-tag {
  display: block;
  font-size: 0.65rem;
  font-weight: 800;
  color: #f59e0b;
  margin-bottom: 0.25rem;
}

.chat-bubble-demo p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.35;
}

/* Controls */
.slides-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}

.slide-nav-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  color: var(--text-soft);
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
}

.slide-nav-btn:hover {
  background: var(--primary-soft);
  color: #fff;
  border-color: var(--primary);
}

.dots-row {
  display: flex;
  gap: 0.6rem;
}

.dot-btn {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: var(--border-strong);
  transition: all 0.2s ease;
  padding: 0;
}

.dot-btn.active {
  width: 28px;
  border-radius: 99px;
  background: var(--primary);
}

/* CTA Box */
.landing-cta-box {
  padding: 1.8rem 2.2rem;
  background:
    radial-gradient(100% 120% at 0% 0%, rgba(139, 92, 246, 0.18), transparent 50%),
    var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.cta-user-status {
  display: flex;
  align-items: center;
  gap: 1.2rem;
}

.cta-user-status h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.cta-user-status p {
  margin: 0.25rem 0 0;
  font-size: 0.86rem;
  color: var(--muted);
}

.rocket-icon {
  font-size: 2.2rem;
}

.cta-big-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.6rem;
  border-radius: var(--radius);
  font-size: 0.95rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #9f7aea, var(--primary-strong));
  box-shadow: 0 8px 24px -6px rgba(124, 58, 237, 0.7);
  transition: transform 0.15s, box-shadow 0.15s;
}

.cta-big-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(124, 58, 237, 0.85);
}

.landing-footer {
  text-align: center;
  padding: 1.5rem;
  font-size: 0.78rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
}

@media (max-width: 800px) {
  .slide-content-grid {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .landing-cta-box {
    flex-direction: column;
    text-align: center;
  }
  .cta-user-status {
    flex-direction: column;
  }
}
</style>
