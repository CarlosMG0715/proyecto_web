<script setup lang="ts">
import { useRouter } from 'vue-router'
import kordiaLogo from '@/assets/logo-kordia.png'
import { usarAlmacenSesion } from '@/stores/sesion'

const router = useRouter()
const session = usarAlmacenSesion()

function handleAction(): void {
  if (session.estaAutenticado) {
    router.push('/app/perfil')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="kordia-fullscreen-landing">
    <header class="landing-top-header">
      <div class="header-title-badge">
        <h1 class="big-header-title">
          BIENVENIDO A
          <span class="brand-gradient">KORDIA</span>
        </h1>
      </div>
    </header>

    <main class="landing-main-area">
      <img :src="kordiaLogo" alt="Kordia" class="logo-bienvenida" />
    </main>

    <footer class="bottom-action-container">
      <button type="button" class="cta-pill-button" @click="handleAction">
        <span v-if="!session.estaAutenticado">INGRESAR A KORDIA ↗</span>
        <span v-else>REGRESAR ↗</span>
      </button>
    </footer>
  </div>
</template>

<style scoped src="@/assets/styles/components/VistaBienvenida.css"></style>
