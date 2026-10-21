<script setup lang="ts">
/**
 * VISTA CONFIGURACIÓN
 * Ajustes de notificaciones de medianoche, preferencias de cuenta
 * y opciones de equipo.
 */
import { ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

const notifyMidnight = ref(true)
const notifyChat = ref(true)
const autoStreakProtection = ref(true)
const saveSuccess = ref(false)

function handleSave() {
  saveSuccess.value = true
  setTimeout(() => {
    saveSuccess.value = false
  }, 2500)
}
</script>

<template>
  <div class="page">
    <div class="page-inner">
      <header class="page-head">
        <div>
          <h1>Configuración</h1>
          <p>Gestiona tus alertas, notificaciones y preferencias de hábitos.</p>
        </div>
      </header>

      <section class="panel">
        <div class="panel-title">
          <h2>Notificaciones y Cierre de Medianoche</h2>
          <span>Alertas del cron job</span>
        </div>

        <div class="settings-list">
          <label class="setting-row">
            <div class="setting-info">
              <strong>Recordatorio antes de medianoche</strong>
              <p>Te avisamos a las 22:00 si tienes hábitos pendientes para evitar penalizaciones al grupo.</p>
            </div>
            <input v-model="notifyMidnight" type="checkbox" class="toggle" />
          </label>

          <label class="setting-row">
            <div class="setting-info">
              <strong>Mensajes del chat del equipo</strong>
              <p>Notificaciones cuando los miembros de tu grupo envíen mensajes.</p>
            </div>
            <input v-model="notifyChat" type="checkbox" class="toggle" />
          </label>

          <label class="setting-row">
            <div class="setting-info">
              <strong>Modo de alerta por inactividad</strong>
              <p>Avisar al equipo cuando la salud del grupo baje de 80 puntos.</p>
            </div>
            <input v-model="autoStreakProtection" type="checkbox" class="toggle" />
          </label>
        </div>

        <div class="actions-row">
          <button type="button" class="btn btn-primary" @click="handleSave">
            <AppIcon name="check" :size="15" />
            Guardar preferencias
          </button>
          <span v-if="saveSuccess" class="success-note">¡Preferencias guardadas!</span>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <h2>Seguridad y Sesión</h2>
          <span>Protección de cuenta</span>
        </div>

        <div class="security-meta">
          <p>Tu sesión está protegida con doble token (Access Token en memoria y Refresh Token HttpOnly).</p>
          <div class="sec-tags">
            <span class="pill-sec">Bcrypt Cost 12</span>
            <span class="pill-sec">HttpOnly Cookies</span>
            <span class="pill-sec">Anti-Race Conditions</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-list {
  display: flex;
  flex-direction: column;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.1rem 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info strong {
  display: block;
  font-size: 0.92rem;
  margin-bottom: 0.25rem;
}

.setting-info p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}

.toggle {
  width: 44px;
  height: 24px;
  accent-color: var(--primary-strong);
  cursor: pointer;
}

.actions-row {
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.success-note {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--success);
}

.security-meta p {
  margin: 0 0 0.8rem;
  font-size: 0.85rem;
  color: var(--text-soft);
}

.sec-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pill-sec {
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: #c4b5fd;
  padding: 0.25rem 0.6rem;
  border-radius: 99px;
}
</style>
