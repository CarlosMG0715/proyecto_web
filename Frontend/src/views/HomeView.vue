<script setup lang="ts">
/**
 * KORDIA - PÁGINA PRINCIPAL / LANDING HERO
 * Réplica fiel del diseño cinemático de 3 cards grandes:
 * - Slides grandes que ocupan la mayor parte de la pantalla
 * - 3 ilustraciones de alta calidad generadas
 * - Flechas de navegación `<` y `>` con glow cálido
 * - Indicadores de puntos (dots)
 * - Botón grande redondito: "INGRESAR" o "VOLVER ->" según el estado de la sesión
 * - Logo oficial de Kordia arriba sin textos innecesarios
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import kordiaLogo from '@/assets/kordia_logo.png'
import slideTeam from '@/assets/slides/slide_team.jpg'
import slideStreak from '@/assets/slides/slide_streak.jpg'
import slideMonitor from '@/assets/slides/slide_monitor.jpg'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()

interface SlideData {
  id: number
  topTitle: string
  image: string
  headline: string
  lines: string[]
  accentColor: string
}

const slides: SlideData[] = [
  {
    id: 0,
    topTitle: 'ÚNETE A UN EQUIPO 🔥',
    image: slideTeam,
    headline: 'ÚNETE A UN EQUIPO',
    lines: ['Colabora y crece juntos.', 'Supera metas compartidas.'],
    accentColor: '#f97316',
  },
  {
    id: 1,
    topTitle: '🔥 ALCANZA RACHAS GRUPALES',
    image: slideStreak,
    headline: 'ALCANZA RACHAS GRUPALES',
    lines: ['Mantén la constancia.', 'Evita penalizaciones por deserción.'],
    accentColor: '#fb923c',
  },
  {
    id: 2,
    topTitle: '🔥 MONITOREA TU IMPACTO',
    image: slideMonitor,
    headline: 'MONITOREA TU IMPACTO',
    lines: ['Visualiza el progreso de todos y cada uno.', 'Check-ins diarios, recordatorios y chat en vivo.'],
    accentColor: '#f59e0b',
  },
]

const activeIndex = ref(0)
let autoPlayTimer: number | undefined

function nextSlide(): void {
  activeIndex.value = (activeIndex.value + 1) % slides.length
}

function prevSlide(): void {
  activeIndex.value = (activeIndex.value - 1 + slides.length) % slides.length
}

function selectSlide(index: number): void {
  activeIndex.value = index
  resetAutoplay()
}

function resetAutoplay(): void {
  if (autoPlayTimer !== undefined) clearInterval(autoPlayTimer)
  autoPlayTimer = window.setInterval(nextSlide, 6500)
}

onMounted(() => {
  resetAutoplay()
})

onUnmounted(() => {
  if (autoPlayTimer !== undefined) clearInterval(autoPlayTimer)
})

const userName = computed(() => session.currentUser?.name || 'Valeria')

function handleMainAction(): void {
  if (session.isAuthenticated) {
    router.push('/app/inicio')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="kordia-landing">
    <!-- Encabezado sutil: Solo el logo oficial y branding de Kordia -->
    <header class="top-header">
      <div class="brand-wrap">
        <img :src="kordiaLogo" alt="Kordia Logo" class="kordia-logo-img" />
        <span class="brand-name">Kordia</span>
      </div>

      <div class="top-auth">
        <template v-if="session.isAuthenticated">
          <span class="logged-pill">
            <span class="status-dot"></span>
            {{ userName }}
          </span>
          <button type="button" class="mini-exit-btn" @click="handleMainAction">
            Ir al panel →
          </button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="mini-login-link">
            Iniciar Sesión
          </RouterLink>
        </template>
      </div>
    </header>

    <!-- ÁREA PRINCIPAL: SLIDER DE TARJETAS GIGANTES -->
    <main class="slider-viewport">
      <!-- Flecha Izquierda -->
      <button
        type="button"
        class="nav-arrow left"
        title="Anterior"
        @click="prevSlide(); resetAutoplay()"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <!-- Contenedor de las 3 Cards -->
      <div class="cards-carousel">
        <div
          v-for="(s, idx) in slides"
          :key="s.id"
          class="slide-card"
          :class="{
            active: idx === activeIndex,
            prev: (idx === (activeIndex - 1 + slides.length) % slides.length),
            next: (idx === (activeIndex + 1) % slides.length),
          }"
          @click="selectSlide(idx)"
        >
          <!-- Título Superior -->
          <div class="card-top-title">
            <span>{{ s.topTitle }}</span>
          </div>

          <!-- Imagen Ilustrada Grande -->
          <div class="card-image-box">
            <img :src="s.image" :alt="s.headline" class="slide-illustration" />
          </div>

          <!-- Texto Inferior -->
          <div class="card-caption">
            <h3 class="caption-title">{{ s.headline }}</h3>
            <p v-for="(line, lineIdx) in s.lines" :key="lineIdx" class="caption-line">
              {{ line }}
            </p>
          </div>
        </div>
      </div>

      <!-- Flecha Derecha -->
      <button
        type="button"
        class="nav-arrow right"
        title="Siguiente"
        @click="nextSlide(); resetAutoplay()"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </main>

    <!-- Indicador de Puntos (Dots) -->
    <div class="dots-indicator">
      <button
        v-for="(s, idx) in slides"
        :key="s.id"
        type="button"
        class="dot"
        :class="{ active: idx === activeIndex }"
        @click="selectSlide(idx)"
      ></button>
    </div>

    <!-- SECCIÓN DE ACCIÓN INFERIOR -->
    <footer class="bottom-action-area">
      <!-- Botón grande redondeado con glow naranja/durazno idéntico a la imagen -->
      <button type="button" class="cta-pill-btn" @click="handleMainAction">
        <span v-if="!session.isAuthenticated">INGRESAR A LA PLATAFORMA</span>
        <span v-else>VOLVER →</span>
      </button>

      <!-- Texto inferior con enlace -->
      <div class="sub-link-row">
        <template v-if="!session.isAuthenticated">
          <span>¿Ya tienes cuenta?</span>
          <RouterLink to="/login" class="text-link">Inicia Sesión aquí.</RouterLink>
        </template>
        <template v-else>
          <span class="user-greeting">Sesión activa como <strong>{{ userName }}</strong>. Haz clic arriba para ir a tus grupos.</span>
        </template>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ================================================= */
/* KORDIA LANDING - ESTÉTICA OSCURA CINEMÁTICA       */
/* ================================================= */
.kordia-landing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: #08070d;
  background-image:
    radial-gradient(120% 90% at 50% 40%, rgba(251, 146, 60, 0.08), transparent 60%),
    radial-gradient(80% 80% at 20% 90%, rgba(139, 92, 246, 0.06), transparent 50%),
    radial-gradient(70% 70% at 80% 20%, rgba(249, 115, 22, 0.05), transparent 55%);
  color: #f1f0f7;
  overflow-x: hidden;
  padding: 1.25rem 1.5rem 2rem;
  user-select: none;
}

/* Header */
.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1420px;
  width: 100%;
  margin: 0 auto;
  padding: 0.5rem 1rem;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.kordia-logo-img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  filter: drop-shadow(0 0 16px rgba(249, 115, 22, 0.55));
}

.brand-name {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #ffffff 30%, #fb923c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.top-auth {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logged-pill {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.8rem;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.84rem;
  color: #e5e5eb;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

.mini-exit-btn,
.mini-login-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: #fb923c;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}

.mini-exit-btn:hover,
.mini-login-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* ================================================= */
/* SLIDER VIEWPORT (CASI TODA LA PANTALLA)           */
/* ================================================= */
.slider-viewport {
  position: relative;
  max-width: 1480px;
  width: 100%;
  margin: 1rem auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
  flex: 1;
}

/* Flechas de Navegación */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #ffb38a, #f97316);
  color: #1a0f05;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 8px 24px -4px rgba(249, 115, 22, 0.6);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.nav-arrow.left {
  left: 0.5rem;
}

.nav-arrow.right {
  right: 0.5rem;
}

.nav-arrow:hover {
  transform: translateY(-50%) scale(1.08);
  box-shadow: 0 12px 32px -4px rgba(249, 115, 22, 0.85);
}

/* Carrusel de 3 Cards */
.cards-carousel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.8rem;
  width: 100%;
  padding: 1rem 3.5rem;
}

/* TARJETA INDIVIDUAL (GRANDE) */
.slide-card {
  flex: 1;
  max-width: 420px;
  height: 540px;
  border-radius: 24px;
  background: #110e1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 1.6rem 1.6rem 2rem;
  transition: all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 50px -15px rgba(0, 0, 0, 0.7);
}

/* Efecto de Card Inactiva */
.slide-card:not(.active) {
  opacity: 0.55;
  transform: scale(0.94);
  filter: brightness(0.75);
}

.slide-card:not(.active):hover {
  opacity: 0.75;
  transform: scale(0.96);
}

/* Efecto de Card Activa (Como en la foto: marco brillante con glow cálido) */
.slide-card.active {
  opacity: 1;
  transform: scale(1.03);
  filter: brightness(1);
  border: 1.5px solid rgba(251, 146, 60, 0.75);
  box-shadow:
    0 0 50px -10px rgba(249, 115, 22, 0.35),
    0 25px 60px -15px rgba(0, 0, 0, 0.85),
    inset 0 0 30px rgba(251, 146, 60, 0.08);
  background: linear-gradient(180deg, #161224 0%, #0f0c18 100%);
}

/* Título Superior */
.card-top-title {
  text-align: center;
  margin-bottom: 1.25rem;
}

.card-top-title span {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #ffb885;
  text-shadow: 0 0 14px rgba(251, 146, 60, 0.4);
}

/* Contenedor de la Imagen */
.card-image-box {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  background: #090710;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
}

.slide-illustration {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.slide-card.active .slide-illustration {
  transform: scale(1.02);
}

/* Texto Caption Inferior */
.card-caption {
  margin-top: 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.caption-title {
  margin: 0 0 0.2rem;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #ffcb9e;
}

.caption-line {
  margin: 0;
  font-size: 0.88rem;
  color: #a49fb8;
  line-height: 1.4;
}

.slide-card.active .caption-line {
  color: #d1cde3;
}

/* ================================================= */
/* DOTS INDICATOR                                    */
/* ================================================= */
.dots-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  margin: 0.5rem 0 1.25rem;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
  transition: all 0.25s ease;
  padding: 0;
}

.dot.active {
  width: 26px;
  border-radius: 99px;
  background: #f97316;
  box-shadow: 0 0 10px rgba(249, 115, 22, 0.7);
}

/* ================================================= */
/* BOTTOM ACTION AREA (BOTÓN INGRESAR / VOLVER)     */
/* ================================================= */
.bottom-action-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  margin-top: 0.5rem;
}

/* Botón grande redondeado peach/orange */
.cta-pill-btn {
  padding: 1.05rem 3.5rem;
  border-radius: 99px;
  border: none;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #1a0f05;
  background: linear-gradient(135deg, #ffd3b6 0%, #ff9e66 50%, #f97316 100%);
  cursor: pointer;
  box-shadow:
    0 10px 30px -6px rgba(249, 115, 22, 0.65),
    0 0 20px rgba(255, 179, 138, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cta-pill-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 14px 40px -6px rgba(249, 115, 22, 0.85),
    0 0 28px rgba(255, 179, 138, 0.6);
}

.cta-pill-btn:active {
  transform: translateY(0);
}

.sub-link-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.86rem;
  color: #928ca6;
}

.text-link {
  color: #ffb885;
  font-weight: 600;
  text-decoration: underline;
  transition: opacity 0.15s;
}

.text-link:hover {
  opacity: 0.8;
}

.user-greeting {
  font-size: 0.85rem;
  color: #a49fb8;
}

.user-greeting strong {
  color: #f1f0f7;
}

/* Responsive */
@media (max-width: 1024px) {
  .cards-carousel {
    gap: 1rem;
    padding: 1rem;
  }
  .slide-card {
    height: 480px;
  }
}

@media (max-width: 768px) {
  .slide-card:not(.active) {
    display: none;
  }
  .slide-card.active {
    max-width: 360px;
    height: 460px;
    transform: none;
  }
  .nav-arrow.left {
    left: 0;
  }
  .nav-arrow.right {
    right: 0;
  }
}
</style>
