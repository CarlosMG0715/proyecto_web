<script setup lang="ts">
/**
 * VISTA CALENDARIO
 * Como pidió Valeria: un calendario limpio con algunos checks de días cumplidos,
 * coherente con el resto del diseño sin sobrecargas.
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { toDateKey } from '@/mocks/demoGroups'
import { useGroupsStore } from '@/stores/groups'

const groupsStore = useGroupsStore()

const currentDate = ref(new Date())

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const currentMonthLabel = computed(() => {
  return `${monthNames[currentDate.value.getMonth()]} ${currentDate.value.getFullYear()}`
})

interface CalendarDay {
  dayNumber: number
  dateKey: string
  isCurrentMonth: boolean
  isToday: boolean
  hasCheckIn: boolean
}

const calendarDays = computed<CalendarDay[]>(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // En JS: 0=Dom, 1=Lun. Para que lunes sea 0:
  let startingDay = firstDay.getDay() - 1
  if (startingDay === -1) startingDay = 6

  const totalDays = lastDay.getDate()
  const days: CalendarDay[] = []

  const todayKey = toDateKey(new Date())
  const checkedSet = new Set(groupsStore.checkInHistory)

  // Días previos de relleno
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDay - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i
    days.push({
      dayNumber: d,
      dateKey: `prev-${d}`,
      isCurrentMonth: false,
      isToday: false,
      hasCheckIn: false,
    })
  }

  // Días del mes
  for (let d = 1; d <= totalDays; d++) {
    const key = toDateKey(new Date(year, month, d))
    days.push({
      dayNumber: d,
      dateKey: key,
      isCurrentMonth: true,
      isToday: key === todayKey,
      hasCheckIn: checkedSet.has(key),
    })
  }

  // Rellenar hasta completar semanas
  const remaining = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= remaining; i++) {
    days.push({
      dayNumber: i,
      dateKey: `next-${i}`,
      isCurrentMonth: false,
      isToday: false,
      hasCheckIn: false,
    })
  }

  return days
})

function prevMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

function nextMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}
</script>

<template>
  <div class="page">
    <div class="page-inner">
      <header class="page-head">
        <div>
          <h1>Calendario de Hábitos</h1>
          <p>Visualiza tu constancia y días cumplidos a lo largo del mes.</p>
        </div>

        <div class="month-controls">
          <button type="button" class="btn btn-ghost icon-only" @click="prevMonth" title="Mes anterior">
            <AppIcon name="chevron-left" :size="16" />
          </button>
          <span class="month-title">{{ currentMonthLabel }}</span>
          <button type="button" class="btn btn-ghost icon-only" @click="nextMonth" title="Mes siguiente">
            <AppIcon name="chevron-right" :size="16" />
          </button>
        </div>
      </header>

      <section class="panel calendar-panel">
        <div class="weekdays-grid">
          <span v-for="w in weekDays" :key="w" class="weekday-header">{{ w }}</span>
        </div>

        <div class="days-grid">
          <div
            v-for="(day, idx) in calendarDays"
            :key="idx"
            class="day-cell"
            :class="{
              'other-month': !day.isCurrentMonth,
              'today': day.isToday,
              'has-check': day.hasCheckIn,
            }"
          >
            <span class="day-num">{{ day.dayNumber }}</span>

            <div v-if="day.hasCheckIn" class="check-indicator" title="Hábito cumplido">
              <AppIcon name="check" :size="13" :stroke-width="3" />
            </div>
            <div v-else-if="day.isToday && !day.hasCheckIn" class="pending-indicator">
              <span>Pendiente</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Resumen rápido -->
      <footer class="legend-row">
        <div class="legend-item">
          <span class="legend-dot check"></span>
          <span>Día con check-in completado</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot today"></span>
          <span>Día actual</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot empty"></span>
          <span>Sin registro</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.month-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--surface);
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.month-title {
  font-size: 0.95rem;
  font-weight: 700;
  min-width: 140px;
  text-align: center;
}

.icon-only {
  width: 32px;
  height: 32px;
  padding: 0;
}

.calendar-panel {
  padding: 1.5rem;
}

.weekdays-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  text-align: center;
}

.weekday-header {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.day-cell {
  aspect-ratio: 1;
  min-height: 80px;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: border-color 0.15s, transform 0.15s;
}

.day-cell.other-month {
  opacity: 0.28;
  background: transparent;
  border-color: transparent;
}

.day-cell.today {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.day-cell.has-check {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.4);
}

.day-num {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-soft);
}

.day-cell.today .day-num {
  color: #c4b5fd;
}

.check-indicator {
  align-self: flex-end;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--success);
  color: #052e16;
}

.pending-indicator {
  align-self: flex-start;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--warning);
  background: var(--warning-soft);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.legend-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  font-size: 0.82rem;
  color: var(--text-soft);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.check {
  background: var(--success);
}

.legend-dot.today {
  background: var(--primary);
}

.legend-dot.empty {
  background: var(--surface-2);
  border: 1px solid var(--border);
}
</style>
