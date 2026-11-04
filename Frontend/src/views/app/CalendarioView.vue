<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import { toDateKey } from '@/mocks/demoGroups'
import { useGroupsStore } from '@/stores/groups'
import '@/assets/styles/views/calendario.css'
import '@/assets/styles/game-views.css'

const store = useGroupsStore()
const current = ref(new Date())
const selected = ref(toDateKey(new Date()))
const today = toDateKey(new Date())
const checked = computed(() => new Set(store.checkInHistory))
const label = computed(() =>
  current.value.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  }),
)
const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const days = computed(() => {
  const y = current.value.getFullYear()
  const m = current.value.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const count = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => {
    const d = new Date(y, m, i - offset + 1)
    const key = toDateKey(d)
    return {
      number: d.getDate(),
      key,
      inMonth: d.getMonth() === m,
      done: checked.value.has(key),
      future: key > today,
    }
  })
})
const completed = computed(() => days.value.filter(d => d.inMonth && d.done).length)
const elapsed = computed(() => days.value.filter(d => d.inMonth && d.key <= today).length)
const percent = computed(() =>
  elapsed.value ? Math.round((completed.value / elapsed.value) * 100) : 0,
)
const selectedLabel = computed(() =>
  new Date(`${selected.value}T12:00:00`).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }),
)
function move(n: number) {
  current.value = new Date(
    current.value.getFullYear(),
    current.value.getMonth() + n,
    1,
  )
  selected.value = toDateKey(current.value)
}
function reset() {
  current.value = new Date();
  selected.value = today
}
</script>
<template>
<div
  class="game-page calendar-view">
  <div
    class="game-wrap">
    <header
      class="game-header">
      <div>
        <h1>
          Calendario
        </h1>
      </div>
      <button
        class="game-button secondary"
        @click="reset">
        <AppIcon
          name="calendar"
          :size="15" />
        Volver a hoy
      </button>
    </header>
    <div
      class="game-stat-grid">
      <div
        class="game-stat">
        <AppIcon
          name="check" />
        <strong>
          {{ completed }}
        </strong>
        <small>
          Días registrados este mes
        </small>
      </div>
      <div
        class="game-stat">
        <AppIcon
          name="target" />
        <strong>
          {{ percent }}
          %
        </strong>
        <small>
          De los días transcurridos
        </small>
      </div>
      <div
        class="game-stat">
        <AppIcon
          name="flame" />
        <strong>
          {{ store.bestStreak }}
        </strong>
        <small>
          Mejor racha personal
        </small>
      </div>
    </div>
    <div
      class="game-grid">
      <section
        class="game-panel calendar">
        <div
          class="game-title">
          <div
            class="month-name">
            <h2>
              {{ label }}
            </h2>
          </div>
          <div
            class="month-buttons">
            <button
              class="month-button"
              aria-label="Mes anterior"
              @click="move(-1)">
              <AppIcon
                name="chevron-left" />
            </button>
            <button
              class="month-button"
              aria-label="Mes siguiente"
              @click="move(1)">
              <AppIcon
                name="chevron-right" />
            </button>
          </div>
        </div>
        <div
          class="calendar-grid">
          <span
            v-for="w in weekdays"
            :key="w"
            class="weekday">
            {{ w }}
          </span>
          <button
            v-for="d in days"
            :key="d.key"
            class="day"
            :class="{ outside: !d.inMonth, done: d.done, today: d.key === today, selected: d.key === selected, future: d.future }"
            :aria-label="`${d.key}${d.done ? ', con check-in' : ', sin registro'}${d.key === today ? ', hoy' : ''}`"
            :aria-pressed="d.key === selected"
            :aria-current="d.key === today ? 'date' : undefined"
            @click="selected = d.key">
            <span
              class="day-number">
              {{ d.number }}
            </span>
            <span
              v-if="d.done"
              class="day-seal">
              <AppIcon
                name="check"
                :size="20"
                :stroke-width="3" />
            </span>
            <span
              v-else-if="d.key === today"
              class="today-dot">
            </span>
            <span
              v-else
              class="day-dot">
            </span>
            <small
              v-if="d.key === today">
              HOY
            </small>
          </button>
        </div>
        <div
          class="legend">
          <span>
            <i
              class="checked">
            </i>
            Con check-in
          </span>
          <span>
            <i
              class="current">
            </i>
            Hoy
          </span>
          <span>
            <i>
            </i>
            Sin registro
          </span>
        </div>
      </section>
      <aside
        class="game-stack">
        <section
          class="game-panel selected-panel"
          aria-live="polite">
          <span
            class="game-kicker">
            DÍA SELECCIONADO
          </span>
          <h2>
            {{ selectedLabel }}
          </h2>
          <div
            class="selected-seal"
            :class="{ complete: checked.has(selected) }">
            <AppIcon
              :name="checked.has(selected) ? 'shield' : selected > today ? 'calendar' : 'target'"
              :size="43" />
          </div>
          <h3>
            {{ checked.has(selected) ? 'Check-in registrado' : selected > today ? 'Próximo día' : selected === today ? 'Sin check-in hoy' : 'Sin registro' }}
          </h3>
          <RouterLink
            v-if="selected === today"
            :to="{ name: 'inicio' }"
            class="game-button">
            Ver hábitos de hoy
            <AppIcon
              name="arrow-right"
              :size="15" />
          </RouterLink>
        </section>
        <section
          class="game-panel flame-panel">
          <StreakFlame
            :size="110" />
          <div>
            <strong>
              {{ store.bestStreak }}
              días
            </strong>
            <h2>
              Mejor racha
            </h2>
          </div>
        </section>
      </aside>
    </div>
  </div>
</div>
</template>
