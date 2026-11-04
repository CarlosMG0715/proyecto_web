<script setup lang="ts">
import '@/assets/styles/views/login.css'
// pantalla de acceso y alta; valida campos y delega registro/login al servicio de autenticacion.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useSessionStore } from '@/stores/session'
import { login, register } from '@/services/authService'
import kordiaLogo from '@/assets/kordia_logo.png'

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
  return '/app/inicio'
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
  <main class="login-wrapper">
    <!-- Flecha estética para volver al landing page -->
    <RouterLink to="/" class="aesthetic-back-arrow" aria-label="Volver">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    </RouterLink>

    <div class="login-card panel">
      <!-- Marca y Encabezado -->
      <div class="brand-header">
        <img :src="kordiaLogo" alt="Kordia Logo" class="login-brand-logo" />
        <h1>{{ isRegister ? 'Crea tu cuenta en Kordia' : '¡Hola de nuevo!' }}</h1>
        <p>
          {{
            isRegister
              ? 'Únete a tu equipo y mantén la racha de hábitos diaria.'
              : 'Ingresa para revisar el estado de tu equipo y tu racha de hoy.'
          }}
        </p>
      </div>

      <!-- Selector de Modo (Tabs) -->
      <div class="tabs-row">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: !isRegister }"
          @click="mode = 'login'"
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: isRegister }"
          @click="mode = 'register'"
        >
          Registrarse
        </button>
      </div>

      <!-- Formulario -->
      <form class="login-form" @submit.prevent="onSubmit">
        <!-- Campo Apodo (solo en registro) -->
        <div v-if="isRegister" class="field">
          <label for="reg-name">Apodo</label>
          <div class="input-wrap">
            <span class="input-icon"><AppIcon name="user" :size="16" /></span>
            <input
              id="reg-name"
              v-model="name"
              type="text"
              placeholder="ej. AlexRacha"
              autocomplete="nickname"
              required
              minlength="2"
            />
          </div>
        </div>

        <!-- Campo Correo -->
        <div class="field">
          <label for="user-email">Correo electrónico</label>
          <div class="input-wrap">
            <span class="input-icon">@</span>
            <input
              id="user-email"
              v-model="email"
              type="email"
              placeholder="tu@correo.com"
              autocomplete="email"
              required
            />
          </div>
        </div>

        <!-- Campo Contraseña -->
        <div class="field">
          <label for="user-pass">Contraseña</label>
          <div class="input-wrap">
            <span class="input-icon"><AppIcon name="shield" :size="16" /></span>
            <input
              id="user-pass"
              v-model="password"
              type="password"
              placeholder="••••••••"
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
              required
              :minlength="isRegister ? 8 : undefined"
            />
          </div>
          <span v-if="isRegister" class="field-hint">Mínimo 8 caracteres</span>
        </div>

        <!-- Mensajes de Error y Éxito -->
        <div v-if="session.error" class="alert-box error" role="alert">
          <AppIcon name="alert" :size="16" />
          <span>{{ session.error }}</span>
        </div>

        <div v-if="success" class="alert-box success" role="status">
          <AppIcon name="check" :size="16" />
          <span>{{ success }}</span>
        </div>

        <!-- Botón Principal -->
        <button type="submit" class="submit-btn" :disabled="session.isLoading">
          <span v-if="session.isLoading" class="spinner"></span>
          <span>
            {{
              session.isLoading
                ? 'Comprobando sesión...'
                : isRegister
                  ? 'Crear mi cuenta'
                  : 'Ingresar a mi cuenta'
            }}
          </span>
          <AppIcon v-if="!session.isLoading" name="arrow-right" :size="16" />
        </button>

        <!-- Toggle Modo -->
        <button type="button" class="toggle-link" @click="toggleMode">
          {{
            isRegister
              ? '¿Ya tienes una cuenta registrada? Inicia sesión aquí'
              : '¿Aún no tienes cuenta? Regístrate gratis'
          }}
        </button>
      </form>
    </div>
  </main>
</template>
