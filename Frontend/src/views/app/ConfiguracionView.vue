<script setup lang="ts">
import '@/assets/styles/views/configuracion.css'
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import { fetchSessions, logoutAllDevices, revokeSession } from '@/services/authService'
import { useRouter } from 'vue-router'
import type { DeviceSession } from '@/types/auth'
import '@/assets/styles/game-views.css'
const key = 'kordia:preferences'
const defaults = { midnight: true, chat: true, inactivity: true, motion: true }
function readPreferences() {
  try { const saved = JSON.parse(localStorage.getItem(key) ?? '{}'); return Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, typeof saved?.[k] === 'boolean' ? saved[k] : v])) as typeof defaults } catch { return { ...defaults } }
}
const saved = ref(readPreferences())
const preferences = ref({ ...saved.value })
const message = ref('')
const sessions = ref<DeviceSession[]>([])
const isLoadingSessions = ref(false)
const sessionsError = ref('')
const revokingSessionId = ref('')
const router = useRouter()
const showLogoutAllDialog = ref(false)
const logoutAllPassword = ref('')
const logoutAllError = ref('')
const isLoggingOutAll = ref(false)
const dirty = computed(() => JSON.stringify(saved.value) !== JSON.stringify(preferences.value))
const active = computed(() => [preferences.value.midnight, preferences.value.chat, preferences.value.inactivity].filter(Boolean).length)
function save() {
  try { localStorage.setItem(key, JSON.stringify(preferences.value)); saved.value = { ...preferences.value }; document.documentElement.classList.toggle('kordia-reduce-motion', !preferences.value.motion); message.value = 'Preferencias guardadas en este navegador.' } catch { message.value = 'No se pudieron guardar las preferencias. Inténtalo de nuevo.' }
}
function reset() { preferences.value = { ...defaults }; message.value = 'Valores predeterminados listos. Guarda para aplicarlos.' }


async function loadSessions() {
  isLoadingSessions.value = true
  sessionsError.value = ''

  try {
    sessions.value = await fetchSessions()
  } catch {
    sessionsError.value = 'No pudimos cargar tus sesiones.'
  } finally {
    isLoadingSessions.value = false
  }
}

async function closeDevice(session: DeviceSession) {
  if (session.isCurrent || revokingSessionId.value) return

  if (!window.confirm('¿Cerrar la sesión en este dispositivo?')) return

  revokingSessionId.value = session.id
  sessionsError.value = ''

  try {
    await revokeSession(session.id)
    await loadSessions()
  } catch {
    sessionsError.value = 'No pudimos cerrar esa sesión. Inténtalo de nuevo.'
  } finally {
    revokingSessionId.value = ''
  }
}

async function confirmLogoutAll() {
  if (!logoutAllPassword.value || isLoggingOutAll.value) return

  isLoggingOutAll.value = true
  logoutAllError.value = ''

  try {
    await logoutAllDevices(logoutAllPassword.value)
    await router.push({ name: 'login' })
  } catch {
    logoutAllError.value =
      'No pudimos cerrar las sesiones. Revisa tu contraseña e inténtalo de nuevo.'
  } finally {
    isLoggingOutAll.value = false
  }
}

onMounted(() => {
  void loadSessions()
})



</script>
<template><div class="game-page configuracion-view"><div class="game-wrap">
<header class="game-header">
<div><h1>Configuración</h1>
</div><span class="game-chip">
<AppIcon name="settings" :size="16" />Centro de controles</span></header>
<div class="game-grid"><div class="game-stack"><section class="game-panel"><div class="game-title"><h2><AppIcon name="bell" :size="19" />Recordatorios y equipo</h2><small>{{ active }} / 3 activados</small></div><label class="setting"><span class="setting-icon amber"><AppIcon name="moon" :size="22" /></span><span class="setting-copy"><strong>Antes de que termine el día</strong><small>Recordatorio a las 22:00 cuando tengas hábitos pendientes.</small></span><input v-model="preferences.midnight" type="checkbox" role="switch" aria-label="Recordatorio antes de medianoche" /></label><label class="setting"><span class="setting-icon"><AppIcon name="message" :size="22" /></span><span class="setting-copy"><strong>Conversaciones del equipo</strong><small>Mensajes nuevos de los grupos de los que formas parte.</small></span><input v-model="preferences.chat" type="checkbox" role="switch" aria-label="Notificaciones del chat" /></label><label class="setting"><span class="setting-icon green"><AppIcon name="shield" :size="22" /></span><span class="setting-copy"><strong>Cuidar la racha del equipo</strong><small>Alerta cuando la salud del grupo baje de 80 puntos.</small></span><input v-model="preferences.inactivity" type="checkbox" role="switch" aria-label="Alertas por inactividad" /></label><p class="local-note"><AppIcon name="monitor" :size="14" />Estas preferencias se guardan en este navegador. El envío de alertas requiere conectar el servicio de notificaciones.</p></section>
<section class="game-panel"><div class="game-title"><h2><AppIcon name="activity" :size="19" />Movimiento y efectos</h2></div><label class="setting"><span class="setting-icon"><AppIcon name="flame" :size="22" /></span><span class="setting-copy"><strong>Animaciones de la interfaz</strong><small>Dale movimiento a las llamas y a los estados de progreso.</small></span><input v-model="preferences.motion" type="checkbox" role="switch" aria-label="Animaciones de la interfaz" /></label><div class="motion-preview"><StreakFlame :size="65" :class="{ paused: !preferences.motion }" /><div><strong>{{ preferences.motion ? 'Animaciones activas' : 'Animaciones desactivadas' }}</strong><p>Vista previa de los efectos de racha.</p></div><span class="preview-label">VISTA PREVIA</span></div></section>
<section class="game-panel">
  <div class="game-title">
    <h2><AppIcon name="monitor" :size="19" />Sesiones abiertas</h2>
    <small>{{ sessions.length }} activas</small>
  </div>

  <p v-if="isLoadingSessions" class="game-muted">
    Cargando sesiones…
  </p>

  <p v-else-if="sessionsError" class="game-muted">
    {{ sessionsError }}
  </p>

  <p v-else-if="sessions.length === 0" class="game-muted">
    No encontramos sesiones abiertas.
  </p>

  <article
    v-for="session in sessions"
    v-else
    :key="session.id"
    class="setting"
  >
    <span class="setting-icon">
      <AppIcon name="monitor" :size="22" />
    </span>

    <span class="setting-copy">
      <strong>
        {{ session.isCurrent ? 'Este dispositivo' : 'Otro dispositivo' }}
      </strong>
      <small>{{ session.userAgent || 'Navegador no identificado' }}</small>
      <small>Inicio: {{ new Date(session.createdAt).toLocaleString() }}</small>
    </span>

    <button
      v-if="!session.isCurrent"
      type="button"
      class="game-button secondary"
      :disabled="revokingSessionId === session.id"
      @click="closeDevice(session)"
    >
      {{ revokingSessionId === session.id ? 'Cerrando…' : 'Cerrar sesión' }}
    </button>
  </article>

  <button
    type="button"
    class="game-button logout-all-button logout-all-trigger"
    @click="showLogoutAllDialog = true"
  >
    Cerrar sesión en todos los dispositivos
  </button>

  <div
    v-if="showLogoutAllDialog"
    class="logout-dialog-backdrop"
    @click.self="showLogoutAllDialog = false"
  >
    <form
      class="logout-dialog game-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-all-title"
      @submit.prevent="confirmLogoutAll"
    >
      <h2 id="logout-all-title">Confirma tu contraseña</h2>
      <p class="game-muted">
        Esto cerrará tu cuenta en todos los dispositivos, incluido este.
      </p>

      <label for="logout-all-password">Contraseña</label>
      <input
        id="logout-all-password"
        v-model="logoutAllPassword"
        type="password"
        autocomplete="current-password"
        required
      />

      <p v-if="logoutAllError" class="logout-error" role="alert">
        {{ logoutAllError }}
      </p>

      <div class="logout-dialog-actions">
        <button
          type="button"
          class="game-button secondary"
          :disabled="isLoggingOutAll"
          @click="showLogoutAllDialog = false; logoutAllPassword = ''; logoutAllError = ''"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="game-button logout-all-button"
          :disabled="isLoggingOutAll || !logoutAllPassword"
        >
          {{ isLoggingOutAll ? 'Cerrando…' : 'Confirmar cierre' }}
        </button>
      </div>
    </form>
  </div>
</section>

<div class="save-bar">
  <div>
    <span class="save-dot" :class="{ dirty }"></span>
    <span>{{ dirty ? 'Tienes cambios por guardar' : 'Tus preferencias están al día' }}</span>
  </div>
  <button class="game-button" @click="save">
    <AppIcon name="check" :size="16" />Guardar preferencias
  </button>
</div>
<p v-if="message" class="save-message" role="status">{{ message }}</p>
</div>
<aside class="game-stack"><section class="game-panel control-card"><span class="control-shield"><AppIcon name="settings" :size="43" /></span><h2>Preferencias de alertas</h2><div class="control-stat"><strong>{{ active }}</strong><span>preferencias de alertas<br />activadas</span></div></section><section class="game-panel account-card"><span class="account-icon"><AppIcon name="shield" :size="24" /></span><h2>Tu cuenta en Kordia</h2><p class="game-muted">Consulta tu perfil y revisa tus compromisos y avances.</p><RouterLink :to="{ name: 'perfil' }" class="game-button secondary">Ir a mi perfil<AppIcon name="arrow-right" :size="15" /></RouterLink></section><button class="restore" @click="reset"><AppIcon name="settings" :size="14" />Restablecer valores predeterminados</button></aside></div>
</div></div></template>
