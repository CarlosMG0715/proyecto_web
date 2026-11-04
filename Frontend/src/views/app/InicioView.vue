<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import { useCharacterStore } from '@/stores/characters'
import { useCreateGroupModal } from '@/composables/useCreateGroupModal'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import '@/assets/styles/views/inicio.css'

const session = useSessionStore()
const characters = useCharacterStore()
const store = useGroupsStore()
const modal = useCreateGroupModal()
const { hours, minutes } = useMidnightCountdown()
const name = computed(() => session.currentUser?.name ?? 'Valeria')
const date = new Date().toLocaleDateString('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const habits = computed(() => store.groups.flatMap(group => {
  const member = group.members.find(m => m.isCurrentUser)
  return member ? [{ group, member }] : []
}))
const total = computed(() => store.doneToday + store.pendingToday)
const ready = computed(() => total.value > 0 && !store.pendingToday)
const progress = computed(() =>
  total.value ? Math.round((store.doneToday / total.value) * 100) : 0,
)
const claimed = ref(false)
const missing = ref(false)
function claim() {
  if (ready.value) claimed.value = true
  else missing.value = true
}
const average = computed(() =>
  Math.round(store.weekProgress.reduce((sum, day) => sum + day.value, 0) / 7),
)
const activity = computed(() => store.activity.slice(0, 5))
function time(at: string) {
  return new Date(at).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="inicio-page">
    <div class="dashboard">
      <header class="heading">
        <div>
          <h1>
            Hola,
            {{ name.split(' ')[0] }}
            <em>.</em>
          </h1>
        </div>
        <span class="date"><AppIcon name="calendar" :size="16" />{{ date }}</span>
      </header>
      <div class="columns">
        <div class="main-column">
          <div v-if="claimed" class="day-victory" role="status">
            <StreakFlame :size="58" />
            <div>
              <strong>Día completado</strong>
            </div>
            <AppIcon name="shield" :size="30" />
          </div>
          <section class="daily surface">
            <div class="daily-top">
              <div>
                <h2>Progreso de hoy</h2>
              </div>
              <div class="score">
                <span class="score-label">PROGRESO DIARIO</span>
                <strong>
                  {{ store.doneToday }}
                  <span>/{{ total }}</span>
                </strong>
                <small>hábitos de hoy</small>
              </div>
            </div>
            <div
              class="track"
              role="progressbar"
              :aria-valuenow="progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Hábitos completados hoy"
            >
              <span :style="{ width: `${progress}%` }">
              </span>
            </div>
            <div class="daily-bottom">
              <span>
                <i class="dot"></i>
                {{ ready ? 'Todo listo. Cierra tu día.' : 'Pendientes: ' + store.pendingToday }}
              </span>
              <span>
                <AppIcon name="clock" :size="13" />
                {{ hours }}
                h
                {{ String(minutes).padStart(2, '0') }}
                min restantes
              </span>
            </div>
          </section>
          <section>
            <div class="section-title">
              <h2>
                Hábitos de hoy
                <b class="count">{{ total }}</b>
              </h2>
            </div>
            <div class="surface habits">
              <RouterLink
                v-for="(h, i) in habits"
                :key="h.group.id"
                :to="{ name: 'grupo', params: { groupId: h.group.id } }"
                class="habit"
                :class="{ done: h.member.checkedInToday }"
              >
                <span class="habit-number">
                  <AppIcon v-if="h.member.checkedInToday" name="check" />
                  <template v-else>{{ String(i + 1).padStart(2, '0') }}</template>
                </span>
                <div class="habit-copy">
                  <small>{{ h.group.name }}</small>
                  <h3>{{ h.member.habit }}</h3>
                  <p>
                    {{ h.member.checkedInToday ? 'Completado · Sumaste a tu equipo' : 'Registra tu avance dentro del grupo' }}
                  </p>
                </div>
                <span class="habit-link">
                  <span>{{ h.member.checkedInToday ? 'Ver grupo' : 'Continuar' }}</span>
                  <AppIcon name="arrow-right" :size="16" />
                </span>
              </RouterLink>
              <div v-if="!habits.length" class="empty">
                <AppIcon name="target" :size="30" />
                <h3>Tu primer hábito empieza aquí</h3>
                <p>Crea un grupo y comienza a avanzar en equipo.</p>
                <button class="secondary" @click="modal.open">Crear grupo</button>
              </div>
              <div class="check-footer">
                <span>
                  <AppIcon name="shield" :size="18" />
                  {{ claimed ? 'Día completado. ¡Bien hecho!' : 'Check diario' }}
                </span>
                <button class="claim" :disabled="claimed || !total" @click="claim">
                  <AppIcon :name="claimed ? 'check' : 'flame'" :size="16" />
                  {{ claimed ? 'Check completado' : 'Check general' }}
                </button>
              </div>
            </div>
          </section>
          <section>
            <div class="section-title">
              <h2>
                Tus equipos
                <b class="count">{{ store.groups.length }}</b>
              </h2>
              <div style="display:flex;gap:14px">
                <button class="text-button" @click="modal.openCreate">
                  <AppIcon name="plus" :size="15" />
                  Crear grupo
                </button>
                <button class="text-button" @click="modal.openJoin">
                  <AppIcon name="link" :size="15" />
                  Unirme a un grupo
                </button>
              </div>
            </div>
            <div class="teams">
              <RouterLink
                v-for="g in store.groups"
                :key="g.id"
                :to="{ name: 'grupo', params: { groupId: g.id } }"
                class="team surface"
                :style="{ '--team': g.color }"
              >
                <div class="team-top">
                  <span class="emblem"><AppIcon name="users" :size="24" /></span>
                  <span class="team-streak"><StreakFlame :size="24" />{{ g.streak }}días</span>
                </div>
                <h3>{{ g.name }}</h3>
                <p>{{ g.category }}</p>
                <div class="team-people">
                  <div class="avatars">
                    <template v-for="m in g.members.slice(0, 5)" :key="m.id">
                      <CharacterIcon
                        :character="characters.forMember(m.id, m.isCurrentUser, m.name)"
                        :size="33"
                      />
                    </template>
                  </div>
                  <AppIcon name="arrow-right" :size="17" />
                </div>
                <div class="team-track">
                  <span
                    :style="{ width: `${g.members.length ? g.members.filter(m => m.checkedInToday).length / g.members.length * 100 : 0}%` }"
                  ></span>
                </div>
                <small>
                  {{ g.members.filter(m => m.checkedInToday).length }}
                  de
                  {{ g.members.length }}
                  completaron hoy
                </small>
              </RouterLink>
              <button class="new-team" @click="modal.open">
                <span><AppIcon name="plus" :size="24" /></span>
                <strong>Un nuevo equipo</strong>
              </button>
            </div>
          </section>
          <section>
            <div class="section-title">
              <h2>En comunidad</h2>
              <small class="live"><i class="dot"></i>Actividad de tus equipos</small>
            </div>
            <div class="surface feed">
              <article v-for="a in activity" :key="a.id" class="feed-row">
                <span class="feed-icon" :class="a.kind">
                  <AppIcon
                    :name="a.kind === 'check-in' ? 'check' : a.kind === 'streak' ? 'flame' : a.kind === 'join' ? 'users' : 'bell'"
                    :size="19"
                  />
                </span>
                <div>
                  <RouterLink
                    :to="{ name: 'grupo', params: { groupId: a.groupId } }"
                    class="feed-group"
                  >
                    {{ store.groupById(a.groupId)?.name ?? 'Kordia' }}
                  </RouterLink>
                  <p>{{ a.text }}</p>
                  <time :datetime="a.at">{{ time(a.at) }}</time>
                </div>
                <AppIcon name="activity" :size="17" class="feed-mark" />
              </article>
              <p v-if="!activity.length" class="empty">Los avances de tus equipos aparecerán aquí.</p>
            </div>
          </section>
        </div>
        <aside class="right-column">
          <section
            class="profile surface"
            :style="{ '--profile-cover': characters.theme.dark, '--profile-accent': characters.theme.color }"
          >
            <div class="cover">
              <span class="cover-shape first">
              </span>
              <span class="cover-shape second">
              </span>
              <AppIcon name="target" :size="58" />
            </div>
            <div class="profile-body">
              <div class="character"><CharacterIcon :character="characters.current" :size="96" /></div>
              <h2>{{ name }}</h2>
              <RouterLink :to="{ name: 'perfil' }">Ver mi perfil<AppIcon name="arrow-right" :size="14" /></RouterLink>
            </div>
            <div class="profile-stats">
              <div>
                <strong>{{ store.groups.length }}</strong>
                <span>equipos</span>
              </div>
              <div>
                <strong>{{ store.doneToday }}</strong>
                <span>checks hoy</span>
              </div>
              <div>
                <strong>{{ store.bestStreak }}</strong>
                <span>mejor racha</span>
              </div>
            </div>
          </section>
          <section class="streak surface">
            <div class="section-title">
              <h2>Racha personal</h2>
              <StreakFlame :size="32" />
            </div>
            <div class="streak-score">
              <strong>{{ store.bestStreak }}</strong>
              <div>
                <b>días</b>
                <small>mejor racha</small>
              </div>
              <StreakFlame :size="90" />
            </div>
            <div class="week">
              <div
                v-for="d in store.weekProgress"
                :key="d.key"
                :class="{ today: d.isToday, full: d.value === 100 }"
              >
                <small>{{ d.label }}</small>
                <span :title="`${d.value}% de cumplimiento del equipo`">
                  <AppIcon v-if="d.value === 100" name="check" :size="15" />
                  <i v-else></i>
                </span>
              </div>
            </div>
          </section>
          <section class="weekly surface">
            <div class="section-title">
              <h2>El ritmo del equipo</h2>
              <AppIcon name="activity" :size="18" />
            </div>
            <div class="weekly-score">
              <strong>
                {{ average }}
                <span>%</span>
              </strong>
              <p>cumplimiento promedio<br />en los últimos 7 días</p>
            </div>
            <div
              class="chart"
              role="img"
              aria-label="Cumplimiento grupal de los últimos siete días"
            >
              <div v-for="d in store.weekProgress" :key="d.key" :class="{ today: d.isToday }">
                <div class="bar">
                  <span
                    :style="{ height: `${Math.max(d.value, 3)}%` }"
                    :title="`${d.label}: ${d.value}%`"
                  ></span>
                </div>
                <small>{{ d.label }}</small>
              </div>
            </div>
            <div class="monthly">
              <span>Tu constancia · últimos 30 días</span>
              <strong>{{ store.completionRate30 }}%</strong>
            </div>
          </section>
        </aside>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="missing"
        class="inicio-backdrop"
        @click.self="missing = false"
        @keydown.esc="missing = false"
      >
        <section
          class="inicio-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="missing-title"
        >
          <button autofocus class="close" aria-label="Cerrar" @click="missing = false"><AppIcon name="x" /></button>
          <AppIcon name="target" :size="30" />
          <h2 id="missing-title">Un paso antes del check</h2>
          <p>Completa tus hábitos pendientes dentro de cada grupo para cerrar el día.</p>
          <RouterLink
            v-for="h in habits.filter(h => !h.member.checkedInToday)"
            :key="h.group.id"
            :to="{ name: 'grupo', params: { groupId: h.group.id } }"
            class="missing-habit"
            @click="missing = false"
          >
            <span>
              <small>{{ h.group.name }}</small>
              <strong>{{ h.member.habit }}</strong>
            </span>
            <AppIcon name="arrow-right" />
          </RouterLink>
          <button class="secondary" @click="missing = false">Volver al inicio</button>
        </section>
      </div>
    </Teleport>
  </div>
</template>
