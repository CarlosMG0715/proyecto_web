<script setup lang="ts">
import '@/assets/styles/views/perfil.css'
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import AdventureCharacter from '@/components/ui/AdventureCharacter.vue'
import { CHARACTERS, CHARACTER_THEMES, useCharacterStore } from '@/stores/characters'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import '@/assets/styles/game-views.css'

const store = useGroupsStore()
const session = useSessionStore()
const characters = useCharacterStore()

const name = computed(() => session.currentUser?.name ?? 'Valeria')
const email = computed(() => session.currentUser?.email ?? '')
const memberships = computed(() => store.groups.flatMap(group => {
  const member = group.members.find(m => m.isCurrentUser)
  return member ? [{ group, member }] : []
}))
const days = computed(() => new Set(store.checkInHistory).size)

const milestones = computed(() => [
  { title: 'Primer paso', goal: 'Registra tu primer día', target: 1, value: days.value, icon: 'target' as const },
  { title: 'En equipo', goal: 'Únete a un grupo', target: 1, value: store.groups.length, icon: 'users' as const },
  { title: 'Una semana más fuerte', goal: 'Alcanza 7 días de racha', target: 7, value: store.bestStreak, icon: 'shield' as const },
  { title: 'El hábito se queda', goal: 'Registra 30 días de actividad', target: 30, value: days.value, icon: 'trophy' as const },
])

const unlocked = computed(() => milestones.value.filter((m) => m.value >= m.target).length)
</script>

<template>
  <div class="game-page perfil-view">
    <div class="game-wrap">
      <header class="game-header">
        <div>
          <h1>Perfil</h1>
        </div>
        <span class="game-chip">
          <AppIcon name="trophy" :size="16" />
          {{ unlocked }} / {{ milestones.length }} hitos alcanzados
        </span>
      </header>

      <!-- Tarjeta de Identidad y Avatar -->
      <section
        class="identity game-panel"
        :style="{ '--profile-cover': characters.theme.dark, '--profile-accent': characters.theme.color }"
      >
        <div class="identity-art">
          <div class="avatar-stage">
            <span class="orbit one"></span>
            <span class="orbit two"></span>
            <div class="avatar-ring">
              <CharacterIcon :character="characters.current" :size="124" />
            </div>

          </div>
        </div>

        <div class="identity-info">
          <h2>{{ name }}</h2>
          <p>{{ email }}</p>
          <span class="member-label">
            <AppIcon name="users" :size="14" />
            {{ store.groups.length }} {{ store.groups.length === 1 ? 'equipo' : 'equipos' }} · {{ days }} días registrados
          </span>
        </div>

        <div class="identity-flame">
          <StreakFlame :size="104" />
          <div>
            <strong>{{ store.bestStreak }}</strong>
            <span>mejor racha · días</span>
          </div>
        </div>
      </section>

      <!-- Personalización de personaje y tema -->
      <section
        id="personalizar"
        class="game-panel personalization"
        :aria-busy="characters.isLoading || characters.isSaving"
        :style="{ '--profile-cover': characters.theme.dark, '--profile-accent': characters.theme.color }"
      >
        <div class="game-title">
          <h2>Personalizar</h2>
        </div>

        <div class="personalization-grid">
          <div class="character-options">
            <button
              v-for="c in CHARACTERS"
              :key="c.id"
              class="character-option"
              :class="{ chosen: characters.current.id === c.id }"
              :style="{ '--option-color': c.color }"
              :aria-label="`Elegir ${c.name}`"
              :aria-pressed="characters.current.id === c.id"
              :disabled="characters.isLoading"
              @click="characters.select(c.id)"
            >
              <div class="option-icon-wrap">
                <CharacterIcon :character="c" :size="62" />
              </div>
              <strong>{{ c.name }}</strong>
              <span v-if="characters.current.id === c.id">
                <AppIcon name="check" :size="12" />Elegido
              </span>
              <span v-else>Elegir</span>
            </button>
          </div>

          <div class="character-preview">
            <span class="preview-caption">EN LA AVENTURA</span>
            <AdventureCharacter :character="characters.current" :size="112" />
            <strong>{{ name }}</strong>
            <span>{{ characters.current.name }}</span>
          </div>
        </div>

        <div class="theme-picker">
          <h3>Tema</h3>
          <div class="theme-options">
            <button
              v-for="t in CHARACTER_THEMES"
              :key="t.id"
              :style="{ '--swatch': t.color, '--swatch-dark': t.dark }"
              :class="{ chosen: characters.theme.id === t.id }"
              :aria-label="`Tema ${t.name}`"
              :aria-pressed="characters.theme.id === t.id"
              :disabled="characters.isLoading"
              @click="characters.selectTheme(t.id)"
            >
              <span class="theme-swatch">
                <AppIcon v-if="characters.theme.id === t.id" name="check" :size="18" />
              </span>
              <strong>{{ t.name }}</strong>
            </button>
          </div>
        </div>

        <p v-if="characters.isLoading" class="game-muted" role="status">Cargando personalización…</p>
        <p v-else-if="characters.isSaving" class="game-muted" role="status">Guardando en tu cuenta…</p>
        <p v-else-if="characters.error" role="status" class="game-muted">
          {{ characters.error }}
          <button type="button" class="retry-save" @click="characters.retrySync()">Reintentar</button>
        </p>
        <p v-else-if="characters.isSaved" class="character-saved" role="status">
          <AppIcon name="check" :size="13" />Guardado en tu cuenta
        </p>
      </section>

      <!-- Métricas -->
      <div class="game-stat-grid">
        <div class="game-stat">
          <AppIcon name="calendar" />
          <strong>{{ days }}</strong>
          <small>Días con actividad</small>
        </div>
        <div class="game-stat">
          <AppIcon name="target" />
          <strong>{{ store.completionRate30 }}%</strong>
          <small>Constancia en 30 días</small>
        </div>
        <div class="game-stat">
          <AppIcon name="check" />
          <strong>{{ store.doneToday }}</strong>
          <small>Hábitos completados hoy</small>
        </div>
      </div>

      <!-- Hitos -->
      <section class="game-panel">
        <div class="game-title">
          <h2>Tu colección de hitos</h2>
        </div>
        <div class="badges">
          <article
            v-for="m in milestones"
            :key="m.title"
            class="badge"
            :class="{ unlocked: m.value >= m.target }"
          >
            <span class="medal">
              <AppIcon :name="m.icon" :size="30" />
            </span>
            <span class="badge-state">{{ m.value >= m.target ? 'ALCANZADO' : 'EN PROGRESO' }}</span>
            <h3>{{ m.title }}</h3>
            <p>{{ m.goal }}</p>
            <div class="game-meter">
              <span :style="{ width: `${Math.min((m.value / m.target) * 100, 100)}%` }"></span>
            </div>
            <small>{{ Math.min(m.value, m.target) }} / {{ m.target }}</small>
          </article>
        </div>
      </section>

      <!-- Misiones -->
      <section class="game-panel">
        <div class="game-title">
          <h2>Mis misiones de equipo</h2>
          <small>{{ memberships.length }} {{ memberships.length === 1 ? 'compromiso' : 'compromisos' }}</small>
        </div>
        <RouterLink
          v-for="h in memberships"
          :key="h.group.id"
          :to="{ name: 'grupo', params: { groupId: h.group.id } }"
          class="mission"
        >
          <span class="mission-icon" :style="{ color: h.group.color }">
            <AppIcon name="target" :size="23" />
          </span>
          <div>
            <small>{{ h.group.name }}</small>
            <h3>{{ h.member.habit }}</h3>
            <p>{{ h.member.daysCompleted }} de {{ h.member.daysTotal }} días completados</p>
          </div>
          <span class="mission-status">
            <AppIcon :name="h.member.checkedInToday ? 'check' : 'arrow-right'" :size="17" />
            {{ h.member.checkedInToday ? 'Hoy completado' : 'Ir al equipo' }}
          </span>
        </RouterLink>
        <p v-if="!memberships.length" class="game-empty">
          Tus hábitos aparecerán aquí cuando formes parte de un equipo.
        </p>
      </section>
    </div>
  </div>
</template>
