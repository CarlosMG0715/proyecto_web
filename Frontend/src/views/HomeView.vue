<script setup lang="ts">
/**
 * KORDIA - LANDING HERO PAGE
 * Basada fielmente en la inspiración y boceto de Valeria:
 * - Badge "Kordia" con logo oficial
 * - Título: "Bienvenido a Kordia. Los hábitos se construyen en equipo."
 * - Descripción concisa y humana (cero frases de IA).
 * - La gran ilustración de Kordia en el centro como pieza maestra.
 * - Botón grande redondito: "INGRESAR A KORDIA ↗" o "VOLVER ↗" si ya hay sesión.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import kordiaLogo from '@/assets/kordia_logo.png'
import kordiaHeroImg from '@/assets/kordia_landing_bg.png'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()

const userName = computed(() => session.currentUser?.name || 'Valeria')

function handleAction(): void {
  if (session.isAuthenticated) {
    router.push('/app/inicio')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="landing-container">
    <!-- Navbar Superior Limpia -->
    <header class="top-nav">
      <div class="brand-pill">
        <img :src="kordiaLogo" alt="Kordia" class="logo-img" />
        <span class="brand-text">Kordia</span>
      </div>

      <div class="top-right">
        <template v-if="session.isAuthenticated">
          <span class="user-status-pill">
            <span class="online-dot"></span>
            {{ userName }}
          </span>
          <button type="button" class="btn-top-panel" @click="handleAction">
            Ir al Dashboard →
          </button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="btn-top-login">
            Iniciar sesión
          </RouterLink>
        </template>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="hero-content">
      <!-- Encabezado y Título Principal -->
      <section class="title-section">
        <span class="welcome-badge">
          <span class="fire-emoji">🔥</span>
          Bienvenido a Kordia
        </span>

        <h1 class="main-heading">
          Los hábitos se construyen
          <span class="purple-highlight">en equipo.</span>
        </h1>

        <p class="sub-description">
          Crea tu grupo, mantén tus rachas y alcanza metas juntos. Sin dejar a nadie atrás.
        </p>
      </section>

      <!-- Gran Ilustración Central de Kordia (Pieza Maestra) -->
      <section class="illustration-frame">
        <div class="frame-ambient-glow"></div>
        <div class="image-wrapper">
          <img
            :src="kordiaHeroImg"
            alt="Exploradores de Kordia construyendo hábitos en equipo"
            class="kordia-art"
          />
        </div>
      </section>

      <!-- Botón de Acción Principal y Enlace Inferior -->
      <section class="cta-section">
        <button type="button" class="cta-pill-btn" @click="handleAction">
          <span v-if="!session.isAuthenticated">INGRESAR A KORDIA ↗</span>
          <span v-else>VOLVER AL DASHBOARD ↗</span>
        </button>

        <div class="sub-caption-row">
          <template v-if="!session.isAuthenticated">
            <span>¿Ya tienes cuenta?</span>
            <RouterLink to="/login" class="login-sublink">Inicia sesión aquí.</RouterLink>
          </template>
          <template v-else>
            <span class="active-session-text">
              Sesión activa de <strong>{{ userName }}</strong>. Haz clic para continuar donde lo dejaste.
            </span>
          </template>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* ================================================= */
/* KORDIA LANDING - ESTILO DARK CINEMÁTICO          */
/* ================================================= */
.landing-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #0b0914;
  background-image:
    radial-gradient(90% 80% at 50% 15%, rgba(139, 92, 246, 0.12), transparent 60%),
    radial-gradient(80% 80% at 50% 90%, rgba(249, 115, 22, 0.08), transparent 50%);
  color: #f1f0f7;
  padding: 1.25rem 2rem 2.5rem;
  overflow-x: hidden;
  user-select: none;
}

/* Navbar */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
  padding: 0.5rem 0.5rem 1rem;
}

.brand-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.4rem 1rem 0.4rem 0.5rem;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.logo-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.6));
}

.brand-text {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #fff;
}

.top-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-status-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.85rem;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.84rem;
  color: #ddd9ee;
}

.online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

.btn-top-panel,
.btn-top-login {
  font-size: 0.88rem;
  font-weight: 700;
  color: #fb923c;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
  text-decoration: none;
}

.btn-top-panel:hover,
.btn-top-login:hover {
  opacity: 0.85;
  text-decoration: underline;
}

/* ================================================= */
/* HERO CONTENT                                     */
/* ================================================= */
.hero-content {
  flex: 1;
  max-width: 1240px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  text-align: center;
}

/* Títulos */
.title-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 820px;
}

.welcome-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.9rem;
  border-radius: 99px;
  background: rgba(139, 92, 246, 0.14);
  border: 1px solid rgba(139, 92, 246, 0.35);
  font-size: 0.84rem;
  font-weight: 700;
  color: #c4b5fd;
  margin-bottom: 0.9rem;
  letter-spacing: 0.02em;
}

.fire-emoji {
  font-size: 1rem;
}

.main-heading {
  margin: 0;
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.18;
  color: #ffffff;
}

.purple-highlight {
  display: inline-block;
  background: linear-gradient(135deg, #c084fc 20%, #a855f7 70%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sub-description {
  margin: 0.9rem 0 0;
  font-size: 1.1rem;
  color: #a7a2bc;
  line-height: 1.55;
  max-width: 600px;
}

/* ================================================= */
/* LA GRAN ILUSTRACIÓN CENTRAL (PIEZA MAESTRA)      */
/* ================================================= */
.illustration-frame {
  position: relative;
  width: 100%;
  max-width: 1080px;
  border-radius: 28px;
  padding: 0.75rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 30px 80px -20px rgba(0, 0, 0, 0.9),
    0 0 50px -15px rgba(139, 92, 246, 0.25);
}

.frame-ambient-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 70%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.18), transparent 70%);
  filter: blur(60px);
  pointer-events: none;
}

.image-wrapper {
  position: relative;
  width: 100%;
  border-radius: 22px;
  overflow: hidden;
  background: #090710;
  aspect-ratio: 16 / 9;
  max-height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kordia-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.illustration-frame:hover .kordia-art {
  transform: scale(1.02);
}

/* ================================================= */
/* CTA BUTTON (IDÉNTICO AL BOCETO)                  */
/* ================================================= */
.cta-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  margin-top: 0.5rem;
}

.cta-pill-btn {
  padding: 1.1rem 4rem;
  border-radius: 99px;
  border: none;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #1a0f05;
  background: linear-gradient(135deg, #ff9a4d 0%, #f97316 60%, #ea580c 100%);
  cursor: pointer;
  box-shadow:
    0 12px 36px -6px rgba(249, 115, 22, 0.75),
    0 0 24px rgba(251, 146, 60, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.cta-pill-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 16px 44px -6px rgba(249, 115, 22, 0.9),
    0 0 32px rgba(251, 146, 60, 0.6);
  filter: brightness(1.06);
}

.cta-pill-btn:active {
  transform: translateY(0);
}

.sub-caption-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  color: #928ca6;
}

.login-sublink {
  color: #fb923c;
  font-weight: 700;
  text-decoration: underline;
  transition: opacity 0.15s;
}

.login-sublink:hover {
  opacity: 0.85;
}

.active-session-text {
  font-size: 0.86rem;
  color: #a49fb8;
}

.active-session-text strong {
  color: #ffffff;
}

/* Responsive */
@media (max-width: 900px) {
  .main-heading {
    font-size: 2.1rem;
  }
  .image-wrapper {
    max-height: 380px;
  }
  .cta-pill-btn {
    padding: 1rem 2.8rem;
    font-size: 1rem;
  }
}

@media (max-width: 600px) {
  .landing-container {
    padding: 1rem 1rem 2rem;
  }
  .main-heading {
    font-size: 1.7rem;
  }
  .sub-description {
    font-size: 0.95rem;
  }
  .image-wrapper {
    max-height: 260px;
  }
}
</style>
