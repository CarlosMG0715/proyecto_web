<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { api } from '@/services/api'
import { loadNotifications, notificationDefaults, saveNotifications } from '@/services/notificationService'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import type { User } from '@/types/auth'
import { useCharacterStore } from '@/stores/characters'
import { getThemeBackground } from '@/constants/themeBackgrounds'
import { fetchSessions, logoutAllDevices, revokeSession } from '@/services/authService'
import { useRouter } from 'vue-router'
import type { DeviceSession } from '@/types/auth'
import '@/assets/styles/game-views.css'
const session = useSessionStore()
const accountName = ref(session.currentUser?.name ?? '')
const currentPassword = ref('')
const newPassword = ref('')
const accountAction = ref<'name' | 'password'>('name')
const accountBusy = ref(false)
const accountStatus = ref('')
const accountError = ref('')

function selectAccountAction(action: typeof accountAction.value) {
  accountAction.value = action
  accountStatus.value = ''
  accountError.value = ''
  currentPassword.value = ''
  newPassword.value = ''
}

async function saveAccount() {
  if (accountBusy.value) return
  const action = accountAction.value
  const payload = action === 'name' ? { action, name: accountName.value.trim() }
    : { action, password: currentPassword.value, newPassword: newPassword.value }
  accountBusy.value = true
  accountError.value = ''
  accountStatus.value = ''
  try {
    const { data } = await api.patch<{ user?: User }>('/auth/account', payload)
    if (data.user) session.setUser(data.user)
    accountStatus.value = action === 'name' ? 'Apodo actualizado.' : 'Contraseña actualizada. Cerramos tus otras sesiones.'
  } catch (cause) {
    accountError.value = (cause as { response?: { data?: { error?: string } } }).response?.data?.error
      ?? 'No pudimos guardar el cambio. Inténtalo de nuevo.'
  } finally {
    currentPassword.value = ''
    newPassword.value = ''
    accountBusy.value = false
  }
}
const characters = useCharacterStore()
const saved = ref({ ...notificationDefaults })
const preferences = ref({ ...saved.value })
const notificationReady = ref(false)
const notificationBusy = ref(false)
const groups = useGroupsStore()
const notificationGroups = computed(() => groups.groups.filter(group => !group.archivedAt))
const active = computed(() => [preferences.value.midnight, preferences.value.email, preferences.value.chat, preferences.value.inactivity].filter(Boolean).length)
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
async function loadReminderPreferences() {
  try {
    saved.value = await loadNotifications()
    preferences.value = { ...saved.value, mutedGroups: [...saved.value.mutedGroups] }
    notificationReady.value = true
  } catch {
    message.value = 'No pudimos cargar tus preferencias.'
  }
}
async function save() {
  if (!notificationReady.value || notificationBusy.value) return
  notificationBusy.value = true
  try {
    saved.value = await saveNotifications(preferences.value)
    message.value = 'Preferencias guardadas.'
  } catch {
    message.value = 'No pudimos guardar las preferencias. Intenta de nuevo.'
  } finally {
    notificationBusy.value = false
  }
}
function reset() {
  preferences.value = { ...notificationDefaults }
  message.value = 'Guarda para aplicar los valores predeterminados.'
}

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
  void loadReminderPreferences()
})



const deleteDialog = ref<HTMLDialogElement>()
const deletePassword = ref('')
const deleteError = ref('')
const deleting = ref(false)

function resetDeleteDialog() {
  deletePassword.value = ''
  deleteError.value = ''
}

async function deleteAccount() {
  if (deleting.value || !deletePassword.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await api.delete('/auth/account', { data: { password: deletePassword.value } })
    deleteDialog.value?.close()
    session.clearSession()
    await router.replace({ name: 'login' })
  } catch (cause) {
    deleteError.value = (cause as { response?: { data?: { error?: string } } }).response?.data?.error
      ?? 'No pudimos borrar tu cuenta. Inténtalo de nuevo.'
  } finally {
    deletePassword.value = ''
    deleting.value = false
  }
}

</script>
<template><div class="game-page"><div class="game-wrap">
<header class="game-header settings-theme-banner" :style="{ '--settings-art': `url('${getThemeBackground(characters.theme.id)}')` }">
  <span class="theme-ornaments" aria-hidden="true"></span>
  <h1>Configuración</h1>
  <RouterLink :to="{ name: 'perfil', hash: '#personalizar' }" class="settings-theme-link">
    <span class="settings-theme-swatch" aria-hidden="true"></span>
    <span><small>Tema activo</small><strong>{{ characters.theme.name }}</strong></span>
    <AppIcon name="chevron-right" :size="16" />
  </RouterLink>
</header>
<div class="game-grid"><div class="game-stack"><section class="game-panel">
  <div class="game-title"><h2><AppIcon name="bell" :size="19" />Recordatorios y equipo</h2></div>
  <fieldset class="notification-options" :disabled="!notificationReady || notificationBusy">
    <label class="setting"><span class="setting-copy"><strong>Antes de medianoche</strong><small>Muestra un aviso en Kordia si tienes aportes pendientes.</small></span><input v-model="preferences.midnight" type="checkbox" role="switch" /></label>
    <label class="setting"><span class="setting-copy"><strong>Recordatorio por correo</strong><small>Si tienes aportes pendientes, envía avisos a las 4, 6, 8, 10, 11 y 11:30 p. m., hora de Colombia.</small></span><input v-model="preferences.email" type="checkbox" role="switch" /></label>
    <p class="local-note">En Kordia, los avisos aparecen a 4 h, 2 h, 1 h y 30 min de medianoche.</p>
    <label class="setting"><span class="setting-copy"><strong>Conversaciones del equipo</strong><small>Desactiva para silenciar los avisos de todos los chats.</small></span><input v-model="preferences.chat" type="checkbox" role="switch" /></label>
    <details v-if="preferences.chat && notificationGroups.length" class="muted-groups">
      <summary><AppIcon name="message" :size="16" />Silenciar grupos<small>{{ preferences.mutedGroups.length }} silenciados</small></summary>
      <div class="muted-group-list">
        <label v-for="group in notificationGroups" :key="group.id" class="muted-group-card" :style="{ '--group-color': group.color }">
          <span class="muted-group-emblem"><AppIcon name="users" :size="17" /></span>
          <span class="muted-group-name">{{ group.name }}<small>{{ group.category }}</small></span>
          <input v-model="preferences.mutedGroups" type="checkbox" :value="group.id" :aria-label="'Silenciar ' + group.name" />
        </label>
      </div>
    </details>
    <label class="setting"><span class="setting-copy"><strong>Cuidar la racha del equipo</strong><small>Avisa si un equipo con racha aún tiene compañeros pendientes.</small></span><input v-model="preferences.inactivity" type="checkbox" role="switch" /></label>
  </fieldset>
</section>
<section class="game-panel account-settings">
  <header class="account-heading">
    <span class="account-emblem"><AppIcon name="user" :size="25" /></span>
    <h2>Datos de la cuenta</h2>
    <span class="account-ornament" aria-hidden="true"></span>
  </header>
  <div class="account-options" role="group" aria-label="Dato que quieres cambiar">
    <button type="button" :disabled="accountBusy" :aria-pressed="accountAction === 'name'" @click="selectAccountAction('name')"><AppIcon name="user" :size="19" />Apodo</button>
    <button type="button" :disabled="accountBusy" :aria-pressed="accountAction === 'password'" @click="selectAccountAction('password')"><AppIcon name="shield" :size="19" />Contraseña</button>
  </div>
  <form :key="accountAction" class="account-form" @submit.prevent="saveAccount">
    <label v-if="accountAction === 'name'">Apodo<input v-model="accountName" autocomplete="nickname" maxlength="80" required /></label>
    <template v-else>
      <label>Contraseña actual<input v-model="currentPassword" type="password" autocomplete="current-password" required /></label>
      <label v-if="accountAction === 'password'">Contraseña nueva<input v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required /></label>
    </template>
    <button class="game-button" type="submit" :disabled="accountBusy">{{ accountBusy ? 'Guardando…' : 'Guardar cambio' }}<AppIcon v-if="!accountBusy" name="arrow-right" :size="16" /></button>
  </form>
  <p v-if="accountStatus" class="game-muted" role="status">{{ accountStatus }}</p>
  <p v-if="accountError" class="account-error" role="alert">{{ accountError }}</p>
</section>
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

<section class="game-panel delete-account-panel">
  <div class="setting-copy"><strong>Borrar cuenta</strong><small>Elimina tu cuenta y tu progreso permanentemente.</small></div>
  <button type="button" class="game-button logout-all-button" @click="deleteDialog?.showModal()">Borrar cuenta</button>
</section>
      <dialog ref="deleteDialog" class="game-panel delete-account-dialog" aria-labelledby="delete-account-title"
        @close="resetDeleteDialog" @cancel="deleting && $event.preventDefault()">
        <form class="logout-dialog delete-account-form" @submit.prevent="deleteAccount">
          <span class="setting-icon delete-account-icon"><AppIcon name="shield" :size="22" /></span>
          <h2 id="delete-account-title">Borrar cuenta</h2>
          <p>Perderás tu cuenta y tu progreso de forma permanente.</p>
          <label for="delete-account-password">Contraseña</label>
          <input id="delete-account-password" v-model="deletePassword" type="password" autocomplete="current-password" autofocus required :disabled="deleting" />
          <p v-if="deleteError" role="alert" class="logout-error">{{ deleteError }}</p>
          <div class="logout-dialog-actions">
            <button type="button" class="game-button secondary" :disabled="deleting" @click="deleteDialog?.close()">Cancelar</button>
            <button type="submit" class="game-button logout-all-button" :disabled="deleting || !deletePassword">{{ deleting ? 'Borrando…' : 'Borrar cuenta' }}</button>
          </div>
        </form>
      </dialog>
<div class="save-bar">
  <div>
    <span class="save-dot" :class="{ dirty }"></span>
    <span>{{ dirty ? 'Tienes cambios por guardar' : 'Tus preferencias están al día' }}</span>
  </div>
  <button class="game-button" :disabled="!notificationReady || notificationBusy || !dirty" @click="save">
    <AppIcon name="check" :size="16" />Guardar preferencias
  </button>
</div>
<p v-if="message" class="save-message" role="status">{{ message }}</p>
</div>
<aside class="game-stack"><section class="game-panel control-card"><span class="control-shield"><AppIcon name="settings" :size="43" /></span><h2>Preferencias de alertas</h2><div class="control-stat"><strong>{{ active }}</strong><span>preferencias de alertas<br />activadas</span></div></section><section class="game-panel account-card"><span class="account-icon"><AppIcon name="shield" :size="24" /></span><h2>Tu cuenta en Kordia</h2><p class="game-muted">Consulta tu perfil y revisa tus compromisos y avances.</p><RouterLink :to="{ name: 'perfil' }" class="game-button secondary">Ir a mi perfil<AppIcon name="arrow-right" :size="15" /></RouterLink></section><button class="restore" @click="reset"><AppIcon name="settings" :size="14" />Restablecer valores predeterminados</button></aside></div>
</div></div></template>
<style scoped>
.settings-theme-banner {
  min-height: 136px;
  padding: 20px clamp(16px, 3vw, 30px);
  border-radius: 22px;
  background: linear-gradient(100deg, #20172bef, #20172bb5), var(--settings-art) center 52% / cover;
}
.settings-theme-banner h1 { color: #fff5ed; }
.settings-theme-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--theme-dark) 68%, #201927);
  color: #fff5ed;
}
.settings-theme-link small { display: block; margin-bottom: 3px; font-size: 10px; color: var(--theme-companion); }
.settings-theme-link strong { font-size: 14px; }
.settings-theme-swatch { width: 24px; height: 24px; border-radius: 8px; background: var(--theme-accent); }
.settings-theme-link:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 4px; }
.game-title h2{display:flex;gap:10px;align-items:center}.game-title h2 svg{color:#c8a4f3}.intro{font-size:12px;color:#b4a4c4;margin:-7px 0 20px}.setting{display:flex;align-items:center;gap:15px;padding:22px 0;border-top:1px solid #3b2f48;cursor:pointer}.setting-icon{width:46px;height:48px;border:1px solid #5d4172;border-bottom:3px solid #21142e;background:#392849;border-radius:12px;display:grid;place-items:center;color:#d0b0f5;flex-shrink:0}.amber{background:#443026;border-color:#72503a;color:#f2c18c}.green{background:#2d3e34;border-color:#4d6a50;color:#bed6a3}.setting-copy{flex:1;min-width:0}.setting-copy strong{display:block;font-size:13px;margin-bottom:7px}.setting-copy small{display:block;font-size:11px;line-height:1.7;color:#b9a9c8}.setting input{appearance:none;-webkit-appearance:none;width:46px;height:27px;border:1px solid #665072;border-bottom:3px solid #130d1c;background:#312739;border-radius:9px;flex-shrink:0;position:relative;cursor:pointer;transition:background .2s}.setting input:before{content:'';width:17px;height:17px;position:absolute;left:3px;top:3px;border-radius:5px;background:#9b87ab;transition:transform .2s,background .2s}.setting input:checked{background:#8462a8;border-color:#ba92e2}.setting input:checked:before{transform:translateX(20px);background:#f0dfff}.local-note{display:flex;gap:8px;align-items:flex-start;font-size:10px;line-height:1.8;color:#a797b7;margin:12px 0 0}.local-note svg{flex-shrink:0;margin-top:3px}.motion-preview{display:flex;gap:15px;align-items:center;background:#2c2235;border:1px dashed #594065;padding:15px;border-radius:12px}.motion-preview strong{font-size:12px}.motion-preview p{font-size:10px;color:#bda7cc;line-height:1.7}.preview-label{font-size:7px;letter-spacing:.1em;color:#c6a9d8;margin-left:auto}.paused :deep(svg){animation:none!important}.save-bar{display:flex;justify-content:space-between;align-items:center;gap:15px}.save-bar>div{display:flex;gap:8px;align-items:center;font-size:10px;color:#b9a5ca}.save-dot{width:6px;height:6px;background:#b2ce94;border-radius:50%}.save-dot.dirty{background:#eabd80}.save-message{margin:-9px 0 0;font-size:12px;line-height:1.6;color:#d2b2f2}.control-card{text-align:center;background:#30233d;border-color:#614573}.control-shield{display:grid;place-items:center;width:96px;height:104px;margin:5px auto 25px;background:#9973bd;color:#efdaff;clip-path:polygon(50% 0,95% 23%,95% 73%,50% 100%,5% 73%,5% 23%)}.control-card h2{font-size:23px;margin:14px 0}.control-card .game-kicker{font-size:8px}.control-stat{display:flex;gap:12px;justify-content:center;align-items:center;border-top:1px solid #594069;margin-top:24px;padding-top:20px;text-align:left}.control-stat strong{font-size:35px;color:#e1c3fa}.control-stat span{font-size:10px;line-height:1.7;color:#cbb2dd}.account-icon{color:#bbd29f}.account-card h2{font-size:15px;margin:13px 0}.account-card .game-button{margin-top:20px;width:100%;font-size:11px}.restore{display:flex;align-items:center;justify-content:center;gap:7px;font-size:9px;background:none;border:0;color:#b19ac3;padding:7px}.restore:hover{color:#ead1ff}@media(max-width:650px){.setting{gap:10px}.setting-icon{width:36px;height:40px}.setting-copy strong{font-size:12px}.setting-copy small{font-size:10px}.save-bar{flex-wrap:wrap}.save-bar .game-button{width:100%}.preview-label{display:none}}
.save-bar{margin-top:18px}.save-message{margin:8px 0 0}.logout-all-button{background:#a9445d!important;border-color:#df8093!important;color:#fff!important}.logout-all-button:hover{background:#bd526b!important}.logout-all-trigger{display:flex;width:100%;min-height:58px;justify-content:center;margin-top:18px;font-size:15px;font-weight:700}.logout-dialog-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:#100b18d9}.logout-dialog{width:min(100%,430px);box-shadow:0 24px 80px #0009}.logout-dialog h2{margin:0 0 10px;font-size:20px}.logout-dialog>label{display:block;margin:20px 0 7px;font-size:12px}.logout-dialog>input{width:100%;padding:12px 14px;border:1px solid #665072;border-radius:10px;background:#211a29;color:#fff;font:inherit}.logout-dialog>input:focus{outline:2px solid #c8a4f3;outline-offset:2px}.logout-error{margin-top:10px;color:#ff9eaf;font-size:12px}.logout-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}.logout-dialog-actions .game-button:disabled{opacity:.6;cursor:wait}@media(max-width:650px){.logout-all-trigger{font-size:13px}.logout-dialog-actions{flex-direction:column-reverse}.logout-dialog-actions .game-button{width:100%}}
.account-settings { --account-accent: var(--personal-selected-accent, #b9a2f1); }
.account-heading {
  position:relative; isolation:isolate; overflow:hidden; display:flex; align-items:center; gap:14px;
  min-height:96px; padding:16px; margin-bottom:16px; border-radius:15px;
  background:linear-gradient(100deg,#231a30f5 5%,#231a30bd 63%,#231a304f),var(--personal-art) center 45% / cover;
}
.account-heading h2 { font-size:clamp(1rem, 3vw, 1.4rem); }
.account-emblem { display:grid; place-items:center; flex:none; width:46px; height:49px; border-radius:13px; background:var(--account-accent); color:#21172a; transform:rotate(-6deg); box-shadow:0 4px var(--theme-dark); }
.account-ornament { position:absolute; z-index:-1; right:6%; top:10%; color:var(--theme-companion,#eed8af); font-size:2rem; opacity:.75; }
.account-ornament::before { content:var(--theme-motif,'✧'); }
.account-ornament::after { content:var(--theme-motif-small,'✦'); font-size:.8rem; margin-left:6px; }
.account-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:14px; }
.account-options button { display:grid; justify-items:center; gap:6px; border:0; border-radius:12px; padding:10px 3px; background:color-mix(in srgb,var(--account-accent) 15%,#2a2134); color:#f0e7f5; font-size:clamp(.68rem, 2.3vw, .83rem); cursor:pointer; }
.account-options button svg { color:var(--account-accent); }
.account-options button[aria-pressed="true"] { background:color-mix(in srgb,var(--account-accent) 71%,#f5e6ee); color:#21182b; box-shadow:0 3px var(--theme-dark); }
.account-options button[aria-pressed="true"] svg { color:inherit; }
.account-form { display:grid; gap:12px; padding:15px; border-radius:14px; background:color-mix(in srgb,var(--account-accent) 9%,#20192b); }
.account-form label { display:grid; gap:6px; font-size:.85rem; }
.account-form input { width:100%; border:0; border-radius:9px; padding:11px; color:inherit; background:#181422; font:inherit; }
.account-form button { justify-self:start; }
.account-settings [role="status"], .account-error { margin-top:12px; }
.account-error { color:#ffb2bd; font-size:.85rem; }
.notification-options{padding:0;border:0;margin:0;min-width:0}.notification-options select{background:#30253c;color:inherit;border:0;border-radius:10px;padding:10px}
.muted-groups{margin:0 0 14px 60px;padding:12px 14px;border-radius:16px;background:linear-gradient(110deg,#35283f,#2b2133);position:relative;overflow:hidden}
.muted-groups:after{content:'';position:absolute;right:-42px;top:-66px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--personal-selected-accent,#bb91e9) 22%,transparent),transparent 70%);pointer-events:none}
.muted-groups summary{position:relative;z-index:1;display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;color:#f0defb;font-weight:800}
.muted-groups summary::-webkit-details-marker{display:none}.muted-groups summary:after{content:'⌄';margin-left:auto;font-size:18px;color:#d6b8ef}.muted-groups[open] summary:after{content:'⌃'}
.muted-groups summary small{font-size:10px;font-weight:600;color:#c5afd5}
.muted-group-list{position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:8px;margin-top:12px}
.muted-group-card{display:flex;align-items:center;gap:10px;min-width:0;padding:9px 11px;border-radius:13px;background:#211a2b;box-shadow:inset 3px 0 var(--group-color,#b891e6);cursor:pointer}
.muted-group-emblem{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:10px;background:color-mix(in srgb,var(--group-color,#b891e6) 23%,#241b2c);color:var(--group-color,#c8a4f3)}
.muted-group-name{min-width:0;flex:1;overflow-wrap:anywhere;font-size:12px;font-weight:800}.muted-group-name small{display:block;margin-top:2px;color:#aa98b9;font-size:10px;font-weight:500}
.muted-group-card input{appearance:none;display:grid;place-items:center;flex:none;width:22px;height:22px;margin:0;border-radius:7px;background:#372b41;cursor:pointer}
.muted-group-card input:checked{background:var(--group-color,#b891e6)}
.muted-group-card input:after{content:'✓';color:#211a2b;font-weight:900;transform:scale(0);transition:transform .14s}
.muted-group-card input:checked:after{transform:scale(1)}
@media(max-width:650px){.muted-groups{margin-left:0}.muted-group-list{grid-template-columns:1fr}}
.delete-account-panel{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
.delete-account-dialog{width:min(430px,calc(100% - 32px));box-sizing:border-box;margin:auto;border:0;color:var(--text,#fff4ff)}
.delete-account-dialog::backdrop{background:#100b18d9}
.delete-account-form{width:auto;box-shadow:none}
.delete-account-form>input{box-sizing:border-box}
.delete-account-form>p{font-size:13px}
.delete-account-icon{margin-bottom:14px;background:#51283e;border:0;color:#ffb8cb}
</style>
