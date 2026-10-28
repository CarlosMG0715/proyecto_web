<script setup lang="ts">
// layout sencillo para envolver paginas de la aplicacion que no usan el dashboard.
import Navbar from '@/components/Navbar.vue'
</script>

<template>
  <div class="app-layout">
    <Navbar />
    <main class="main-container">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #0f0d1b;
  color: #e1e1e6;
  font-family: system-ui, -apple-system, sans-serif;
}

.main-container {
  flex: 1;
  max-width: 1520px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
</style>
