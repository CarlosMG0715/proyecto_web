<script setup lang="ts">
// pagina publica que presenta el proposito del producto y dirige al acceso.
/**
 * KORDIA - LANDING HERO PAGE
 * Ajustes solicitados por Valeria:
 * 1. Ventanita en blanco transparente estilizado (glassmorphism dinámico y translúcido) para apreciar la ilustración.
 * 2. Ventanita corrida ligeramente más hacia la izquierda (más centrada en el tercio derecho, sin pegarse a la esquina).
 * 3. Explicación directa y simple de las funciones principales.
 * 4. Botón inferior de acción un poco más grande e imponente ("INGRESAR A KORDIA ↗" / "VOLVER AL DASHBOARD ↗").
 */
import { useRouter } from 'vue-router'
import kordiaLogo from '@/assets/kordia_logo.png'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()

function handleAction(): void {
  if (session.isAuthenticated) {
    router.push('/app/inicio')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="kordia-fullscreen-landing">
    <!-- 1. HEADER SUPERIOR: BIENVENIDO A KORDIA ANCHO E IMPONENTE -->
    <header class="landing-top-header">
      <div class="header-title-badge">
        <h1 class="big-header-title">
          BIENVENIDO A <span class="brand-gradient">KORDIA</span>
        </h1>
      </div>
    </header>

    <!-- 2. ÁREA CENTRAL: VENTANITA BLANCA TRANSLÚCIDA MOVIDA LIGERAMENTE A LA IZQUIERDA -->
    <main class="landing-main-area">
      <section class="floating-hero-window">
        <!-- Logo oficial destacado -->
        <div class="logo-center-wrap">
          <img :src="kordiaLogo" alt="Kordia Logo" class="window-logo" />
        </div>

        <!-- Título de presentación todo moradito -->
        <h2 class="hero-window-title purple-gradient">
          Monitorea tus hábitos en equipo
        </h2>

        <!-- Descripción simple y directa -->
        <p class="hero-window-desc">
          Crea tu grupo, mantén tus rachas y alcanza metas juntos. Sin dejar a nadie atrás.
        </p>

        <!-- Funciones explicadas de forma simple y dinámica en cápsulas translúcidas -->
        <div class="clean-features-list">
          <div class="clean-feature-item">
            <span class="feature-dot"></span>
            <div class="feature-info">
              <strong class="feature-label">Rachas grupales activas</strong>
              <span class="feature-desc">Cumple tu hábito diario y protege la racha del equipo.</span>
            </div>
          </div>

          <div class="clean-feature-item">
            <span class="feature-dot"></span>
            <div class="feature-info">
              <strong class="feature-label">Detección de deserción</strong>
              <span class="feature-desc">Cierre diario a medianoche y penalizaciones automáticas.</span>
            </div>
          </div>

          <div class="clean-feature-item">
            <span class="feature-dot"></span>
            <div class="feature-info">
              <strong class="feature-label">Chat & apoyo en vivo</strong>
              <span class="feature-desc">Motivación en tiempo real para no dejar a nadie atrás.</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 3. ÁREA INFERIOR: BOTÓN MÁS GRANDE REDONDITO DE ACCIÓN -->
    <footer class="bottom-action-container">
      <button type="button" class="cta-pill-button" @click="handleAction">
        <span v-if="!session.isAuthenticated">INGRESAR A KORDIA ↗</span>
        <span v-else>REGRESAR ↗</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
/* ================================================= */
/* FONDO PANTALLA COMPLETA INMERSIVO                 */
/* ================================================= */
.kordia-fullscreen-landing {
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: #0b0914;
  /* Imagen centrada como en login/registro */
  background-image:
    linear-gradient(180deg, rgba(11, 9, 20, 0.4) 0%, rgba(11, 9, 20, 0.05) 35%, rgba(11, 9, 20, 0.7) 100%),
    url('@/assets/kordia_landing_bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  color: #f1f0f7;
  overflow-x: hidden;
  padding: 1.4rem 2rem 2.2rem;
  user-select: none;
}

/* ================================================= */
/* 1. HEADER SUPERIOR ANCHO E IMPONENTE              */
/* ================================================= */
.landing-top-header {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-top: 0.4rem;
  z-index: 10;
}

.header-title-badge {
  width: min(920px, 94%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.85rem 3rem;
  border-radius: 99px;
  background: rgba(14, 11, 25, 0.72);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  box-shadow:
    0 16px 44px rgba(0, 0, 0, 0.7),
    0 0 35px rgba(168, 85, 247, 0.15);
}

.big-header-title {
  margin: 0;
  font-size: 2.35rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  color: #ffffff;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.85);
  text-align: center;
  white-space: nowrap;
}

.brand-gradient {
  background: linear-gradient(135deg, #ff9a4d 0%, #f97316 45%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 900;
  letter-spacing: 0.12em;
  filter: drop-shadow(0 0 14px rgba(249, 115, 22, 0.6));
}

/* ================================================= */
/* 2. ÁREA PRINCIPAL: VENTANITA BLANCA TRANSLÚCIDA   */
/* ================================================= */
.landing-main-area {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  max-width: 1600px;
  margin: 1rem auto;
  padding-right: 0.8rem;
  z-index: 5;
}

.floating-hero-window {
  position: relative;
  max-width: 400px;
  width: 100%;
  padding: 1.8rem 1.9rem;
  border-radius: 30px;
  /* Efecto blanco transparente / frosted glass para apreciar el dibujo */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1.5px solid rgba(255, 255, 255, 0.28);
  box-shadow:
    0 24px 60px -12px rgba(0, 0, 0, 0.75),
    0 0 35px rgba(255, 255, 255, 0.12),
    inset 0 1px 1px rgba(255, 255, 255, 0.4);
  animation: floatWindow 5s ease-in-out infinite alternate;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.floating-hero-window:hover {
  box-shadow:
    0 28px 70px -10px rgba(0, 0, 0, 0.8),
    0 0 45px rgba(255, 255, 255, 0.18),
    inset 0 1px 1px rgba(255, 255, 255, 0.5);
}

@keyframes floatWindow {
  0% {
    transform: translateY(0px);
  }
  100% {
    transform: translateY(-6px);
  }
}

/* Logo Oficial */
.logo-center-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 0.8rem;
}

.window-logo {
  width: 62px;
  height: 62px;
  object-fit: contain;
  filter: drop-shadow(0 0 22px rgba(249, 115, 22, 0.85));
  transition: transform 0.3s ease;
}

.window-logo:hover {
  transform: scale(1.06) rotate(3deg);
}

/* Título de la Ventanita   */
.hero-window-title {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1.25;
  text-align: center;
}

.purple-gradient {
  display: inline-block;
  background: linear-gradient(135deg, #d354cf 0%, #8636c7 35%, #5d1a87 70%, #8f52c4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
}

/* Descripción */
.hero-window-desc {
  margin: 0.5rem 0 1.15rem;
  font-size: 0.86rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.48;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

/* Lista de funciones limpias sin líneas divisorias ni cajas encerradas */
.clean-features-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.25rem;
}

.clean-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.2rem 0;
  text-align: left;
}

.feature-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff9a4d;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(249, 115, 22, 0.9);
}

.feature-info {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.feature-label {
  font-size: 0.84rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.feature-desc {
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.82);
  margin-top: 1px;
}

/* ================================================= */
/* 3. BOTÓN INFERIOR MÁS GRANDE                      */
/* ================================================= */
.bottom-action-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.2rem 1rem 0.6rem;
  z-index: 10;
}

.cta-pill-button {
  padding: 1.25rem 5.2rem; /* Más grande y cómodo */
  border-radius: 99px;
  border: none;
  font-size: 1.25rem; /* Letra un poquis más grande */
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #1a0f05;
  background: linear-gradient(135deg, #ff9a4d 0%, #f97316 60%, #ea580c 100%);
  cursor: pointer;
  box-shadow:
    0 16px 44px -6px rgba(249, 115, 22, 0.9),
    0 0 38px rgba(251, 146, 60, 0.6);
  transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
}

.cta-pill-button:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    0 20px 52px -6px rgba(249, 115, 22, 1),
    0 0 44px rgba(251, 146, 60, 0.8);
  filter: brightness(1.08);
}

.cta-pill-button:active {
  transform: translateY(0);
}

/* ================================================= */
/* RESPONSIVE DESIGN                                 */
/* ================================================= */
@media (max-width: 1024px) {
  .big-header-title {
    font-size: 1.85rem;
    letter-spacing: 0.12em;
  }
  .header-title-badge {
    padding: 0.75rem 2rem;
  }
  .landing-main-area {
    justify-content: center;
    padding-right: 0;
  }
  .floating-hero-window {
    max-width: 380px;
    padding: 1.6rem 1.5rem;
  }
}

@media (max-width: 600px) {
  .kordia-fullscreen-landing {
    padding: 1rem 1rem 1.5rem;
  }
  .header-title-badge {
    padding: 0.5rem 1.2rem;
    border-radius: 20px;
  }
  .big-header-title {
    font-size: 1.25rem;
    letter-spacing: 0.06em;
    white-space: normal;
  }
  .floating-hero-window {
    border-radius: 24px;
    padding: 1.4rem 1.2rem;
    max-width: 340px;
  }
  .hero-window-title {
    font-size: 1.25rem;
  }
  .window-logo {
    width: 52px;
    height: 52px;
  }
  .cta-pill-button {
    padding: 1.1rem 2.8rem;
    font-size: 1.05rem;
    width: 100%;
    max-width: 320px;
  }
}
</style>
