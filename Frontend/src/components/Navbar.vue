<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="navbar">
    <div class="nav-brand">
      <RouterLink to="/" class="brand-link">
        🔥 <span>Hábitos Grupales</span>
      </RouterLink>
    </div>
    <div class="nav-links">
      <RouterLink to="/" class="nav-item">Inicio</RouterLink>
      <RouterLink to="/grupos" class="nav-item">Mis Grupos</RouterLink>
      <RouterLink to="/login" class="nav-item login-btn">Iniciar Sesión</RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background-color: #1e1e2f;
  border-bottom: 1px solid #383852;
  color: #f5f5f7;
}

.brand-link {
  font-weight: 700;
  font-size: 1.25rem;
  color: #ffb86c;
  text-decoration: none;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.nav-item {
  color: #d1d1e0;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-item:hover {
  color: #50fa7b;
}

.login-btn {
  background: #bd93f9;
  color: #1e1e2f;
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  font-weight: 600;
}

.login-btn:hover {
  background: #ff79c6;
  color: #fff;
}
</style>
