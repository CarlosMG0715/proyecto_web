<script setup lang="ts">
/**
 * INICIO: lo primero que se ve al iniciar sesión.
 * Tu cuenta, cómo vas hoy, tus números, la gráfica de la semana,
 * la actividad reciente y todos tus grupos.
 */
import { computed } from 'vue'
import AppIcon, { type IconName } from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useCreateGroupModal } from '@/composables/useCreateGroupModal'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import type { ActivityKind, Group } from '@/types/group'
import { formatRelative } from '@/utils/time'

interface Kpi {
  label: string
  value: string
  hint: string
  icon: IconName
  tone: 'flame' | 'success' | 'primary' | 'sky'
}

const session = useSessionStore()
const groupsStore = useGroupsStore()
const createModal = useCreateGroupModal()

const userName = computed(() => session.currentUser?.name ?? 'Usuario')
const firstName = computed(() => userName.value.split(' ')[0] ?? userName.value)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const todayText = computed(() =>
  new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
)

const totalToday = computed(() => groupsStore.doneToday + groupsStore.pendingToday)

const firstPendingGroup = computed<Group | undefined>(() =>
  groupsStore.groups.find((g) => g.members.some((m) => m.isCurrentUser && !m.checkedInToday)),
)

const kpis = computed<Kpi[]>(() => [
  {
    label: 'Racha actual',
    value: `${groupsStore.bestStreak} días`,
    hint: 'Tu mejor racha activa',
    icon: 'flame',
    tone: 'flame',
  },
  {
    label: 'Check-ins de hoy',
    value: `${groupsStore.doneToday}/${totalToday.value}`,
    hint: groupsStore.pendingToday > 0 ? `${groupsStore.pendingToday} pendiente(s)` : 'Todo al día',
    icon: 'check',
    tone: 'success',
  },
  {
    label: 'Cumplimiento',
    value: `${groupsStore.completionRate30}%`,
    hint: 'Últimos 30 días',
    icon: 'activity',
    tone: 'primary',
  },
  {
    label: 'Grupos',
    value: String(groupsStore.groups.length),
    hint: 'En los que participas',
    icon: 'users',
    tone: 'sky',
  },
])

const weekAverage = computed(() => {
  const days = groupsStore.weekProgress
  if (days.length === 0) return 0
  return Math.round(days.reduce((a, d) => a + d.value, 0) / days.length)
})

const recentActivity = computed(() => groupsStore.activity.slice(0, 5))

const ACTIVITY_ICON: Record<ActivityKind, IconName> = {
  'check-in': 'check',
  join: 'users',
  streak: 'flame',
  alert: 'alert',
}

function todayDone(group: Group): number {
  return group.members.filter((m) => m.checkedInToday).length
}

function groupInitials(name: string): string {
  return name
    .split(' ')
    .filter((p) => p.length > 0)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}
</script>

<template>
  <div class="page">
    <div class="page-inner">
      <!-- Tu cuenta + estado de hoy -->
      <section class="hero panel">
        <div class="hero-left">
          <UserAvatar :name="userName" :size="68" ring online />
          <div>
            <span class="date">{{ todayText }}</span>
            <h1>{{ greeting }}, {{ firstName }}</h1>
            <p>{{ session.currentUser?.email }}</p>
          </div>
        </div>

        <div class="today-box" :class="{ ok: groupsStore.pendingToday === 0 }">
          <template v-if="firstPendingGroup">
            <div>
              <strong>Te falta tu check-in de hoy</strong>
              <span>en {{ firstPendingGroup.name }}</span>
            </div>
            <RouterLink
              :to="{ name: 'grupo', params: { groupId: firstPendingGroup.id } }"
              class="btn btn-primary"
            >
              Ir al grupo
              <AppIcon name="arrow-right" :size="15" />
            </RouterLink>
          </template>
          <template v-else>
            <span class="ok-icon"><AppIcon name="check" :size="16" :stroke-width="3" /></span>
            <div>
              <strong>¡Todo al día!</strong>
              <span>Cumpliste en todos tus grupos.</span>
            </div>
          </template>
        </div>
      </section>

      <!-- Números rápidos -->
      <section class="kpis">
        <article v-for="k in kpis" :key="k.label" class="kpi panel">
          <span class="kpi-icon" :class="k.tone">
            <AppIcon :name="k.icon" :size="17" />
          </span>
          <span class="kpi-label">{{ k.label }}</span>
          <strong class="kpi-value">{{ k.value }}</strong>
          <span class="kpi-hint">{{ k.hint }}</span>
        </article>
      </section>

      <!-- Gráfica + actividad -->
      <section class="split">
        <article class="panel">
          <div class="panel-title">
            <h2>Cumplimiento de tus grupos</h2>
            <span>Últimos 7 días · promedio {{ weekAverage }}%</span>
          </div>
          <div class="chart">
            <div class="grid-lines">
              <span data-v="100"></span>
              <span data-v="50"></span>
              <span data-v="0"></span>
            </div>
            <div class="bars">
              <div v-for="d in groupsStore.weekProgress" :key="d.key" class="bar-col">
                <div class="bar-track">
                  <div
                    class="bar"
                    :class="{ today: d.isToday, full: d.value === 100 }"
                    :style="{ height: `${Math.max(d.value, 3)}%` }"
                  >
                    <span class="bar-tip">{{ d.value }}%</span>
                  </div>
                </div>
                <span class="bar-label" :class="{ today: d.isToday }">{{ d.label }}</span>
              </div>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-title">
            <h2>Actividad reciente</h2>
          </div>
          <ul v-if="recentActivity.length" class="activity">
            <li v-for="a in recentActivity" :key="a.id">
              <span class="act-icon" :class="a.kind">
                <AppIcon :name="ACTIVITY_ICON[a.kind]" :size="14" :stroke-width="2.5" />
              </span>
              <div>
                <p>{{ a.text }}</p>
                <span>{{ formatRelative(a.at) }}</span>
              </div>
            </li>
          </ul>
          <p v-else class="empty">Todavía no hay actividad.</p>
        </article>
      </section>

      <!-- Tus grupos -->
      <section>
        <div class="section-head">
          <h2>Tus grupos</h2>
          <span>{{ groupsStore.groups.length }} activo(s)</span>
        </div>
        <div class="groups-grid">
          <RouterLink
            v-for="g in groupsStore.groups"
            :key="g.id"
            :to="{ name: 'grupo', params: { groupId: g.id } }"
            class="group-card panel"
          >
            <div class="gc-top">
              <span class="gc-badge" :style="{ background: g.color }">{{ groupInitials(g.name) }}</span>
              <div class="gc-title">
                <strong>{{ g.name }}</strong>
                <span>{{ g.category }}</span>
              </div>
              <span class="gc-streak"><AppIcon name="flame" :size="14" />{{ g.streak }}</span>
            </div>

            <div class="gc-health">
              <div class="gc-health-row">
                <span>Salud del grupo</span>
                <span>{{ g.health }}/100</span>
              </div>
              <div class="track"><div class="fill" :style="{ width: `${g.health}%` }"></div></div>
            </div>

            <div class="gc-foot">
              <div class="stack">
                <UserAvatar v-for="m in g.members" :key="m.id" :name="m.name" :src="m.avatarUrl" :size="26" />
              </div>
              <span class="gc-today">Hoy {{ todayDone(g) }}/{{ g.members.length }}</span>
            </div>
          </RouterLink>

          <button type="button" class="group-card new" @click="createModal.open">
            <span class="new-icon"><AppIcon name="plus" :size="20" /></span>
            <strong>Crear un grupo nuevo</strong>
            <span>Invita a tus amigos con un código</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Hero */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 1.5rem;
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(139, 92, 246, 0.16), transparent 55%),
    var(--surface);
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 1.1rem;
}

.date {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: capitalize;
}

.hero h1 {
  margin: 0.15rem 0 0.2rem;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.hero p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-soft);
}

.today-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 0.9rem 0.85rem 1.1rem;
  border-radius: var(--radius);
  border: 1px solid rgba(245, 165, 36, 0.3);
  background: var(--warning-soft);
}

.today-box.ok {
  border-color: rgba(34, 197, 94, 0.3);
  background: var(--success-soft);
}

.today-box div {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.today-box strong {
  font-size: 0.88rem;
}

.today-box span {
  font-size: 0.78rem;
  color: var(--text-soft);
}

.ok-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--success);
  color: #052e16 !important;
}

/* KPIs */
.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 1.1rem;
}

.kpi-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  margin-bottom: 0.55rem;
}

.kpi-icon.flame {
  background: rgba(251, 146, 60, 0.13);
  color: var(--flame);
}
.kpi-icon.success {
  background: var(--success-soft);
  color: var(--success);
}
.kpi-icon.primary {
  background: var(--primary-soft);
  color: #a78bfa;
}
.kpi-icon.sky {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.kpi-label {
  font-size: 0.78rem;
  color: var(--muted);
}

.kpi-value {
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.kpi-hint {
  font-size: 0.74rem;
  color: var(--text-soft);
}

/* Gráfica + actividad */
.split {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
  gap: 1rem;
}

.chart {
  position: relative;
  height: 200px;
  padding-left: 2rem;
}

.grid-lines {
  position: absolute;
  inset: 0 0 1.6rem 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.grid-lines span {
  position: relative;
  border-top: 1px dashed var(--border);
}

.grid-lines span::before {
  content: attr(data-v) '%';
  position: absolute;
  left: -2rem;
  top: -0.5rem;
  font-size: 0.65rem;
  color: var(--muted);
}

.bars {
  position: relative;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.9rem;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.bar-track {
  flex: 1;
  width: 100%;
  max-width: 38px;
  display: flex;
  align-items: flex-end;
}

.bar {
  position: relative;
  width: 100%;
  border-radius: 7px 7px 3px 3px;
  background: linear-gradient(180deg, #6d4bc4, #3b2a6e);
  transition: height 0.4s ease;
}

.bar.full {
  background: linear-gradient(180deg, #a78bfa, #6d28d9);
}

.bar.today {
  background: repeating-linear-gradient(
    -45deg,
    rgba(34, 197, 94, 0.85),
    rgba(34, 197, 94, 0.85) 6px,
    rgba(34, 197, 94, 0.6) 6px,
    rgba(34, 197, 94, 0.6) 12px
  );
}

.bar-tip {
  position: absolute;
  top: -1.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-soft);
  opacity: 0;
  transition: opacity 0.15s;
}

.bar-col:hover .bar-tip,
.bar.today .bar-tip {
  opacity: 1;
}

.bar-label {
  font-size: 0.72rem;
  color: var(--muted);
}

.bar-label.today {
  color: var(--success);
  font-weight: 700;
}

.activity {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.activity li {
  display: flex;
  gap: 0.7rem;
}

.act-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--surface-2);
  color: var(--text-soft);
}

.act-icon.check-in {
  background: var(--success-soft);
  color: var(--success);
}
.act-icon.streak {
  background: rgba(251, 146, 60, 0.13);
  color: var(--flame);
}
.act-icon.join {
  background: var(--primary-soft);
  color: #a78bfa;
}

.activity p {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.35;
}

.activity span {
  font-size: 0.72rem;
  color: var(--muted);
}

.empty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}

/* Grupos */
.section-head {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 0.4rem 0 0.8rem;
}

.section-head h2 {
  margin: 0;
  font-size: 1.05rem;
}

.section-head span {
  font-size: 0.78rem;
  color: var(--muted);
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.group-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.15s, transform 0.15s;
}

.group-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

.gc-top {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.gc-badge {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 0.8rem;
  font-weight: 800;
  color: #fff;
}

.gc-title {
  display: flex;
  flex-direction: column;
  flex: 1;
  line-height: 1.3;
}

.gc-title strong {
  font-size: 0.95rem;
}

.gc-title span {
  font-size: 0.75rem;
  color: var(--muted);
}

.gc-streak {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0.25rem 0.55rem;
  border-radius: 99px;
  background: rgba(251, 146, 60, 0.12);
  color: var(--flame);
  font-size: 0.8rem;
  font-weight: 700;
}

.gc-health-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--muted);
  margin-bottom: 0.4rem;
}

.track {
  height: 7px;
  border-radius: 99px;
  background: var(--surface-2);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--success), #a3e635);
}

.gc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stack {
  display: flex;
}

.stack > * + * {
  margin-left: -8px;
}

.stack :deep(.avatar) {
  box-shadow: 0 0 0 2px var(--surface);
}

.gc-today {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-soft);
}

.group-card.new {
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 170px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--text-soft);
  text-align: center;
}

.group-card.new:hover {
  border-color: var(--primary);
  color: var(--text);
  background: rgba(139, 92, 246, 0.04);
}

.new-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-bottom: 0.35rem;
  background: var(--primary-soft);
  color: #a78bfa;
}

.group-card.new strong {
  font-size: 0.9rem;
}

.group-card.new span {
  font-size: 0.76rem;
  color: var(--muted);
}

@media (max-width: 1100px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
