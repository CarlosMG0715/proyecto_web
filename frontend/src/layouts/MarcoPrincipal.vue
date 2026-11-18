<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import BarraLateral from '@/components/layout/BarraLateral.vue'
import ModalCrearGrupo from '@/components/group/ModalCrearGrupo.vue'
import { usarAlmacenGrupos } from '@/stores/grupos'
import '@/assets/styles/vistas-juego.css'
const groups = usarAlmacenGrupos()
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  timer = setInterval(() => {
    if (!document.hidden) void groups.recargarGrupos()
  }, 60000)
})
onUnmounted(() => clearInterval(timer))
</script>
<template>
  <div class="shell">
    <BarraLateral />
    <main class="content"><RouterView /></main>
    <ModalCrearGrupo />
  </div>
</template>
<style scoped>
.shell {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  min-height: 100vh;
  background: var(--bg);
}
.content {
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}
@media (max-width: 700px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: 68px;
  }
  .content {
    height: calc(100dvh - 68px);
  }
}
</style>
