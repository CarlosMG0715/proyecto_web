<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
</script>

<template>
  <AppLayout>
    <div class="home-container">
      <h1>🔥 Monitor de Hábitos Grupales</h1>
      <p class="desc">
        Cumple tus metas diarias en equipo, mantén la racha grupal y evita las penalizaciones por deserción.
      </p>

      <div class="actions">
        <RouterLink to="/groups" class="primary-btn">Explorar Mis Grupos</RouterLink>
        <RouterLink to="/login" class="secondary-btn">Iniciar Sesión</RouterLink>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.home-container {
  text-align: center;
  padding: 3rem 1rem;
}

h1 {
  font-size: 2.25rem;
  color: #ffb86c;
  margin-bottom: 1rem;
}

.desc {
  max-width: 600px;
  margin: 0 auto 2rem;
  font-size: 1.1rem;
  color: #a0a0b2;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.primary-btn {
  background: #50fa7b;
  color: #121214;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
}

.secondary-btn {
  background: #282a36;
  border: 1px solid #44475a;
  color: #f8f8f2;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
}
</style>
