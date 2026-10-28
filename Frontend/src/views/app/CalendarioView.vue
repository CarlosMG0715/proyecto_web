<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import { toDateKey } from '@/mocks/demoGroups'
import { useGroupsStore } from '@/stores/groups'
import '@/assets/styles/game-views.css'
const store = useGroupsStore()
const current = ref(new Date())
const selected = ref(toDateKey(new Date()))
const today = toDateKey(new Date())
const checked = computed(() => new Set(store.checkInHistory))
const label = computed(() => current.value.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }))
const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const days = computed(() => {
  const y = current.value.getFullYear(), m = current.value.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const count = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => {
    const d = new Date(y, m, i - offset + 1), key = toDateKey(d)
    return { number: d.getDate(), key, inMonth: d.getMonth() === m, done: checked.value.has(key), future: key > today }
  })
})
const completed = computed(() => days.value.filter(d => d.inMonth && d.done).length)
const elapsed = computed(() => days.value.filter(d => d.inMonth && d.key <= today).length)
const percent = computed(() => elapsed.value ? Math.round(completed.value / elapsed.value * 100) : 0)
const selectedLabel = computed(() => new Date(`${selected.value}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }))
function move(n: number) { current.value = new Date(current.value.getFullYear(), current.value.getMonth() + n, 1); selected.value = toDateKey(current.value) }
function reset() { current.value = new Date(); selected.value = today }
</script>
<template><div class="game-page"><div class="game-wrap">
<header class="game-header"><div><h1>Calendario</h1></div><button class="game-button secondary" @click="reset"><AppIcon name="calendar" :size="15" />Volver a hoy</button></header>
<div class="game-stat-grid"><div class="game-stat"><AppIcon name="check" /><strong>{{ completed }}</strong><small>Días registrados este mes</small></div><div class="game-stat"><AppIcon name="target" /><strong>{{ percent }}%</strong><small>De los días transcurridos</small></div><div class="game-stat"><AppIcon name="flame" /><strong>{{ store.bestStreak }}</strong><small>Mejor racha personal</small></div></div>
<div class="game-grid"><section class="game-panel calendar"><div class="game-title"><div class="month-name"><h2>{{ label }}</h2></div><div class="month-buttons"><button class="month-button" aria-label="Mes anterior" @click="move(-1)"><AppIcon name="chevron-left" /></button><button class="month-button" aria-label="Mes siguiente" @click="move(1)"><AppIcon name="chevron-right" /></button></div></div>
<div class="calendar-grid"><span v-for="w in weekdays" :key="w" class="weekday">{{ w }}</span><button v-for="d in days" :key="d.key" class="day" :class="{ outside: !d.inMonth, done: d.done, today: d.key === today, selected: d.key === selected, future: d.future }" :aria-label="`${d.key}${d.done ? ', con check-in' : ', sin registro'}${d.key === today ? ', hoy' : ''}`" :aria-pressed="d.key === selected" :aria-current="d.key === today ? 'date' : undefined" @click="selected = d.key"><span class="day-number">{{ d.number }}</span><span v-if="d.done" class="day-seal"><AppIcon name="check" :size="20" :stroke-width="3" /></span><span v-else-if="d.key === today" class="today-dot"></span><span v-else class="day-dot"></span><small v-if="d.key === today">HOY</small></button></div><div class="legend"><span><i class="checked"></i>Con check-in</span><span><i class="current"></i>Hoy</span><span><i></i>Sin registro</span></div></section>
<aside class="game-stack"><section class="game-panel selected-panel" aria-live="polite"><span class="game-kicker">DÍA SELECCIONADO</span><h2>{{ selectedLabel }}</h2><div class="selected-seal" :class="{ complete: checked.has(selected) }"><AppIcon :name="checked.has(selected) ? 'shield' : selected > today ? 'calendar' : 'target'" :size="43" /></div><h3>{{ checked.has(selected) ? 'Check-in registrado' : selected > today ? 'Próximo día' : selected === today ? 'Sin check-in hoy' : 'Sin registro' }}</h3><RouterLink v-if="selected === today" :to="{ name: 'inicio' }" class="game-button">Ver hábitos de hoy<AppIcon name="arrow-right" :size="15" /></RouterLink></section>
<section class="game-panel flame-panel"><StreakFlame :size="110" /><div><strong>{{ store.bestStreak }} días</strong><h2>Mejor racha</h2></div></section></aside></div>
</div></div></template>
<style scoped>
.month-name h2{font-size:24px;text-transform:capitalize;margin-top:8px;letter-spacing:-.04em}.month-buttons{display:flex;gap:7px}.month-button{width:35px;height:36px;display:grid;place-items:center;background:#35283f;color:#dec5f5;border:1px solid #60466e;border-bottom-width:3px;border-radius:8px}.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:9px}.weekday{text-align:center;color:#baabc9;font-size:10px;font-weight:700;padding:5px 0 12px}.day{aspect-ratio:.92;min-height:65px;padding:9px;background:#2a2235;border:1px solid #46334f;border-bottom:4px solid #140f1e;border-radius:12px;color:#d8c9e7;display:flex;flex-direction:column;align-items:center;position:relative;transition:transform .18s,border-color .18s}.day:hover{transform:translateY(-3px);border-color:#ae85cf}.day-number{align-self:flex-start;font-size:11px;font-weight:700}.day-seal{margin:auto;display:grid;place-items:center;width:31px;height:31px;border-radius:9px;background:#b5d68c;color:#35442c;border-bottom:3px solid #799653;transform:rotate(-7deg)}.day.done{background:#303c2d;border-color:#576548;border-bottom-color:#1b2219}.day-dot{width:4px;height:4px;border-radius:50%;background:#65516f;margin:auto}.day.today{border-color:#d0a9ff;background:#49325c}.day.selected{outline:2px solid #dcbdff;outline-offset:2px}.day small{font-size:7px;letter-spacing:.09em;color:#ead5ff;position:absolute;bottom:7px}.today-dot{width:12px;height:12px;transform:rotate(45deg);background:#d6b1fc;margin:auto;border-radius:3px}.day.outside{opacity:.3}.day.future:not(.today){background:#221a2c}.legend{display:flex;flex-wrap:wrap;gap:18px;margin-top:25px;color:#b5a4c5;font-size:9px}.legend>span{display:flex;align-items:center;gap:7px}.legend i{display:inline-block;width:8px;height:8px;background:#65516f;border-radius:3px}.legend .checked{background:#b5d68c}.legend .current{background:#cf9ff8}.selected-panel{text-align:center}.selected-panel h2{text-transform:capitalize;font-size:17px;margin-top:13px;line-height:1.5}.selected-seal{margin:25px auto;width:88px;height:94px;display:grid;place-items:center;background:#382741;color:#b995dc;clip-path:polygon(50% 0,95% 23%,95% 73%,50% 100%,5% 73%,5% 23%)}.selected-seal.complete{background:#b5d68c;color:#39482e}.selected-panel h3{font-size:16px;margin:0 0 12px}.selected-panel .game-button{margin-top:22px;width:100%;font-size:11px}.flame-panel{display:flex;align-items:center;gap:15px;padding:19px}.flame-panel strong{color:#ffc17b;font-size:21px;display:block;margin-bottom:9px}.flame-panel h2{font-size:14px;margin-bottom:7px}.flame-panel p{font-size:10px}.calendar-tip{display:flex;align-items:center;justify-content:center;gap:10px;color:#ab94bc}.calendar-tip p{font-size:10px;line-height:1.9}.calendar-tip strong{font-weight:500;color:#ccb1dd}@media(max-width:650px){.calendar{padding:15px}.calendar-grid{gap:6px}.day{padding:6px;min-height:56px;border-radius:8px}.day-number{font-size:10px}.day-seal{width:22px;height:24px}.day-seal svg{width:15px}.day small{font-size:6px;bottom:4px}.month-name h2{font-size:21px}.calendar .game-kicker{font-size:8px}.weekday{font-size:8px}}
</style>
