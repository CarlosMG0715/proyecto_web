<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import type { GroupMember } from '@/types/group'

defineProps<{ member: GroupMember }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <article class="card" :class="{ done: member.checkedInToday, mine: member.isCurrentUser }">
    <header class="head">
      <UserAvatar :name="member.name" :src="member.avatarUrl" :size="40" :online="member.isOnline" />
      <div class="who">
        <span class="name">
          {{ member.name }}
          <span v-if="member.isCurrentUser" class="tag you">Tú</span>
          <span v-else-if="member.role === 'ADMIN'" class="tag">Admin</span>
        </span>
        <span class="status" :class="{ ok: member.checkedInToday }">
          {{ member.checkedInToday ? 'Cumplió hoy' : 'Pendiente hoy' }}
        </span>
      </div>
      <span v-if="member.checkedInToday" class="check-circle">
        <AppIcon name="check" :size="14" :stroke-width="3" />
      </span>
    </header>

    <div class="habit">
      <AppIcon name="code" :size="16" />
      <span>{{ member.habit }}</span>
    </div>

    <div class="stats">
      <span class="days">{{ member.daysCompleted }}/{{ member.daysTotal }} días</span>
      <span class="streak">
        <AppIcon name="flame" :size="14" />
        {{ member.streak }}
      </span>
    </div>

    <button
      v-if="member.isCurrentUser"
      type="button"
      class="action"
      :class="member.checkedInToday ? 'completed' : 'todo'"
      @click="emit('toggle')"
    >
      <AppIcon :name="member.checkedInToday ? 'check' : 'target'" :size="15" :stroke-width="2.5" />
      {{ member.checkedInToday ? 'Completado' : 'Marcar como hecho' }}
    </button>
    <div v-else class="action readonly" :class="{ completed: member.checkedInToday }">
      <AppIcon :name="member.checkedInToday ? 'check' : 'clock'" :size="15" :stroke-width="2.5" />
      {{ member.checkedInToday ? 'Completado' : 'Esperando check-in' }}
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.card.done {
  border-color: rgba(34, 197, 94, 0.55);
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.12), 0 12px 32px -14px rgba(34, 197, 94, 0.45);
}

.card.mine:not(.done) {
  border-color: rgba(139, 92, 246, 0.5);
}

.head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.who {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  line-height: 1.3;
}

.name {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 700;
  font-size: 0.95rem;
}

.tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tag.you {
  background: var(--primary-soft);
  color: #c4b5fd;
}

.status {
  font-size: 0.75rem;
  color: var(--warning);
}

.status.ok {
  color: var(--success);
}

.check-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--success);
  color: #052e16;
}

.habit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.7rem;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-soft);
}

.stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--muted);
}

.streak {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 700;
  color: var(--flame);
}

.action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.6rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid transparent;
  transition: filter 0.15s, background 0.15s;
}

.action.todo {
  background: var(--primary-strong);
  color: #fff;
}

.action.todo:hover {
  filter: brightness(1.1);
}

.action.completed {
  background: var(--success);
  color: #052e16;
}

.action.readonly {
  background: transparent;
  border-color: var(--border-strong);
  color: var(--muted);
  font-weight: 600;
}

.action.readonly.completed {
  border-color: rgba(34, 197, 94, 0.35);
  background: var(--success-soft);
  color: var(--success);
}
</style>
