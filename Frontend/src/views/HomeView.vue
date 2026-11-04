<script setup lang="ts">
import '@/assets/styles/views/landing.css'
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
