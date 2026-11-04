<script setup lang="ts">
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
<template><div class="game-page"><div class="game-wrap">
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
<style scoped>
.game-title h2{display:flex;gap:10px;align-items:center}.game-title h2 svg{color:#c8a4f3}.intro{font-size:12px;color:#b4a4c4;margin:-7px 0 20px}.setting{display:flex;align-items:center;gap:15px;padding:22px 0;border-top:1px solid #3b2f48;cursor:pointer}.setting-icon{width:46px;height:48px;border:1px solid #5d4172;border-bottom:3px solid #21142e;background:#392849;border-radius:12px;display:grid;place-items:center;color:#d0b0f5;flex-shrink:0}.amber{background:#443026;border-color:#72503a;color:#f2c18c}.green{background:#2d3e34;border-color:#4d6a50;color:#bed6a3}.setting-copy{flex:1;min-width:0}.setting-copy strong{display:block;font-size:13px;margin-bottom:7px}.setting-copy small{display:block;font-size:11px;line-height:1.7;color:#b9a9c8}.setting input{appearance:none;-webkit-appearance:none;width:46px;height:27px;border:1px solid #665072;border-bottom:3px solid #130d1c;background:#312739;border-radius:9px;flex-shrink:0;position:relative;cursor:pointer;transition:background .2s}.setting input:before{content:'';width:17px;height:17px;position:absolute;left:3px;top:3px;border-radius:5px;background:#9b87ab;transition:transform .2s,background .2s}.setting input:checked{background:#8462a8;border-color:#ba92e2}.setting input:checked:before{transform:translateX(20px);background:#f0dfff}.local-note{display:flex;gap:8px;align-items:flex-start;font-size:10px;line-height:1.8;color:#a797b7;margin:12px 0 0}.local-note svg{flex-shrink:0;margin-top:3px}.motion-preview{display:flex;gap:15px;align-items:center;background:#2c2235;border:1px dashed #594065;padding:15px;border-radius:12px}.motion-preview strong{font-size:12px}.motion-preview p{font-size:10px;color:#bda7cc;line-height:1.7}.preview-label{font-size:7px;letter-spacing:.1em;color:#c6a9d8;margin-left:auto}.paused :deep(svg){animation:none!important}.save-bar{display:flex;justify-content:space-between;align-items:center;gap:15px}.save-bar>div{display:flex;gap:8px;align-items:center;font-size:10px;color:#b9a5ca}.save-dot{width:6px;height:6px;background:#b2ce94;border-radius:50%}.save-dot.dirty{background:#eabd80}.save-message{margin:-9px 0 0;font-size:12px;line-height:1.6;color:#d2b2f2}.control-card{text-align:center;background:#30233d;border-color:#614573}.control-shield{display:grid;place-items:center;width:96px;height:104px;margin:5px auto 25px;background:#9973bd;color:#efdaff;clip-path:polygon(50% 0,95% 23%,95% 73%,50% 100%,5% 73%,5% 23%)}.control-card h2{font-size:23px;margin:14px 0}.control-card .game-kicker{font-size:8px}.control-stat{display:flex;gap:12px;justify-content:center;align-items:center;border-top:1px solid #594069;margin-top:24px;padding-top:20px;text-align:left}.control-stat strong{font-size:35px;color:#e1c3fa}.control-stat span{font-size:10px;line-height:1.7;color:#cbb2dd}.account-icon{color:#bbd29f}.account-card h2{font-size:15px;margin:13px 0}.account-card .game-button{margin-top:20px;width:100%;font-size:11px}.restore{display:flex;align-items:center;justify-content:center;gap:7px;font-size:9px;background:none;border:0;color:#b19ac3;padding:7px}.restore:hover{color:#ead1ff}@media(max-width:650px){.setting{gap:10px}.setting-icon{width:36px;height:40px}.setting-copy strong{font-size:12px}.setting-copy small{font-size:10px}.save-bar{flex-wrap:wrap}.save-bar .game-button{width:100%}.preview-label{display:none}}
.save-bar{margin-top:18px}.save-message{margin:8px 0 0}.logout-all-button{background:#a9445d!important;border-color:#df8093!important;color:#fff!important}.logout-all-button:hover{background:#bd526b!important}.logout-all-trigger{display:flex;width:100%;min-height:58px;justify-content:center;margin-top:18px;font-size:15px;font-weight:700}.logout-dialog-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:#100b18d9}.logout-dialog{width:min(100%,430px);box-shadow:0 24px 80px #0009}.logout-dialog h2{margin:0 0 10px;font-size:20px}.logout-dialog>label{display:block;margin:20px 0 7px;font-size:12px}.logout-dialog>input{width:100%;padding:12px 14px;border:1px solid #665072;border-radius:10px;background:#211a29;color:#fff;font:inherit}.logout-dialog>input:focus{outline:2px solid #c8a4f3;outline-offset:2px}.logout-error{margin-top:10px;color:#ff9eaf;font-size:12px}.logout-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}.logout-dialog-actions .game-button:disabled{opacity:.6;cursor:wait}@media(max-width:650px){.logout-all-trigger{font-size:13px}.logout-dialog-actions{flex-direction:column-reverse}.logout-dialog-actions .game-button{width:100%}}
</style>
