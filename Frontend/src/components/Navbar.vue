<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { api } from '@/services/api'

const router = useRouter()
const sessionStore = useSessionStore()

async function handleLogout() {
  try {
    await api.post('/auth/logout')
  } catch {
    // Si falla el servidor, igual limpiamos la sesión local
  } finally {
    sessionStore.clearSession()
    router.push('/login')
  }
}
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

      <template v-if="sessionStore.isAuthenticated">
        <RouterLink to="/groups" class="nav-item">Mis Grupos</RouterLink>
        <span class="user-pill">👤 {{ sessionStore.user?.name || 'Usuario' }}</span>
        <button class="logout-btn" @click="handleLogout">Cerrar Sesión</button>
      </template>

      <template v-else>
        <RouterLink to="/login" class="nav-item login-btn">Iniciar Sesión</RouterLink>
      </template>
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

.user-pill {
  font-size: 0.9rem;
  color: #8be9fd;
  background: rgba(139, 233, 253, 0.1);
  padding: 0.3rem 0.7rem;
  border-radius: 20px;
  border: 1px solid rgba(139, 233, 253, 0.3);
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

.logout-btn {
  background: transparent;
  border: 1px solid #ff5555;
  color: #ff5555;
  padding: 0.35rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #ff5555;
  color: #fff;
}
</style>
