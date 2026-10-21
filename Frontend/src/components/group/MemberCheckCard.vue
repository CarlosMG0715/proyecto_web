<script setup lang="ts">
/**
 * Tarjeta de hábito por miembro (estilo gamificado y táctil).
 * Clara, visual, sin saturación ni estética de IA genérica.
 */
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import type { GroupMember } from '@/types/group'

defineProps<{ member: GroupMember }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <article class="habit-card" :class="{ 'is-done': member.checkedInToday, 'is-mine': member.isCurrentUser }">
    <!-- Encabezado del Miembro -->
    <header class="card-head">
      <UserAvatar :name="member.name" :src="member.avatarUrl" :size="44" :online="member.isOnline" />
      <div class="member-meta">
        <div class="name-row">
          <strong class="member-name">{{ member.name }}</strong>
          <span v-if="member.isCurrentUser" class="pill-tag you">Tú</span>
          <span v-else-if="member.role === 'ADMIN'" class="pill-tag admin">Admin</span>
        </div>
        <span class="member-status" :class="{ ok: member.checkedInToday }">
          {{ member.checkedInToday ? 'Completado hoy' : 'Pendiente hoy' }}
        </span>
      </div>

      <!-- Indicador visual de check -->
      <div class="check-badge" :class="{ checked: member.checkedInToday }">
        <AppIcon v-if="member.checkedInToday" name="check" :size="14" :stroke-width="3" />
        <span v-else class="pending-circle"></span>
      </div>
    </header>

    <!-- Hábito y Progreso -->
    <div class="habit-box">
      <span class="habit-icon">🎯</span>
      <div class="habit-info">
        <span class="habit-caption">Hábito Diario</span>
        <strong class="habit-title">{{ member.habit }}</strong>
      </div>
    </div>

    <!-- Estadísticas de racha -->
    <div class="stats-row">
      <div class="progress-info">
        <span class="stats-label">Progreso</span>
        <strong class="stats-value">{{ member.daysCompleted }}/{{ member.daysTotal }} días</strong>
      </div>
      <div class="streak-badge">
        <span class="streak-flame">🔥</span>
        <strong>{{ member.streak }} días</strong>
      </div>
    </div>

    <!-- Botón de Acción Táctil Gamificado (Estilo Duolingo) -->
    <div class="action-wrap">
      <button
        v-if="member.isCurrentUser"
        type="button"
        class="duo-btn"
        :class="member.checkedInToday ? 'btn-done' : 'btn-todo'"
        @click="emit('toggle')"
      >
        <span v-if="!member.checkedInToday" class="btn-content">
          <AppIcon name="check" :size="16" :stroke-width="3" />
          <span>MARCAR COMO HECHO</span>
        </span>
        <span v-else class="btn-content">
          <AppIcon name="check" :size="16" :stroke-width="3" />
          <span>¡COMPLETADO HOY!</span>
        </span>
      </button>

      <!-- Estado de compañeros (solo lectura pero limpio) -->
      <div v-else class="teammate-status" :class="{ completed: member.checkedInToday }">
        <span v-if="member.checkedInToday">✓ Cumplió con su meta de hoy</span>
        <span v-else>Esperando check-in de hoy...</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.habit-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 22px;
  background: rgba(22, 19, 32, 0.75);
  backdrop-filter: blur(14px);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.45);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.habit-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.16);
}

.habit-card.is-done {
  border-color: rgba(34, 197, 94, 0.45);
  box-shadow: 0 12px 28px -8px rgba(34, 197, 94, 0.2);
}

.habit-card.is-mine:not(.is-done) {
  border-color: rgba(249, 115, 22, 0.45);
}

/* Header */
.card-head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.member-meta {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.member-name {
  font-size: 1rem;
  font-weight: 800;
  color: #f8fafc;
}

.pill-tag {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.45rem;
  border-radius: 99px;
  text-transform: uppercase;
}

.pill-tag.you {
  background: rgba(249, 115, 22, 0.2);
  color: #fb923c;
  border: 1px solid rgba(249, 115, 22, 0.35);
}

.pill-tag.admin {
  background: rgba(168, 85, 247, 0.18);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.member-status {
  font-size: 0.78rem;
  font-weight: 600;
  color: #fb923c;
  margin-top: 2px;
}

.member-status.ok {
  color: #4ade80;
}

/* Check badge */
.check-badge {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #052e16;
  flex-shrink: 0;
}

.check-badge.checked {
  background: #22c55e;
  border-color: #4ade80;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
}

.pending-circle {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fb923c;
}

/* Hábito */
.habit-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.95rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.habit-icon {
  font-size: 1.25rem;
}

.habit-info {
  display: flex;
  flex-direction: column;
}

.habit-caption {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

.habit-title {
  font-size: 0.92rem;
  font-weight: 800;
  color: #f1f5f9;
}

/* Estadísticas */
.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.2rem;
}

.progress-info {
  display: flex;
  flex-direction: column;
}

.stats-label {
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 600;
}

.stats-value {
  font-size: 0.85rem;
  font-weight: 800;
  color: #e2e8f0;
}

.streak-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 99px;
  background: rgba(249, 115, 22, 0.12);
  border: 1px solid rgba(249, 115, 22, 0.28);
  font-size: 0.82rem;
  color: #ffba88;
}

.streak-flame {
  font-size: 1rem;
}

/* Botón Duolingo */
.action-wrap {
  margin-top: 0.25rem;
}

.duo-btn {
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: none;
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.15s ease;
  user-select: none;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Pendiente: Botón naranja con efecto 3D táctil Duolingo */
.btn-todo {
  background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%);
  color: #1c0d02;
  box-shadow: 0 4px 0 #9a3412;
}

.btn-todo:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 5px 0 #9a3412;
}

.btn-todo:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #9a3412;
}

/* Completado: Botón verde esmeralda con efecto 3D táctil */
.btn-done {
  background: linear-gradient(180deg, #4ade80 0%, #16a34a 100%);
  color: #052e16;
  box-shadow: 0 4px 0 #15803d;
}

.btn-done:hover {
  filter: brightness(1.05);
}

.btn-done:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #15803d;
}

/* Teammate status */
.teammate-status {
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.teammate-status.completed {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.25);
  color: #4ade80;
}
</style>
