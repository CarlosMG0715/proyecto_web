<script setup lang="ts">
// pantalla de acceso y alta; valida campos y delega registro/login al servicio de autenticacion.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconoAplicacion from '@/components/ui/IconoAplicacion.vue'
import { usarAlmacenSesion } from '@/stores/sesion'
import { login, register } from '@/services/servicioAcceso'
import kordiaLogo from '@/assets/logo-kordia.png'

const session = usarAlmacenSesion()
const router = useRouter()
const route = useRoute()

const mode = ref<'login' | 'register'>('login')
const name = ref('')
const email = ref('')
const password = ref('')
const success = ref<string | null>(null)

const esRegistro = computed(() => mode.value === 'register')

function toggleMode(): void {
  mode.value = esRegistro.value ? 'login' : 'register'
  session.setError(null)
  success.value = null
}

function getRedirect(): string {
  const redirect = route.query.redirect
  if (
    typeof redirect === 'string' &&
    redirect.startsWith('/') &&
    !redirect.startsWith('//')
  ) {
    return redirect
  }
  return '/app/perfil'
}

async function onSubmit(): Promise<void> {
  if (session.estaCargando) return
  success.value = null
  const credentials = { email: email.value, password: password.value }
  try {
    if (esRegistro.value) {
      await register({ name: name.value, ...credentials })
      mode.value = 'login'
      success.value = 'Cuenta creada. Iniciando sesión…'
    }

    await login(credentials)
    await router.push(getRedirect())
  } catch (error) {
    const message =
      session.error ?? (error instanceof Error ? error.message : '')
    if (
      esRegistro.value &&
      /correo electrónico ya está registrado/i.test(message)
    ) {
      mode.value = 'login'
      session.setError(null)
      success.value =
        'Esta cuenta ya está registrada. Ingresa tu contraseña para iniciar sesión.'
    }
  }
}
</script>

<template>
  <main class="login-wrapper">
    <RouterLink to="/" class="aesthetic-back-arrow" aria-label="Volver">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    </RouterLink>

    <div class="login-card panel">
      <div class="brand-header">
        <img :src="kordiaLogo" alt="Kordia Logo" class="login-brand-logo" />
        <h1>
          {{ esRegistro ? 'Crea tu cuenta en Kordia' : '¡Hola de nuevo!' }}
        </h1>
        <p>
          {{
            esRegistro
              ? 'Únete a tu equipo y mantén la racha de hábitos diaria.'
              : 'Ingresa para revisar el estado de tu equipo y tu racha de hoy.'
          }}
        </p>
      </div>

      <div class="tabs-row">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: !esRegistro }"
          @click="mode = 'login'"
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: esRegistro }"
          @click="mode = 'register'"
        >
          Registrarse
        </button>
      </div>

      <form class="login-form" @submit.prevent="onSubmit">
        <div v-if="esRegistro" class="field">
          <label for="reg-name">Apodo</label>
          <div class="input-wrap">
            <span class="input-icon"><IconoAplicacion name="user" :size="16" /></span>
            <input
              id="reg-name"
              v-model="name"
              type="text"
              placeholder="Ej: ValeRacha"
              autocomplete="nickname"
              required
              minlength="1"
              maxlength="80"
            />
          </div>
        </div>

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

        <div class="field">
          <label for="user-pass">Contraseña</label>
          <div class="input-wrap">
            <span class="input-icon"><IconoAplicacion name="shield" :size="16" /></span>
            <input
              id="user-pass"
              v-model="password"
              type="password"
              placeholder="••••••••"
              :autocomplete="esRegistro ? 'new-password' : 'current-password'"
              required
              :minlength="esRegistro ? 8 : undefined"
            />
          </div>
          <span v-if="esRegistro" class="field-hint">Mínimo 8 caracteres</span>
        </div>

        <div v-if="session.error" class="alert-box error" role="alert">
          <IconoAplicacion name="alert" :size="16" />
          <span>{{ session.error }}</span>
        </div>

        <div v-if="success" class="alert-box success" role="status">
          <IconoAplicacion name="check" :size="16" />
          <span>{{ success }}</span>
        </div>

        <button type="submit" class="submit-btn" :disabled="session.estaCargando">
          <span v-if="session.estaCargando" class="spinner"></span>
          <span>
            {{
              session.estaCargando
                ? 'Comprobando sesión...'
                : esRegistro
                  ? 'Crear mi cuenta'
                  : 'Ingresar a mi cuenta'
            }}
          </span>
          <IconoAplicacion v-if="!session.estaCargando" name="arrow-right" :size="16" />
        </button>

        <button type="button" class="toggle-link" @click="toggleMode">
          {{
            esRegistro
              ? '¿Ya tienes una cuenta registrada? Inicia sesión aquí'
              : '¿Aún no tienes cuenta? Regístrate gratis'
          }}
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped src="@/assets/styles/components/VistaAcceso.css"></style>
