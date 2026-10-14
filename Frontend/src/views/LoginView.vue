<script setup lang="ts">
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

<style scoped>
.login-wrapper {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
  background-color: #0b0914;
  background-image:
    linear-gradient(180deg, rgba(11, 9, 20, 0.82) 0%, rgba(11, 9, 20, 0.92) 100%),
    url('@/assets/kordia_landing_bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.login-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 440px;
  padding: 2.2rem 2rem;
  background: rgba(21, 19, 31, 0.88);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg);
  box-shadow:
    0 30px 80px -20px rgba(0, 0, 0, 0.85),
    0 0 40px rgba(139, 92, 246, 0.18);
}

/* Flecha estética para volver */
.aesthetic-back-arrow {
  position: absolute;
  top: 1.8rem;
  left: 1.8rem;
  z-index: 10;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(21, 19, 31, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #e5e5eb;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.6);
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  text-decoration: none;
}

.aesthetic-back-arrow:hover {
  background: rgba(139, 92, 246, 0.25);
  border-color: rgba(139, 92, 246, 0.55);
  color: #ffffff;
  transform: translateX(-4px);
  box-shadow: 0 10px 30px -4px rgba(139, 92, 246, 0.5);
}

/* Marca */
.brand-header {
  text-align: center;
  margin-bottom: 1.6rem;
}

.login-brand-logo {
  width: 76px;
  height: 76px;
  object-fit: contain;
  margin: 0 auto 1.1rem;
  display: block;
  filter: drop-shadow(0 0 20px rgba(249, 115, 22, 0.65));
}

.brand-header h1 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
}

.brand-header p {
  margin: 0.4rem auto 0;
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.4;
  max-width: 320px;
}

/* Tabs */
.tabs-row {
  display: flex;
  padding: 0.3rem;
  border-radius: var(--radius);
  background: var(--bg);
  border: 1px solid var(--border);
  margin-bottom: 1.5rem;
}

.tab-btn {
  flex: 1;
  padding: 0.55rem;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: var(--surface-2);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

/* Formulario e Inputs con ALTO CONTRASTE */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-soft); /* Color claro y diferenciado */
  letter-spacing: 0.02em;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.85rem;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 700;
  pointer-events: none;
  display: grid;
  place-items: center;
}

/* AQUÍ ESTÁ LA SOLUCIÓN DEL CONTRASTE: */
.input-wrap input {
  width: 100%;
  padding: 0.75rem 0.9rem 0.75rem 2.4rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: #110f1a; /* Fondo oscuro marcado */
  color: #ffffff !important; /* TEXTO BLANCO NÍTIDO Y RESALTADO */
  font-size: 0.92rem;
  font-weight: 500;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.input-wrap input::placeholder {
  color: #635f7d; /* Placeholder gris suave que no confunde */
}

.input-wrap input:focus {
  border-color: var(--primary);
  background: #151322;
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.field-hint {
  font-size: 0.72rem;
  color: var(--muted);
}

/* Alertas */
.alert-box {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  line-height: 1.35;
}

.alert-box.error {
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: #fb7185;
}

.alert-box.success {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #4ade80;
}

/* Botón Submit */
.submit-btn {
  margin-top: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  border: none;
  border-radius: var(--radius);
  font-size: 0.92rem;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #9f7aea, var(--primary-strong));
  box-shadow: 0 8px 24px -6px rgba(124, 58, 237, 0.7);
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px -6px rgba(124, 58, 237, 0.85);
  filter: brightness(1.05);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Toggle link */
.toggle-link {
  margin-top: 0.3rem;
  background: transparent;
  border: none;
  color: #a78bfa;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
  transition: color 0.15s;
}

.toggle-link:hover {
  color: #c4b5fd;
  text-decoration: underline;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>