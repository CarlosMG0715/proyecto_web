<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import AdventureCharacter from '@/components/ui/AdventureCharacter.vue'
import { CHARACTERS, CHARACTER_THEMES, useCharacterStore } from '@/stores/characters'
import { getThemeBackground } from '@/constants/themeBackgrounds'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import '@/assets/styles/game-views.css'

const store = useGroupsStore()
const session = useSessionStore()
const characters = useCharacterStore()
const { dayKey } = useMidnightCountdown()
const currentStreak = computed(() => store.currentStreak(dayKey.value))

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
  <div class="game-page profile-page" :style="{ '--profile-color': characters.theme.color, '--profile-shade': characters.theme.dark }">
    <div class="game-wrap">
      <header class="game-header">
        <span class="theme-ornaments" aria-hidden="true"></span>
        <div>
          <h1>Perfil</h1>
        </div>
        <span class="game-chip">
          <AppIcon name="trophy" :size="16" />
          {{ unlocked }} / {{ milestones.length }} hitos alcanzados
        </span>
      </header>

      <section
        class="identity game-panel"
        :style="{ '--profile-cover': characters.theme.dark, '--profile-accent': characters.theme.color, '--theme-bg': `url('${getThemeBackground(characters.theme.id)}')` }"
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
            <strong>{{ currentStreak }}</strong>
            <span>racha actual · {{ currentStreak === 1 ? 'día' : 'días' }}</span>
          </div>
        </div>
      </section>

      <section
        id="personalizar"
        class="game-panel personalization"
        :aria-busy="characters.isLoading || characters.isSaving"
        :style="{ '--profile-cover': characters.theme.dark, '--profile-accent': characters.theme.color, '--theme-bg': `url('${getThemeBackground(characters.theme.id)}')` }"
      >
        <div class="game-title">
          <h2>Personalizar</h2>
        </div>

        <div class="personalization-grid">
          <div class="character-preview">
            <span class="preview-caption">Así se verá tu avatar en los grupos</span>
            <AdventureCharacter :character="characters.current" :size="140" />
            <strong>{{ name }}</strong>
          </div>

          <div class="character-picker">
            <h3>Avatar</h3>
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
          </div>

          <div class="theme-picker">
          <h3>Tema <span class="active-theme-name">{{ characters.theme.name }}</span></h3>
          <div class="theme-options">
            <button
              v-for="t in CHARACTER_THEMES"
              :key="t.id"
              :style="{ '--swatch': t.color, '--swatch-dark': t.dark, '--swatch-bg': `url('${getThemeBackground(t.id)}')` }"
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

<style scoped>
.retry-save {
  margin-left: 8px;
  padding: 4px 8px;
  border: 1px solid currentColor;
  border-radius: 7px;
  background: transparent;
  color: var(--theme-accent, #c5a9ef);
  cursor: pointer;
  font: inherit;
}

.character-option:disabled,
.theme-options button:disabled {
  opacity: .6;
  cursor: wait;
}

.identity {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0;
  position: relative;
  overflow: hidden;
  background: #251e30;
  min-height: 230px;
}

.identity-art {
  width: 250px;
  min-height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(145deg, var(--profile-cover, #4d3865) 0%, color-mix(in srgb, var(--profile-cover, #4d3865) 60%, #150f1f) 100%);
  border-right: 2px solid color-mix(in srgb, var(--profile-accent, #a37bbd) 20%, #20182b);
  flex-shrink: 0;
  transition: background 0.3s;
}

.avatar-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 10px;
  z-index: 1;
}

.avatar-stage::before {
  content: '';
  position: absolute;
  top: 45%;
  left: 50%;
  width: 210px;
  height: 210px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, color-mix(in srgb, var(--profile-accent, #a37bbd) 35%, transparent) 0%, transparent 68%);
  pointer-events: none;
  z-index: 0;
}

.avatar-ring {
  position: relative;
  z-index: 2;
  border-radius: 50%;
  padding: 5px;
  background: color-mix(in srgb, var(--profile-accent, #a37bbd) 18%, #1f172a);
  border: 2px solid color-mix(in srgb, var(--profile-accent, #a37bbd) 70%, transparent);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.3s, background 0.3s;
}

.orbit {
  position: absolute;
  top: 45%;
  left: 50%;
  border-radius: 50%;
  pointer-events: none;
  border: 1px dashed color-mix(in srgb, var(--profile-accent, #a37bbd) 45%, transparent);
  transition: border-color 0.3s;
}

.orbit.one {
  width: 170px;
  height: 170px;
  transform: translate(-50%, -50%);
}

.orbit.two {
  width: 210px;
  height: 210px;
  transform: translate(-50%, -50%) rotate(40deg);
  border-style: dotted;
  border-color: color-mix(in srgb, var(--profile-accent, #a37bbd) 25%, transparent);
}

.avatar-actions {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.avatar-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f7edff;
  background: color-mix(in srgb, var(--profile-accent, #a37bbd) 35%, #1d1527);
  border: 1px solid color-mix(in srgb, var(--profile-accent, #a37bbd) 65%, transparent);
  padding: 5px 11px;
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.avatar-tag:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--profile-accent, #a37bbd) 50%, #1d1527);
}

.switch-char-tag {
  background: #271e35;
  border-color: #6b5285;
}

.identity-info {
  flex: 1;
  min-width: 0;
  padding: 24px 0;
}

.identity-info h2 {
  font-size: 32px;
  letter-spacing: -0.04em;
  margin: 10px 0 6px;
}

.identity-info p {
  color: #c0adc9;
  font-size: 13px;
  margin: 0;
}

.member-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #ddc5eb;
  margin-top: 12px;
}

.identity-flame {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px 35px 22px 0;
  text-align: center;
}

.identity-flame strong {
  font-size: 30px;
  display: block;
  letter-spacing: -0.04em;
}

.identity-flame span {
  font-size: 9px;
  color: #d9b8b1;
}

.badges {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.badge {
  padding: 21px 15px;
  background: #251f30;
  border: 1px dashed #53405f;
  border-radius: 13px;
  text-align: center;
}

.medal {
  display: grid;
  place-items: center;
  width: 68px;
  height: 74px;
  margin: 0 auto 16px;
  clip-path: polygon(50% 0, 95% 24%, 95% 74%, 50% 100%, 5% 74%, 5% 24%);
  background: #44364d;
  color: #a99ab4;
}

.unlocked {
  border-style: solid;
  border-color: #8b6b49;
  background: #302637;
}

.unlocked .medal {
  background: var(--theme-accent, #d7ad6b);
  color: #47301e;
  filter: drop-shadow(0 4px 0 #755133);
}

.badge-state {
  font-size: 8px;
  letter-spacing: 0.12em;
  color: #afa0bb;
}

.unlocked .badge-state {
  color: var(--theme-accent, #f0c886);
}

.badge h3 {
  font-size: 12px;
  margin: 10px 0 6px;
}

.badge p {
  font-size: 10px;
  color: #b6a9c4;
  min-height: 28px;
  line-height: 1.6;
}

.badge .game-meter {
  height: 6px;
  margin: 16px 0 8px;
}

.badge > small {
  font-size: 9px;
  color: var(--theme-accent, #cbb3e1);
}

.mission {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px 0;
  border-top: 1px solid #3b3047;
}

.mission-icon {
  width: 45px;
  height: 45px;
  background: #32253f;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.mission > div {
  flex: 1;
}

.mission small {
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #c1a4df;
}

.mission h3 {
  font-size: 14px;
  margin: 6px 0;
}

.mission p {
  font-size: 10px;
  color: #b5a6c1;
  margin: 0;
}

.mission-status {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 10px;
  color: #d0b6e5;
}

.personalization {
  scroll-margin-top: 25px;
}

.personalization-grid {
  display: grid;
  gap: 16px;
}

.personalization {
  container: profile-customization / inline-size;
}

@container profile-customization (min-width: 680px) {
  .personalization-grid {
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 12px;
  }

  .character-preview {
    grid-column: 1 / -1;
  }

  .character-picker,
  .theme-picker {
    display: grid;
    grid-template-columns: subgrid;
    grid-template-rows: subgrid;
    grid-row: 2 / span 3;
  }

  .character-picker { grid-column: span 3; }
  .theme-picker { grid-column: span 4; }

  .personalization-grid h3 {
    grid-column: 1 / -1;
    margin-bottom: 0;
  }

  .personalization-grid :is(.character-options, .theme-options) {
    grid-column: 1 / -1;
    grid-row: span 2;
    grid-template-columns: subgrid;
    grid-template-rows: subgrid;
    gap: inherit;
  }

  .personalization-grid :is(.character-option, .theme-options button) {
    justify-content: center;
    border-radius: 12px;
    padding: 10px 6px;
  }
}

.character-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.character-option {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  padding: 16px 10px 14px;
  background: #2b2234;
  border: 1px solid #574061;
  border-bottom: 4px solid #140c20;
  border-radius: 13px;
  color: #e8dbf3;
  transition: transform 0.2s, border-color 0.2s, background 0.2s;
  cursor: pointer;
}

.option-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.4);
}

.character-option:hover {
  transform: translateY(-3px);
  border-color: var(--option-color);
}

.character-option.chosen {
  background: color-mix(in srgb, var(--option-color) 20%, #241c2c);
  border-color: var(--option-color);
  box-shadow: 0 0 14px color-mix(in srgb, var(--option-color) 35%, transparent);
}

.character-option strong {
  font-size: 12px;
}

.character-option > span:not(.character-icon) {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #c7b0db;
}

.character-preview {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-direction: column;
  gap: 8px;
  min-height: 264px;
  aspect-ratio: 3 / 1;
  background: var(--profile-cover);
  border-radius: 13px;
  padding: 16px 18px;
  text-align: center;
}

.character-preview::before {
  content: '';
  position: absolute;
  inset: -3%;
  z-index: -1;
  background: var(--theme-bg) center bottom / cover no-repeat;
}

.preview-caption {
  font-size: 12px;
}

.character-preview strong {
  font-size: 12px;
  background: #ecdfc9;
  border: 1px solid #6d6855;
  border-radius: 6px;
  padding: 6px 9px;
  color: #343d2f;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.character-saved {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #c3d9a7;
  margin: 16px 0 0;
}

.personalization-grid h3 {
  font-size: 13px;
  line-height: 24px;
  margin: 0 0 10px;
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.theme-options button {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 9px;
  padding: 12px 6px;
  background: #251c2e;
  border: 1px solid #4b3658;
  border-bottom: 3px solid #130b1e;
  border-radius: 9px;
  color: #d3bfdf;
  cursor: pointer;
}

.theme-options button.chosen {
  border-color: var(--swatch);
}

.theme-swatch {
  width: 52px;
  height: 38px;
  background: radial-gradient(ellipse at 75% 20%, #ffffff75 0 8%, transparent 9%), linear-gradient(160deg, var(--swatch) 0 48%, color-mix(in srgb,var(--swatch),white 20%) 49% 58%, var(--swatch-dark) 59%);
  border: 2px solid var(--swatch);
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #fff8e8;
}

.theme-options strong {
  font-size: 10px;
}

@media (max-width: 1200px) {
  .badges {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .identity-art {
    width: 200px;
  }
  .identity-flame {
    padding-right: 20px;
  }
  .identity {
    gap: 20px;
  }
  .identity-info h2 {
    font-size: 26px;
  }
}

@media (max-width: 800px) {
  .character-option {
    gap: 10px;
    padding: 14px 8px;
  }
}

@media (max-width: 700px) {
  .identity {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }
  .identity-art {
    width: 100%;
    min-height: 200px;
    border-right: none;
    border-bottom: 2px solid color-mix(in srgb, var(--profile-accent, #a37bbd) 20%, #20182b);
  }
  .identity-info {
    padding: 22px 24px 12px;
    text-align: center;
  }
  .identity-info h2 {
    font-size: 24px;
  }
  .member-label {
    justify-content: center;
  }
  .identity-flame {
    padding: 10px 24px 24px;
    flex-direction: row;
    justify-content: center;
    gap: 16px;
  }
  .identity-flame strong {
    font-size: 24px;
  }
  .badges {
    gap: 9px;
  }
  .badge {
    padding: 18px 10px;
  }
  .mission-status {
    font-size: 0;
  }
}

@media (max-width: 650px) {
  .theme-options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.identity-art::before {
  content: '';
  position: absolute;
  inset: -4%;
  background-image: var(--theme-bg);
  background-size: cover;
  background-position: center bottom;
  opacity: 0.72;
  z-index: 0;
}
.identity-art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(20, 14, 32, 0.15) 0%, rgba(20, 14, 32, 0.55) 100%);
  z-index: 0;
}
.character-preview .preview-caption {
  margin-bottom: auto;
}
.preview-caption {
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(20, 14, 32, 0.62);
  backdrop-filter: blur(4px);
  color: #fff;
  font-weight: 800;
}
.theme-swatch {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 110px;
  height: 52px;
  border: 0;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.38);
}
.theme-swatch::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--swatch-bg);
  background-size: cover;
  background-position: center;
  z-index: 0;
}
.theme-swatch > * {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.85));
}
.profile-page .identity {
  background: linear-gradient(112deg, var(--profile-shade), color-mix(in srgb, var(--profile-color) 24%, #221a2e) 65%, #231b30);
}
.profile-page .personalization,
.profile-page .game-stat,
.profile-page .badge.unlocked {
  background: color-mix(in srgb, var(--profile-color) 15%, #231c30);
}
.profile-page :is(.identity-flame strong, .game-stat > svg, .member-label, .character-saved, .mission-status) {
  color: color-mix(in srgb, var(--profile-color) 74%, white);
}
.profile-page .unlocked .medal {
  background: var(--profile-color);
  color: #211628;
  filter: drop-shadow(0 4px 0 var(--profile-shade));
}
.profile-page .game-meter > span {
  background: linear-gradient(90deg, var(--profile-color), color-mix(in srgb, var(--profile-color) 65%, white));
}
.profile-page .theme-options button.chosen {
  background: color-mix(in srgb, var(--swatch) 28%, #231b30);
  color: color-mix(in srgb, var(--swatch) 48%, white);
}
.active-theme-name {
  margin-inline-start: 8px;
  padding: 4px 9px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--profile-color) 28%, #231b30);
  color: color-mix(in srgb, var(--profile-color) 65%, white);
  font-size: 11px;
}

</style>
