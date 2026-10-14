<script setup lang="ts">
/**
 * VISTA PERFIL
 * Foto de perfil, datos del usuario de sesión, estadísticas individuales
 * y badges de constancia.
 */
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import valeriaAvatar from '@/assets/avatars/valeria.jpg'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const groupsStore = useGroupsStore()

const user = computed(() => session.currentUser)
const userName = computed(() => user.value?.name || 'Valeria')
const userEmail = computed(() => user.value?.email || 'valeria@pow.dev')

// Si el usuario con sesión es Valeria, mostramos su ilustración creada
const avatarSrc = computed(() => {
  return userName.value.toLowerCase().includes('valeria') ? valeriaAvatar : null
})
</script>

<template>
  <div class="page">
    <div class="page-inner">
      <header class="page-head">
        <div>
          <h1>Tu Perfil</h1>
          <p>Información de tu cuenta y resumen de logros.</p>
        </div>
      </header>

      <section class="panel profile-card">
        <div class="profile-top">
          <div class="avatar-wrap">
            <UserAvatar
              :name="userName"
              :src="avatarSrc"
              :size="84"
              ring
              online
            />
          </div>

          <div class="profile-meta">
            <h2>{{ userName }}</h2>
            <span class="email">{{ userEmail }}</span>
            <div class="badges">
              <span class="pill role">Estudiante POW</span>
              <span class="pill online-badge">🟢 Activa</span>
            </div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-box">
            <span class="stat-caption">Racha Máxima</span>
            <div class="stat-value">
              <span class="flame">🔥</span>
              <strong>{{ groupsStore.bestStreak }} días</strong>
            </div>
          </div>

          <div class="stat-box">
            <span class="stat-caption">Grupos Activos</span>
            <div class="stat-value">
              <AppIcon name="users" :size="20" />
              <strong>{{ groupsStore.groups.length }}</strong>
            </div>
          </div>

          <div class="stat-box">
            <span class="stat-caption">Efectividad</span>
            <div class="stat-value">
              <AppIcon name="trophy" :size="20" />
              <strong>{{ groupsStore.completionRate30 }}%</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- Hábitos Asignados -->
      <section class="panel">
        <div class="panel-title">
          <h2>Tus Compromisos Actuales</h2>
          <span>Por cada grupo</span>
        </div>

        <div class="commitments-list">
          <div
            v-for="group in groupsStore.groups"
            :key="group.id"
            class="commitment-item"
          >
            <div class="group-identity">
              <span class="group-color-dot" :style="{ background: group.color }"></span>
              <strong>{{ group.name }}</strong>
            </div>

            <div class="habit-detail">
              <AppIcon name="target" :size="15" />
              <span>Programar 1 hora diaria</span>
            </div>

            <span class="streak-tag">
              🔥 Racha: {{ group.streak }} días
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-card {
  padding: 1.8rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background:
    radial-gradient(100% 120% at 0% 0%, rgba(139, 92, 246, 0.15), transparent 50%),
    var(--surface);
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.profile-meta h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
}

.email {
  font-size: 0.88rem;
  color: var(--muted);
}

.badges {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: 99px;
}

.pill.role {
  background: var(--primary-soft);
  color: #c4b5fd;
}

.pill.online-badge {
  background: var(--success-soft);
  color: var(--success);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}

.stat-box {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stat-caption {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.stat-value {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;
}

.stat-value .flame {
  font-size: 1.25rem;
}

.commitments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.commitment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.group-identity {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.92rem;
}

.group-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.habit-detail {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--text-soft);
}

.streak-tag {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--flame);
  background: rgba(251, 146, 60, 0.1);
  padding: 0.25rem 0.6rem;
  border-radius: 99px;
}
</style>
