<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import '@/assets/styles/views/configuracion.css'
import '@/assets/styles/game-views.css'

const key = 'kordia:preferences'
const defaults = { midnight: true, chat: true, inactivity: true, motion: true }
function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}')
    return Object.fromEntries(
      Object.entries(defaults).map(([k, value]) => [
        k,
        typeof saved?.[k] === 'boolean' ? saved[k] : value,
      ]),
    ) as typeof defaults
  } catch {
    return { ...defaults }
  }
}
const saved = ref(readPreferences())
const preferences = ref({ ...saved.value })
const message = ref('')
const dirty = computed(() => JSON.stringify(saved.value) !== JSON.stringify(preferences.value))
const active = computed(
  () =>
    [
      preferences.value.midnight,
      preferences.value.chat,
      preferences.value.inactivity,
    ].filter(Boolean).length,
)
function save() {
  try {
    localStorage.setItem(key, JSON.stringify(preferences.value))
    saved.value = { ...preferences.value }
    document.documentElement.classList.toggle(
      'kordia-reduce-motion',
      !preferences.value.motion,
    )
    message.value = 'Preferencias guardadas en este navegador.'
  } catch {
    message.value = 'No se pudieron guardar las preferencias. Inténtalo de nuevo.'
  }
}
function reset() {
  preferences.value = { ...defaults }
  message.value = 'Valores predeterminados listos. Guarda para aplicarlos.'
}
</script>
<template>
<div
  class="game-page configuracion-view">
  <div
    class="game-wrap">
    <header
      class="game-header">
      <div>
        <h1>
          Configuración
        </h1>
      </div>
      <span
        class="game-chip">
        <AppIcon
          name="settings"
          :size="16" />
        Centro de controles
      </span>
    </header>
    <div
      class="game-grid">
      <div
        class="game-stack">
        <section
          class="game-panel">
          <div
            class="game-title">
            <h2>
              <AppIcon
                name="bell"
                :size="19" />
              Recordatorios y equipo
            </h2>
            <small>
              {{ active }}
              / 3 activados
            </small>
          </div>
          <label
            class="setting">
            <span
              class="setting-icon amber">
              <AppIcon
                name="moon"
                :size="22" />
            </span>
            <span
              class="setting-copy">
              <strong>
                Antes de que termine el día
              </strong>
              <small>
                Recordatorio a las 22:00 cuando tengas hábitos pendientes.
              </small>
            </span>
            <input
              v-model="preferences.midnight"
              type="checkbox"
              role="switch"
              aria-label="Recordatorio antes de medianoche" />
          </label>
          <label
            class="setting">
            <span
              class="setting-icon">
              <AppIcon
                name="message"
                :size="22" />
            </span>
            <span
              class="setting-copy">
              <strong>
                Conversaciones del equipo
              </strong>
              <small>
                Mensajes nuevos de los grupos de los que formas parte.
              </small>
            </span>
            <input
              v-model="preferences.chat"
              type="checkbox"
              role="switch"
              aria-label="Notificaciones del chat" />
          </label>
          <label
            class="setting">
            <span
              class="setting-icon green">
              <AppIcon
                name="shield"
                :size="22" />
            </span>
            <span
              class="setting-copy">
              <strong>
                Cuidar la racha del equipo
              </strong>
              <small>
                Alerta cuando la salud del grupo baje de 80 puntos.
              </small>
            </span>
            <input
              v-model="preferences.inactivity"
              type="checkbox"
              role="switch"
              aria-label="Alertas por inactividad" />
          </label>
          <p
            class="local-note">
            <AppIcon
              name="monitor"
              :size="14" />
            Estas preferencias se guardan en este navegador. El envío de alertas requiere conectar el servicio de notificaciones.
          </p>
        </section>
        <section
          class="game-panel">
          <div
            class="game-title">
            <h2>
              <AppIcon
                name="activity"
                :size="19" />
              Movimiento y efectos
            </h2>
          </div>
          <label
            class="setting">
            <span
              class="setting-icon">
              <AppIcon
                name="flame"
                :size="22" />
            </span>
            <span
              class="setting-copy">
              <strong>
                Animaciones de la interfaz
              </strong>
              <small>
                Dale movimiento a las llamas y a los estados de progreso.
              </small>
            </span>
            <input
              v-model="preferences.motion"
              type="checkbox"
              role="switch"
              aria-label="Animaciones de la interfaz" />
          </label>
          <div
            class="motion-preview">
            <StreakFlame
              :size="65"
              :class="{ paused: !preferences.motion }" />
            <div>
              <strong>
                {{ preferences.motion ? 'Animaciones activas' : 'Animaciones desactivadas' }}
              </strong>
              <p>
                Vista previa de los efectos de racha.
              </p>
            </div>
            <span
              class="preview-label">
              VISTA PREVIA
            </span>
          </div>
        </section>
        <div
          class="save-bar">
          <div>
            <span
              class="save-dot"
              :class="{ dirty }">
            </span>
            <span>
              {{ dirty ? 'Tienes cambios por guardar' : 'Tus preferencias están al día' }}
            </span>
          </div>
          <button
            class="game-button"
            @click="save">
            <AppIcon
              name="check"
              :size="16" />
            Guardar preferencias
          </button>
        </div>
        <p
          v-if="message"
          class="save-message"
          role="status">
          {{ message }}
        </p>
      </div>
      <aside
        class="game-stack">
        <section
          class="game-panel control-card">
          <span
            class="control-shield">
            <AppIcon
              name="settings"
              :size="43" />
          </span>
          <h2>
            Preferencias de alertas
          </h2>
          <div
            class="control-stat">
            <strong>
              {{ active }}
            </strong>
            <span>
              preferencias de alertas
              <br />
              activadas
            </span>
          </div>
        </section>
        <section
          class="game-panel account-card">
          <span
            class="account-icon">
            <AppIcon
              name="shield"
              :size="24" />
          </span>
          <h2>
            Tu cuenta en Kordia
          </h2>
          <p
            class="game-muted">
            Consulta tu perfil y revisa tus compromisos y avances.
          </p>
          <RouterLink
            :to="{ name: 'perfil' }"
            class="game-button secondary">
            Ir a mi perfil
            <AppIcon
              name="arrow-right"
              :size="15" />
          </RouterLink>
        </section>
        <button
          class="restore"
          @click="reset">
          <AppIcon
            name="settings"
            :size="14" />
          Restablecer valores predeterminados
        </button>
      </aside>
    </div>
  </div>
</div>
</template>
