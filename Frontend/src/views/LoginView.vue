<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { login, register } from '@/services/authService'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()

const mode = ref<'login' | 'register'>('login')
const name = ref('')
const email = ref('')
const password = ref('')
const success = ref<string | null>(null)

const isRegister = computed(() => mode.value === 'register')

function toggleMode(): void {
  mode.value = isRegister.value ? 'login' : 'register'
  session.setError(null)
  success.value = null
}

function getRedirect(): string {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }
  return '/groups'
}

async function onSubmit(): Promise<void> {
  success.value = null
  try {
    if (isRegister.value) {
      await register({ name: name.value, email: email.value, password: password.value })
      await login({ email: email.value, password: password.value })
    } else {
      await login({ email: email.value, password: password.value })
    }
    await router.push(getRedirect())
  } catch {
    /* el mensaje ya quedó en session.error */
  }
}
</script>

<template>
  <main class="login">
    <form class="login__form" @submit.prevent="onSubmit">
      <h1>{{ isRegister ? 'Crear cuenta' : 'Iniciar sesión' }}</h1>

      <label v-if="isRegister">
        Nombre
        <input v-model="name" type="text" autocomplete="name" required minlength="2" />
      </label>

      <label>
        Correo
        <input v-model="email" type="email" autocomplete="email" required />
      </label>

      <label>
        Contraseña
        <input
          v-model="password"
          type="password"
          :autocomplete="isRegister ? 'new-password' : 'current-password'"
          required
          :minlength="isRegister ? 8 : undefined"
        />
      </label>

      <p v-if="session.error" class="login__error" role="alert">{{ session.error }}</p>
      <p v-if="success" class="login__success" role="status">{{ success }}</p>

      <button type="submit" :disabled="session.isLoading">
        {{
          session.isLoading
            ? 'Procesando...'
            : isRegister
              ? 'Crear cuenta'
              : 'Ingresar'
        }}
      </button>

      <button type="button" class="login__toggle" @click="toggleMode">
        {{ isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate' }}
      </button>
    </form>
  </main>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.login__form {
  width: 100%;
  max-width: 24rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login__form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.login__form input {
  padding: 0.6rem 0.75rem;
  border: 1px solid #c4c4c4;
  border-radius: 6px;
  font: inherit;
}

.login__form button[type='submit'] {
  padding: 0.7rem;
  border: 0;
  border-radius: 6px;
  background: #4f46e5;
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.login__form button[type='submit']:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login__toggle {
  background: none;
  border: 0;
  color: #4f46e5;
  cursor: pointer;
  font: inherit;
}

.login__error {
  color: #b91c1c;
  margin: 0;
}

.login__success {
  color: #15803d;
  margin: 0;
}
</style>