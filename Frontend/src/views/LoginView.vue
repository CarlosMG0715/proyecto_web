<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import AuthLayout from '../layouts/AuthLayout.vue'
import { api } from '../services/api'
import { useSessionStore } from '../stores/session'
import type { AuthResponse, ApiErrorResponse } from '../types/auth'

const router = useRouter()
const sessionStore = useSessionStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

async function handleLogin() {
  errorMessage.value = ''
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor ingresa tu correo y contraseña'
    return
  }

  isLoading.value = true
  try {
    const response = await api.post<AuthResponse>('/auth/login', {
      email: email.value,
      password: password.value,
    })

    sessionStore.setSession(response.data.accessToken, response.data.user)
    router.push('/groups')
  } catch (error: unknown) {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
      errorMessage.value =
        error.response?.data?.error || 'Error al iniciar sesión. Verifica tus credenciales.'
    } else {
      errorMessage.value = 'Ocurrió un error inesperado al conectar con el servidor.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <form class="login-form" @submit.prevent="handleLogin">
      <h2>Iniciar Sesión</h2>

      <div v-if="errorMessage" class="error-banner">
        ⚠️ {{ errorMessage }}
      </div>

      <div class="form-group">
        <label for="email">Correo Electrónico</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="ejemplo@correo.com"
          required
          autocomplete="email"
        />
      </div>

      <div class="form-group">
        <label for="password">Contraseña</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          required
          autocomplete="current-password"
        />
      </div>

      <button type="submit" class="submit-btn" :disabled="isLoading">
        {{ isLoading ? 'Ingresando...' : 'Iniciar Sesión' }}
      </button>

      <p class="demo-hint">
        💡 Cuenta de prueba: <strong>admin@example.test</strong>
      </p>
    </form>
  </AuthLayout>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #f8f8f2;
}

.error-banner {
  background: rgba(255, 85, 85, 0.15);
  border: 1px solid #ff5555;
  color: #ff5555;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-align: left;
}

label {
  font-size: 0.875rem;
  color: #c0c0d0;
  font-weight: 500;
}

input {
  background: #191924;
  border: 1px solid #3e3e58;
  color: #fff;
  padding: 0.7rem 0.9rem;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #bd93f9;
}

.submit-btn {
  background: #50fa7b;
  color: #121214;
  font-weight: 700;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: opacity 0.2s;
  margin-top: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.demo-hint {
  font-size: 0.8rem;
  color: #6272a4;
  text-align: center;
  margin-top: 0.5rem;
}
</style>
