<script setup lang="ts">
/**
 * Tarjeta de hábito por miembro (Diseño exacto Kordia Dark).
 * Coincidencia 100% con la estética:
 * - Carlos: Borde verde, badge ADMIN, "Cumplió hoy", círculo check verde superior, "8/8 días", "🔥 8", botón "✓ Completado".
 * - Valeria: Borde morado, badge TÚ, "Pendiente hoy", "7/8 días", "🔥 6", botón morado "Marcar como hecho".
 */
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import type { GroupMember } from '@/types/group'

defineProps<{ member: GroupMember }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <article
    class="card"
    :class="{
      done: member.checkedInToday,
      mine: member.isCurrentUser
    }"
  >
    <!-- Encabezado con Avatar, Nombre, Tag y Estado -->
    <header class="head">
      <UserAvatar
        :name="member.name"
        :src="member.avatarUrl"
        :size="44"
        :online="member.isOnline"
      />
      <div class="who">
        <div class="name-row">
          <strong class="name">{{ member.name }}</strong>
          <span v-if="member.isCurrentUser" class="tag you">TÚ</span>
          <span v-else-if="member.role === 'ADMIN'" class="tag admin">ADMIN</span>
        </div>
        <span class="status" :class="{ ok: member.checkedInToday }">
          {{ member.checkedInToday ? 'Cumplió hoy' : 'Pendiente hoy' }}
        </span>
      </div>

      <!-- Ícono circular verde de check cuando está cumplido (esquina superior derecha) -->
      <span v-if="member.checkedInToday" class="check-circle">
        <AppIcon name="check" :size="14" :stroke-width="3" />
      </span>
    </header>

    <!-- Caja del Hábito (< > Nombre del Hábito) -->
    <div class="habit">
      <AppIcon name="code" :size="16" :stroke-width="2.5" class="code-icon" />
      <span class="habit-name">{{ member.habit }}</span>
    </div>

    <!-- Fila de estadísticas (Días a la izquierda, Fueguito a la derecha) -->
    <div class="stats">
      <span class="days">{{ member.daysCompleted }}/{{ member.daysTotal }} días</span>
      <span class="streak">
        <AppIcon name="flame" :size="15" :stroke-width="2.5" class="flame-icon" />
        <span class="streak-num">{{ member.streak }}</span>
      </span>
    </div>

    <!-- Botón de acción al fondo de la card -->
    <button
      v-if="member.isCurrentUser"
      type="button"
      class="action"
      :class="member.checkedInToday ? 'completed' : 'todo'"
      @click="emit('toggle')"
    >
      <AppIcon
        :name="member.checkedInToday ? 'check' : 'target'"
        :size="16"
        :stroke-width="2.5"
      />
      <span>{{ member.checkedInToday ? 'Completado' : 'Marcar como hecho' }}</span>
    </button>

    <div
      v-else
      class="action readonly"
      :class="{ completed: member.checkedInToday }"
    >
      <AppIcon
        :name="member.checkedInToday ? 'check' : 'clock'"
        :size="16"
        :stroke-width="2.5"
      />
      <span>{{ member.checkedInToday ? 'Completado' : 'Esperando check-in' }}</span>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  padding: 1.25rem 1.35rem;
  border-radius: 18px;
  background: #110e1b;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 24px -6px rgba(0, 0, 0, 0.5);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  min-width: 290px;
}

.card:hover {
  transform: translateY(-2px);
}

/* 1. Tarjeta Cumplida (Borde Verde como Carlos en la imagen) */
.card.done {
  border: 1.5px solid #10b981;
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.16), 0 12px 28px -8px rgba(0, 0, 0, 0.6);
}

/* 2. Tarjeta Propia Pendiente (Borde Morado como Valeria en la imagen) */
.card.mine:not(.done) {
  border: 1.5px solid #7c3aed;
  box-shadow: 0 0 16px rgba(124, 58, 237, 0.18), 0 12px 28px -8px rgba(0, 0, 0, 0.6);
}

/* Header */
.head {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  position: relative;
}

.who {
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

.name {
  font-size: 1.05rem;
  font-weight: 800;
  color: #ffffff;
}

/* Tags de rol */
.tag {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 0.12rem 0.45rem;
  border-radius: 6px;
  text-transform: uppercase;
}

.tag.you {
  background: rgba(124, 58, 237, 0.35);
  color: #c4b5fd;
  border: 1px solid rgba(124, 58, 237, 0.5);
}

.tag.admin {
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* Subtítulo de estado */
.status {
  font-size: 0.82rem;
  font-weight: 600;
  color: #f59e0b;
  margin-top: 2px;
}

.status.ok {
  color: #10b981;
}

/* Ícono circular superior derecho (✓) */
.check-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #10b981;
  color: #052e16;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
}

/* Caja de hábito (< > Programar 1 hora) */
.habit {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.72rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.code-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.habit-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
}

/* Estadísticas (días y fueguito) */
.stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.05rem 0.15rem;
}

.days {
  font-size: 0.84rem;
  font-weight: 600;
  color: #94a3b8;
}

.streak {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  font-weight: 800;
  color: #f97316;
}

.flame-icon {
  color: #f97316;
}

.streak-num {
  font-size: 0.9rem;
  font-weight: 800;
  color: #f97316;
}

/* Botón de acción al pie */
.action {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.78rem 1rem;
  border-radius: 12px;
  font-size: 0.94rem;
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

/* Botón de Valeria cuando está pendiente (Morado vibrante con ícono de diana) */
.action.todo {
  background: #7c3aed;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.45);
}

.action.todo:hover {
  background: #6d28d9;
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.action.todo:active {
  transform: translateY(1px);
}

/* Botón de Carlos o Valeria cuando ya cumplieron (Verde transparente con borde) */
.action.completed {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid #10b981;
  color: #10b981;
}

.action.completed:hover {
  background: rgba(16, 185, 129, 0.14);
}

.action.readonly {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  cursor: default;
}

.action.readonly.completed {
  border: 1px solid #10b981;
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}
</style>
