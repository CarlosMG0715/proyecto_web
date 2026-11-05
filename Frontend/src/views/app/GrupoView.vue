<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import AdventureCharacter from '@/components/ui/AdventureCharacter.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import GroupChat from '@/components/group/GroupChat.vue'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import { GROUP_COLORS, useGroupsStore } from '@/stores/groups'
import { GROUP_CATEGORIES } from '@/constants/groupCategories'
import { useCharacterStore } from '@/stores/characters'
import { useSessionStore } from '@/stores/session'
import type { GroupHabit } from '@/types/group'
import '@/assets/styles/game-views.css'

const route = useRoute()
const router = useRouter()
const store = useGroupsStore()
const characters = useCharacterStore()
const session = useSessionStore()
const { hours, minutes } = useMidnightCountdown()

const group = computed(() => store.groupById(String(route.params.groupId)))
const selectedId = ref('')
const selectedMember = computed(
  () =>
    group.value?.members.find((m) => m.id === selectedId.value) ??
    group.value?.members.find((m) => m.isCurrentUser) ??
    group.value?.members[0],
)
const me = computed(() => group.value?.members.find((m) => m.isCurrentUser))
const isAdmin = computed(() => me.value?.role === 'ADMIN')
const nameOf = (m: { name: string; isCurrentUser: boolean }) =>
  m.isCurrentUser ? session.currentUser?.name ?? m.name : m.name
const done = computed(() => group.value?.members.filter((m) => m.checkedInToday).length ?? 0)

const isChatOpen = ref(true)
/** true = Chat grande slideado al lado derecho; false = Chat minimizado como estaba abajo */
const isChatExpanded = ref(true)
const editing = ref(false)
const editingGroup = ref(false)
const confirmingLeave = ref(false)
const draft = ref('')
const habitIconDraft = ref('🎯')
const targetDaysDraft = ref<30 | 90 | 120>(30)
const editingHabitId = ref<string | null>(null)
const groupNameDraft = ref('')
const groupCategoryDraft = ref('')
const groupDescriptionDraft = ref('')
const groupColorDraft = ref('#8b5cf6')
const groupCategoryIcon = computed(
  () => GROUP_CATEGORIES.find((category) => category.label === groupCategoryDraft.value)?.icon ?? 'target',
)
const saving = ref(false)
const notice = ref('')
const codeCopied = ref(false)

async function copyGroupCode() {
  if (!group.value) return
  try {
    await navigator.clipboard.writeText(group.value.inviteCode)
  } catch {
    /* ok */
  }
  codeCopied.value = true
  setTimeout(() => {
    codeCopied.value = false
  }, 2000)
}

const pending = computed(() => group.value?.members.filter((m) => !m.checkedInToday) ?? [])
const healthHearts = computed(() => {
  const health = group.value?.health ?? 0
  const alive = Math.ceil(health / 20)
  return Array.from({ length: 5 }, (_, index) => ({
    index,
    alive: health >= (index + 1) * 20,
    threatened: pending.value.length > 0 && index < alive && index >= Math.max(0, alive - pending.value.length),
  }))
})
const alert = computed(() =>
  pending.value.length
    ? `Pendientes: ${pending.value.map(nameOf).join(', ')}. Cierre a medianoche.`
    : 'Equipo completo: todos registraron su hábito hoy.',
)
const lastMessage = computed(() =>
  group.value?.messages.filter((m) => m.authorId === selectedMember.value?.id).at(-1),
)
const milestones = [1, 3, 7, 14, 30]
const missionLengths = [30, 90, 120] as const
const habitIcons = ['🎯', '🔥', '📚', '💧', '🏃', '🧘', '🌱', '🎨', '💤', '💪', '🎵', '✨']

watch(
  () => group.value?.id,
  () => {
    selectedId.value = ''
    editing.value = false
    confirmingLeave.value = false
    notice.value = ''
  },
)

async function toggle() {
  if (!group.value || !me.value) return
  try {
    await store.toggleMyCheckIn(group.value.id)
    notice.value = me.value.checkedInToday ? 'Check-in completado' : 'Check-in pendiente'
  } catch {
    notice.value = store.error ?? 'No se pudo guardar el check-in.'
  }
}

function openEditor(habit?: GroupHabit) {
  draft.value = habit?.name ?? ''
  habitIconDraft.value = habit?.icon ?? '🎯'
  targetDaysDraft.value = habit?.targetDays ?? 30
  editingHabitId.value = habit?.id ?? null
  editing.value = true
}

async function saveHabit() {
  if (!group.value || !draft.value.trim() || !isAdmin.value) return
  saving.value = true
  try {
    if (editingHabitId.value) {
      await store.editGroupHabit(
        group.value.id,
        editingHabitId.value,
        draft.value.trim(),
        targetDaysDraft.value,
        habitIconDraft.value,
      )
    } else {
      await store.createGroupHabit(
        group.value.id,
        draft.value.trim(),
        habitIconDraft.value,
        targetDaysDraft.value,
      )
    }
    editing.value = false
    editingHabitId.value = null
  } catch {
    notice.value = store.error ?? 'No se pudo guardar el hábito.'
  } finally {
    saving.value = false
  }
}

async function removeHabit(habitId: string, habitName: string) {
  if (!group.value || !isAdmin.value || !window.confirm(`¿Quitar “${habitName}” del grupo?`)) return
  try {
    await store.removeGroupHabit(group.value.id, habitId)
  } catch {
    notice.value = store.error ?? 'No se pudo quitar el hábito.'
  }
}

async function toggleMemberRole(member: NonNullable<typeof selectedMember.value>) {
  if (!group.value || !isAdmin.value || member.isCurrentUser) return
  const nextRole = member.role === 'ADMIN' ? 'MIEMBRO' : 'ADMIN'
  try {
    await store.setGroupMemberRole(group.value.id, member.id, nextRole)
    notice.value = nextRole === 'ADMIN' ? `${nameOf(member)} ahora administra el grupo.` : `Se quitó el rol admin de ${nameOf(member)}.`
  } catch {
    notice.value = store.error ?? 'No se pudo cambiar el rol.'
  }
}

async function removeMember(member: NonNullable<typeof selectedMember.value>) {
  if (!group.value || !isAdmin.value || member.isCurrentUser) return
  if (!window.confirm(`¿Sacar a ${nameOf(member)} del grupo?`)) return
  try {
    await store.removeGroupMember(group.value.id, member.id)
    selectedId.value = ''
    notice.value = `${nameOf(member)} salió del grupo.`
  } catch {
    notice.value = store.error ?? 'No se pudo quitar a esta persona.'
  }
}

function openGroupEditor() {
  if (!group.value) return
  selectedId.value = me.value?.id ?? ''
  groupNameDraft.value = group.value.name
  groupCategoryDraft.value = group.value.category
  groupDescriptionDraft.value = group.value.description
  groupColorDraft.value = group.value.color
  editingGroup.value = true
}

async function saveGroup() {
  if (!group.value || !isAdmin.value || groupNameDraft.value.trim().length < 3) return
  saving.value = true
  try {
    await store.updateGroup(group.value.id, {
      name: groupNameDraft.value.trim(),
      category: groupCategoryDraft.value.trim() || 'General',
      description: groupDescriptionDraft.value.trim(),
      color: groupColorDraft.value,
    })
    editingGroup.value = false
  } catch {
    notice.value = store.error ?? 'No se pudieron guardar los datos del grupo.'
  } finally {
    saving.value = false
  }
}

async function send(text: string) {
  if (!group.value) return
  try {
    await store.sendMessage(group.value.id, text)
  } catch {
    notice.value = store.error ?? 'No se pudo enviar el mensaje.'
  }
}

async function handleLeaveGroup() {
  if (!group.value) return
  const id = group.value.id
  try {
    await store.leaveGroup(id)
    confirmingLeave.value = false
    await router.push({ name: 'inicio' })
  } catch {
    notice.value = store.error ?? 'No se pudo salir del grupo.'
  }
}
</script>

<template>
  <div v-if="group" class="adventure-page">
    <div class="adventure-wrap" :class="{ 'with-side-chat': isChatOpen && isChatExpanded }">
      <header class="adventure-header">
        <div>
          <RouterLink :to="{ name: 'inicio' }" class="back">
            <AppIcon name="chevron-left" :size="15" />Inicio
          </RouterLink>
          <h1>{{ group.name }}</h1>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="invite-badge"
            title="Copiar código de invitación"
            @click="copyGroupCode"
          >
            <span class="invite-label">
              <AppIcon :name="codeCopied ? 'check' : 'copy'" :size="12" />
              {{ codeCopied ? '¡Copiado!' : 'Código' }}
            </span>
            <strong>{{ group.inviteCode }}</strong>
          </button>

          <button
            type="button"
            class="game-button secondary chat-toggle"
            :aria-expanded="isChatOpen"
            @click="isChatOpen = !isChatOpen"
          >
            <AppIcon name="message" :size="16" />
            {{ isChatOpen ? 'Ocultar chat' : 'Abrir chat' }}
          </button>

          <button v-if="isAdmin" type="button" class="game-button secondary edit-group-trigger" @click="openGroupEditor">
            <AppIcon name="settings" :size="15" />Editar grupo
          </button>

          <button
            type="button"
            class="leave-btn"
            title="Salir de este grupo"
            @click="confirmingLeave = true"
          >
            <AppIcon name="logout" :size="15" />
            <span>Salir del grupo</span>
          </button>
        </div>
      </header>

      <!-- Cuerpo principal: si el chat está en modo Grande Lateral, divide pantalla completa -->
      <div class="adventure-body" :class="{ 'side-chat-active': isChatOpen && isChatExpanded }">
        <div class="adventure-main-col">
          <section
            class="world"
            :style="{
              '--sky': characters.theme.sky,
              '--mountain': characters.theme.mountain,
              '--grass': characters.theme.grass,
            }"
            aria-label="Escenario de aventura del equipo"
          >
            <div class="world-hud">
              <span class="world-title"><span class="world-pip"></span>VALLE DEL EQUIPO</span>
              <span class="world-streak"><StreakFlame :size="31" />{{ group.streak }} días</span>
              <span class="world-time">
                <AppIcon name="clock" :size="14" />{{ hours }}:{{ String(minutes).padStart(2, '0') }}
              </span>
            </div>

            <div class="scenery" aria-hidden="true">
              <span class="sun"></span>
              <span class="cloud cloud-one"></span>
              <span class="cloud cloud-two"></span>
              <span class="mountain mountain-one"></span>
              <span class="mountain mountain-two"></span>
              <span class="mountain mountain-three"></span>
              <span class="hill hill-one"></span>
              <span class="hill hill-two"></span>
              <span class="pine pine-one"></span>
              <span class="pine pine-two"></span>
              <span class="pine pine-three"></span>
              <span class="trail"></span>
              <span class="camp-flag"></span>
              <span class="flower flower-one">✿</span>
              <span class="flower flower-two">✿</span>
              <span class="flower flower-three">✿</span>
            </div>

            <div class="world-route">
              <div
                v-for="(goal, index) in milestones"
                :key="goal"
                class="route-stop"
                :class="{ reached: group.streak >= goal }"
              >
                <span>
                  <AppIcon :name="index === milestones.length - 1 ? 'trophy' : 'check'" :size="14" />
                </span>
                <small>{{ goal }} d</small>
              </div>
            </div>

            <div class="players" :style="{ '--players': group.members.length }">
              <button
                v-for="(m, index) in group.members"
                :key="m.id"
                class="player"
                :class="{ selected: selectedMember?.id === m.id, completed: m.checkedInToday }"
                :style="{ '--index': index }"
                :aria-label="`Ver a ${nameOf(m)}${m.checkedInToday ? ', hábito completado' : ', hábito pendiente'}`"
                :aria-pressed="selectedMember?.id === m.id"
                @click="selectedId = m.id"
              >
                <span class="player-bubble">
                  <AppIcon :name="m.checkedInToday ? 'check' : 'clock'" :size="12" />
                  {{ m.checkedInToday ? '¡Listo!' : 'Pendiente' }}
                </span>
                <AdventureCharacter
                  :character="characters.forMember(m.id, m.isCurrentUser, m.name)"
                  :complete="m.checkedInToday"
                  :size="88"
                />
                <span class="player-name">
                  {{ nameOf(m) }}<b v-if="m.isCurrentUser">TÚ</b>
                </span>
              </button>
            </div>

            <div class="world-bottom">
              <span>
                <AppIcon name="users" :size="15" />{{ done }}/{{ group.members.length }} checks hoy
              </span>
              <div class="world-progress">
                <span
                  :style="{
                    width: `${group.members.length ? (done / group.members.length) * 100 : 0}%`,
                  }"
                ></span>
              </div>
              <div class="team-lives" :class="{ 'lives-at-risk': pending.length }" :aria-label="`${Math.ceil(group.health / 20)} de 5 corazones del equipo`">
                <span class="lives-label">SALUD DEL EQUIPO</span>
                <span class="heart-row">
                  <AppIcon
                    v-for="heart in healthHearts"
                    :key="heart.index"
                    name="heart"
                    :size="19"
                    :class="{ alive: heart.alive, threatened: heart.threatened }"
                  />
                </span>
                <span class="lives-caption">
                  <template v-if="pending.length">{{ pending.length }} {{ pending.length === 1 ? 'misión pendiente' : 'misiones pendientes' }} · corazones en riesgo</template>
                  <template v-else>El equipo está a salvo hoy</template>
                </span>
              </div>
            </div>
          </section>

          <div
            class="adventure-content"
            :class="{ 'chat-closed': !isChatOpen || isChatExpanded }"
          >
            <div class="game-stack">
              <section v-if="selectedMember" class="game-panel player-panel">
                <div class="player-detail-heading">
                  <CharacterIcon
                    :character="characters.forMember(selectedMember.id, selectedMember.isCurrentUser, selectedMember.name)"
                    :size="58"
                  />
                  <div>
                    <h2>{{ nameOf(selectedMember) }}</h2>
                    <span>{{ selectedMember.isCurrentUser ? 'Tu misión' : 'Misión del equipo' }}</span>
                  </div>
                  <RouterLink
                    v-if="selectedMember.isCurrentUser"
                    :to="{ name: 'perfil', hash: '#personalizar' }"
                    class="customize-link"
                  >
                    <AppIcon name="settings" :size="15" />Personalizar
                  </RouterLink>
                </div>

                <div class="current-habit">
                  <AppIcon name="target" :size="21" />
                  <strong>{{ selectedMember.habit }}</strong>
                  <span :class="{ complete: selectedMember.checkedInToday }">
                    {{ selectedMember.checkedInToday ? 'Completado' : 'Pendiente' }}
                  </span>
                </div>

                <div class="player-metrics">
                  <div>
                    <AppIcon name="flame" :size="16" />
                    <strong>{{ selectedMember.streak }}</strong>
                    <small>días de racha</small>
                  </div>
                  <div>
                    <AppIcon name="check" :size="16" />
                    <strong>{{ selectedMember.daysCompleted }}/{{ selectedMember.daysTotal }}</strong>
                    <small>días cumplidos</small>
                  </div>
                  <div>
                    <AppIcon name="trophy" :size="16" />
                    <strong>
                      {{
                        milestones.filter((n) => selectedMember && selectedMember.streak >= n)
                          .length
                      }}/{{ milestones.length }}
                    </strong>
                    <small>hitos de racha</small>
                  </div>
                </div>

                <div v-if="lastMessage" class="last-message">
                  <AppIcon name="message" :size="15" />
                  <p>{{ lastMessage.text }}</p>
                </div>

                <div v-if="selectedMember.isCurrentUser" class="player-controls">
                  <button
                    class="game-button checkin-button"
                    :class="{ completed: selectedMember.checkedInToday }"
                    :aria-pressed="selectedMember.checkedInToday"
                    @click="toggle"
                  >
                    <AppIcon :name="selectedMember.checkedInToday ? 'check' : 'flame'" :size="19" />
                    {{ selectedMember.checkedInToday ? 'Check-in completado · Deshacer' : '¡Hacer check de hoy!' }}
                  </button>
                </div>

                <p v-if="notice && selectedMember.isCurrentUser" class="check-notice" role="status">
                  {{ notice }}
                </p>
              </section>

              <section class="game-panel team-habits">
                <div class="game-title">
                  <h2>Hábitos del grupo</h2>
                  <button v-if="isAdmin" class="game-button secondary add-habit-button" @click="openEditor()">
                    <AppIcon name="plus" :size="19" />Crear hábito
                  </button>
                </div>
                <p v-if="!group.habits?.length" class="habit-empty">Aún no hay hábitos activos en esta aventura.</p>
                <article v-for="habit in group.habits ?? []" :key="habit.id" class="team-habit-row">
                  <span class="team-habit-icon">{{ habit.icon || '🎯' }}</span>
                  <div class="team-habit-copy">
                    <strong>{{ habit.name }}</strong>
                    <small>{{ habit.description || 'Misión diaria del equipo' }} · Meta: {{ habit.targetDays }} días</small>
                  </div>
                  <span class="habit-check-state" :class="{ complete: habit.checks[me?.id ?? '']?.done }">
                    {{ habit.checks[me?.id ?? '']?.done ? 'Hecho' : 'Pendiente' }}
                  </span>
                  <div v-if="isAdmin" class="habit-actions">
                    <button class="edit-habit" @click="openEditor(habit)">
                      <AppIcon name="settings" :size="14" />Editar
                    </button>
                    <button class="edit-habit remove-habit" @click="removeHabit(habit.id, habit.name)">
                      <AppIcon name="x" :size="14" />Quitar
                    </button>
                  </div>
                </article>
              </section>

              <section class="game-panel team-roster">
                <div class="game-title">
                  <h2>Equipo</h2>
                  <small>{{ group.members.length }} miembros</small>
                </div>
                <article
                  v-for="m in group.members"
                  :key="m.id"
                  class="roster-member"
                >
                  <CharacterIcon :character="characters.forMember(m.id, m.isCurrentUser, m.name)" :size="35" />
                  <span class="roster-member-copy">
                    {{ nameOf(m) }}
                    <small>{{ m.habit }}</small>
                    <small class="roster-role" :class="{ leader: m.role === 'ADMIN' }">
                      {{ m.role === 'ADMIN' ? 'Admin' : 'Miembro' }}
                    </small>
                  </span>
                  <span class="roster-member-progress">
                    <span class="roster-member-check" :class="{ complete: m.checkedInToday }">
                      <AppIcon :name="m.checkedInToday ? 'check' : 'clock'" :size="13" />
                      {{ m.checkedInToday ? 'Completado' : 'Pendiente' }}
                    </span>
                    <span class="roster-member-streak">
                      <AppIcon name="flame" :size="13" />
                      {{ m.streak }} {{ m.streak === 1 ? 'día' : 'días' }} de racha
                    </span>
                  </span>
                </article>
              </section>

              <div class="reminder">
                <AppIcon :name="pending.length ? 'clock' : 'shield'" :size="20" />
                <span>{{ alert }}</span>
              </div>
            </div>

            <!-- Chat en modo Minimizado (como estaba antes, debajo del valle) -->
            <section v-if="isChatOpen && !isChatExpanded" class="adventure-chat compact-chat">
              <GroupChat
                :group="group"
                :alert="null"
                :expanded="false"
                @close="isChatOpen = false"
                @toggle-expand="isChatExpanded = true"
                @send="send"
              />
            </section>
          </div>
        </div>

        <!-- Chat en modo Grande Slideado al lado derecho -->
        <aside v-if="isChatOpen && isChatExpanded" class="adventure-chat expanded-side-chat">
          <GroupChat
            :group="group"
            :alert="null"
            :expanded="true"
            @close="isChatOpen = false"
            @toggle-expand="isChatExpanded = false"
            @send="send"
          />
        </aside>
      </div>
    </div>

    <!-- Modal editar hábito -->
    <Teleport to="body">
      <div
        v-if="editing"
        class="adventure-modal-backdrop"
        @click.self="editing = false"
        @keydown.esc="editing = false"
      >
        <form
          class="adventure-modal mission-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
          @submit.prevent="saveHabit"
        >
          <button type="button" class="mission-close" aria-label="Cerrar" @click="editing = false">
            <AppIcon name="x" :size="19" />
          </button>

          <header class="mission-hero">
            <div class="mission-flag" aria-hidden="true">
              <span><AppIcon name="trophy" :size="31" /></span>
            </div>
            <div>
              <span class="mission-kicker">NUEVA AVENTURA DEL EQUIPO</span>
              <h2 id="edit-title">{{ editingHabitId ? 'Ajustar misión' : '¡Prepara la próxima misión!' }}</h2>
              <p>Define el reto y hasta dónde llegará el equipo.</p>
            </div>
          </header>

          <section class="mission-step">
            <span class="mission-step-number">1</span>
            <div class="mission-field">
              <label for="habit-name">¿Qué hábito quiere conquistar el equipo?</label>
              <div class="mission-name-input">
                <AppIcon name="target" :size="20" />
                <input id="habit-name" v-model="draft" autofocus maxlength="120" placeholder="Ej. Leer 20 minutos" required />
              </div>
            </div>
          </section>

          <section class="mission-step">
            <span class="mission-step-number">2</span>
            <div class="mission-field">
              <label>Elige un emblema para el hábito</label>
              <div class="habit-icon-options" role="group" aria-label="Icono del hábito">
                <button
                  v-for="icon in habitIcons"
                  :key="icon"
                  type="button"
                  class="habit-icon-option"
                  :class="{ selected: habitIconDraft === icon }"
                  :aria-label="`Usar icono ${icon}`"
                  :aria-pressed="habitIconDraft === icon"
                  @click="habitIconDraft = icon"
                >
                  {{ icon }}
                </button>
              </div>
              <small class="habit-icon-note">Tu emblema aparecerá junto al hábito en la aventura.</small>
            </div>
          </section>

          <section class="mission-step">
            <span class="mission-step-number">3</span>
            <div class="mission-field">
              <label>Elige la distancia</label>
              <div class="mission-length-options">
                <button
                  v-for="days in missionLengths"
                  :key="days"
                  type="button"
                  class="mission-length-card"
                  :class="{ selected: targetDaysDraft === days }"
                  :aria-pressed="targetDaysDraft === days"
                  @click="targetDaysDraft = days"
                >
                  <span class="length-flag"><AppIcon name="flag" :size="18" /></span>
                  <strong>{{ days }}</strong>
                  <small>DÍAS</small>
                  <em>{{ days === 30 ? 'Reto corto' : days === 90 ? 'Gran recorrido' : 'Aventura épica' }}</em>
                </button>
              </div>
            </div>
          </section>

          <footer class="mission-actions">
            <button type="button" class="game-button secondary" @click="editing = false">
              Cancelar
            </button>
            <button class="mission-launch-button" type="submit" :disabled="saving">
              <AppIcon :name="editingHabitId ? 'check' : 'flame'" :size="19" />
              {{ saving ? 'Guardando…' : editingHabitId ? 'Guardar hábito' : '¡Crear hábito!' }}
            </button>
          </footer>
        </form>
      </div>

      <div
        v-if="editingGroup"
        class="adventure-modal-backdrop"
        @click.self="editingGroup = false"
        @keydown.esc="editingGroup = false"
      >
        <form class="adventure-modal group-edit-modal" role="dialog" aria-modal="true" aria-labelledby="group-edit-title" @submit.prevent="saveGroup">
          <header class="group-edit-hero">
            <span class="group-edit-emblem" :style="{ '--emblem-color': groupColorDraft }">
              <AppIcon :name="groupCategoryIcon" :size="23" />
            </span>
            <div>
              <small>PERSONALIZA TU CAMPAMENTO</small>
              <h2 id="group-edit-title">Editar aventura</h2>
              <p>Ajusta los detalles para que el equipo se sienta como en casa.</p>
            </div>
          </header>
          <div class="group-edit-content">
            <section class="group-edit-settings">
              <div class="group-editor-section-title">
                <span class="group-editor-section-icon"><AppIcon name="settings" :size="18" /></span>
                <span>
                  <strong>Configuración del grupo</strong>
                  <small>Nombre, categoría y apariencia</small>
                </span>
              </div>
              <label for="group-name">Nombre del grupo</label>
              <input id="group-name" v-model="groupNameDraft" maxlength="60" minlength="3" required />
              <span class="group-edit-field-label">Categoría del grupo</span>
              <div class="group-category-options" aria-label="Categoría del grupo">
                <button
                  v-for="category in GROUP_CATEGORIES"
                  :key="category.label"
                  type="button"
                  class="group-category-option"
                  :class="{ selected: groupCategoryDraft === category.label }"
                  :aria-pressed="groupCategoryDraft === category.label"
                  @click="groupCategoryDraft = category.label"
                >
                  <AppIcon :name="category.icon" :size="16" />
                  {{ category.label }}
                </button>
              </div>
              <label for="group-description">Descripción</label>
              <textarea id="group-description" v-model="groupDescriptionDraft" maxlength="200" rows="3" />
              <span class="color-label">Color del grupo</span>
              <div class="group-color-options">
                <button v-for="color in GROUP_COLORS" :key="color" type="button" :aria-label="`Elegir color ${color}`" :aria-pressed="groupColorDraft === color" :class="{ selected: groupColorDraft === color }" :style="{ '--group-color': color }" @click="groupColorDraft = color" />
              </div>
            </section>
            <section class="group-member-editor">
            <div class="group-member-heading">
              <span class="group-member-title-icon"><AppIcon name="user" :size="17" /></span>
              <span class="group-member-title-copy">
                <strong>Miembros del equipo</strong>
                <small>Selecciona a alguien para gestionar su acceso</small>
              </span>
              <small>{{ group.members.length }} en la aventura</small>
            </div>
            <div class="group-member-list">
              <button
                v-for="member in group.members"
                :key="member.id"
                type="button"
                class="group-member-option"
                :class="{ selected: selectedMember?.id === member.id }"
                :aria-pressed="selectedMember?.id === member.id"
                @click="selectedId = member.id"
              >
                <CharacterIcon
                  :character="characters.forMember(member.id, member.isCurrentUser, member.name)"
                  :size="36"
                />
                <span class="group-member-copy">
                  <strong>{{ nameOf(member) }}{{ member.isCurrentUser ? ' (tú)' : '' }}</strong>
                  <small>{{ member.habit }}</small>
                </span>
                <span class="group-member-role" :class="{ admin: member.role === 'ADMIN' }">
                  {{ member.role === 'ADMIN' ? 'ADMIN' : 'MIEMBRO' }}
                </span>
              </button>
            </div>
            <div
              v-if="isAdmin && selectedMember && !selectedMember.isCurrentUser"
              class="group-member-actions"
            >
              <p>Gestionando a <strong>{{ nameOf(selectedMember) }}</strong></p>
              <div>
                <button type="button" class="member-role-button" @click="toggleMemberRole(selectedMember)">
                  <AppIcon name="shield" :size="15" />
                  {{ selectedMember.role === 'ADMIN' ? 'Quitar admin' : 'Dar admin' }}
                </button>
                <button type="button" class="member-remove-button" @click="removeMember(selectedMember)">
                  <AppIcon name="logout" :size="15" />Expulsar
                </button>
              </div>
            </div>
            <p v-else-if="isAdmin" class="group-member-hint">
              Selecciona un miembro para cambiar su rol o expulsarlo.
            </p>
            </section>
          </div>
          <div class="group-edit-actions">
            <button type="button" class="game-button secondary" @click="editingGroup = false">Cancelar</button>
            <button class="game-button" type="submit" :disabled="saving || groupNameDraft.trim().length < 3">{{ saving ? 'Guardando…' : 'Guardar cambios' }}</button>
          </div>
        </form>
      </div>

      <!-- Modal confirmar salir del grupo -->
      <div
        v-if="confirmingLeave"
        class="adventure-modal-backdrop"
        @click.self="confirmingLeave = false"
        @keydown.esc="confirmingLeave = false"
      >
        <div class="adventure-modal" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <h2 id="leave-title">¿Salir de «{{ group.name }}»?</h2>
          <p class="leave-copy">
            <template v-if="group.members.length === 1">
              Como eres la única persona, el grupo quedará archivado y dejará de aparecer en tu inicio. Tu progreso guardado se conserva.
            </template>
            <template v-else>
              Dejarás de ver el grupo. Si eres quien administra, otra persona recibirá el rol de admin.
              Podrás pedir acceso de nuevo con el código <strong>{{ group.inviteCode }}</strong>.
            </template>
          </p>
          <div>
            <button type="button" class="game-button secondary" @click="confirmingLeave = false">
              Cancelar
            </button>
            <button type="button" class="game-button danger-btn" @click="handleLeaveGroup">
              <AppIcon name="logout" :size="15" />
              Sí, salir del grupo
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
  <div v-else class="game-page">
    <RouterLink :to="{ name: 'inicio' }" class="game-button">Volver a Inicio</RouterLink>
  </div>
</template>

<style scoped>
.adventure-page {
  height: 100%;
  overflow-y: auto;
  background: #151520;
  color: #f2edf7;
  padding: 24px 28px 40px;
}

.adventure-wrap {
  max-width: 1420px;
  margin: auto;
  display: grid;
  gap: 20px;
}

.adventure-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.back {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 11px;
  color: #b9a8cb;
}

.adventure-header h1 {
  font-size: 26px;
  letter-spacing: -0.04em;
  margin: 8px 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.invite-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px dashed #775996;
  background: #261d33;
  color: #bca9ce;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}

.invite-badge:hover {
  border-color: #c6a5f3;
  transform: translateY(-1px);
}

.invite-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 700;
  color: #c2a8df;
}

.invite-badge strong {
  display: block;
  font-family: monospace;
  color: #f3e9ff;
  font-size: 13px;
  letter-spacing: 0.08em;
}

.leave-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid #6e3b4c;
  border-bottom: 4px solid #2b121b;
  background: #361d28;
  color: #f9b4c4;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.15s, filter 0.15s;
}

.leave-btn:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

/* Layout con Chat Grande Slideado al lado vs Minimizado */
.adventure-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.adventure-body.side-chat-active {
  grid-template-columns: minmax(0, 1fr) 450px;
}

.adventure-main-col {
  display: grid;
  gap: 22px;
  min-width: 0;
}

.expanded-side-chat {
  height: calc(100vh - 115px);
  min-height: 580px;
  position: sticky;
  top: 0;
  border: 2px solid #6d4f89;
  border-bottom: 5px solid #0d0915;
  border-radius: 19px;
  overflow: hidden;
  box-shadow: -12px 16px 38px rgba(0, 0, 0, 0.45);
  animation: slide-chat-in 0.22s ease-out;
}

@keyframes slide-chat-in {
  from {
    opacity: 0.6;
    transform: translateX(18px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.world {
  height: 430px;
  position: relative;
  overflow: hidden;
  border-radius: 19px;
  border: 3px solid #5e766d;
  box-shadow: 0 5px 0 #0b1014;
  background: var(--sky, #b5dccb);
  color: #273f38;
  isolation: isolate;
}

.world-hud {
  position: absolute;
  top: 15px;
  left: 17px;
  right: 17px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 10;
}

.world-title,
.world-streak,
.world-time {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #f5eed3ef;
  border: 2px solid #6c8873;
  border-bottom: 4px solid #617d66;
  border-radius: 9px;
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 4px 0 #38524716;
}

.world-pip {
  height: 7px;
  width: 7px;
  border-radius: 50%;
  background: #66884e;
}

.world-streak {
  margin-left: auto;
  padding: 3px 10px;
  color: #6e452d;
}

.world-time {
  font-variant-numeric: tabular-nums;
}

.scenery {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.sun {
  position: absolute;
  top: 45px;
  right: 22%;
  width: 65px;
  height: 65px;
  border-radius: 50%;
  background: #fff0b7;
  box-shadow: 0 0 0 14px #fff2c72e;
}

.cloud {
  position: absolute;
  background: #eef6e3;
  width: 110px;
  height: 23px;
  border-radius: 50px;
  top: 88px;
  left: 12%;
}

.cloud:before,
.cloud:after {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: 50%;
  width: 45px;
  height: 35px;
  top: -18px;
  left: 18px;
}

.cloud:after {
  width: 35px;
  height: 30px;
  left: 55px;
  top: -11px;
}

.cloud-two {
  left: 64%;
  top: 132px;
  transform: scale(0.65);
}

.mountain {
  position: absolute;
  bottom: 105px;
  width: 350px;
  height: 250px;
  background: var(--mountain, #82afa0);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.mountain-one {
  left: -5%;
  transform: rotate(-6deg);
}

.mountain-two {
  left: 23%;
  bottom: 95px;
  height: 280px;
  width: 440px;
  background: color-mix(in srgb, var(--mountain, #82afa0) 80%, #fff 20%);
}

.mountain-three {
  right: -7%;
  height: 310px;
  background: color-mix(in srgb, var(--mountain, #82afa0) 85%, #244838 15%);
}

.hill {
  position: absolute;
  bottom: 0;
  border-radius: 50% 50% 0 0;
  background: var(--grass, #95b975);
  width: 85%;
  height: 205px;
  left: -13%;
  transform: rotate(7deg);
}

.hill-two {
  left: 40%;
  height: 185px;
  bottom: 5px;
  transform: rotate(-8deg);
  background: color-mix(in srgb, var(--grass, #95b975) 80%, #355d40 20%);
}

.trail {
  position: absolute;
  left: 20%;
  bottom: -60px;
  width: 70%;
  height: 175px;
  background: #d5c290;
  border-radius: 50%;
  transform: rotate(-11deg);
  box-shadow: 0 -10px 0 #afbc7c;
}

.pine {
  position: absolute;
  bottom: 105px;
  width: 100px;
  height: 150px;
  background: #4f7e60;
  clip-path: polygon(
    50% 0,
    77% 35%,
    65% 35%,
    92% 63%,
    73% 63%,
    100% 85%,
    56% 85%,
    56% 100%,
    44% 100%,
    44% 85%,
    0 85%,
    27% 63%,
    8% 63%,
    35% 35%,
    23% 35%
  );
}

.pine-one {
  left: 3%;
}

.pine-two {
  right: 6%;
  transform: scale(0.9);
}

.pine-three {
  right: 17%;
  bottom: 124px;
  transform: scale(0.55);
  background: #638e68;
}

.camp-flag {
  position: absolute;
  right: 12%;
  bottom: 102px;
  height: 73px;
  width: 4px;
  background: #655742;
}

.camp-flag:after {
  content: '';
  position: absolute;
  top: 0;
  left: 4px;
  width: 35px;
  height: 23px;
  background: #b27a85;
  clip-path: polygon(0 0, 100% 0, 80% 50%, 100% 100%, 0 100%);
}

.flower {
  position: absolute;
  bottom: 68px;
  font-size: 22px;
  color: #f2d18b;
}

.flower-one {
  left: 10%;
}

.flower-two {
  left: 47%;
  bottom: 58px;
  color: #f5e7c5;
}

.flower-three {
  right: 4%;
  bottom: 95px;
  color: #eeb5b0;
}

.world-route {
  position: absolute;
  left: 22%;
  right: 25%;
  top: 119px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
  z-index: 1;
}

.world-route:before {
  content: '';
  position: absolute;
  top: 14px;
  left: 15px;
  right: 15px;
  border-top: 3px dashed #f2eed1a1;
  z-index: -1;
}

.route-stop {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.route-stop > span {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  background: #8ca48b;
  border: 2px solid #d0ddba;
  border-bottom: 4px solid #57735a;
  color: #dce8d2;
  border-radius: 10px;
  transform: rotate(-7deg);
}

.route-stop.reached > span {
  background: #efd58a;
  color: #77613c;
  border-color: #f8e9ba;
  border-bottom-color: #b09558;
}

.route-stop small {
  font-size: 8px;
  background: #edf0d6c4;
  padding: 2px 4px;
  border-radius: 4px;
}

.players {
  position: absolute;
  bottom: 69px;
  left: 12%;
  right: 12%;
  display: flex;
  justify-content: space-evenly;
  align-items: flex-end;
  gap: 18px;
  overflow-x: auto;
  max-height: 200px;
  padding: 20px 10px 5px;
}

.player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 0;
  color: #283d35;
  min-width: 108px;
  padding: 0 6px;
  cursor: pointer;
}

.player:nth-child(even) {
  margin-bottom: 15px;
}

.player-bubble {
  padding: 5px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff7df;
  border: 1px solid #8d9272;
  border-bottom: 3px solid #718164;
  border-radius: 7px;
  font-size: 9px;
  white-space: nowrap;
}

.completed .player-bubble {
  background: #e0efb6;
  color: #486135;
}

.player-name {
  display: flex;
  gap: 6px;
  align-items: center;
  max-width: 160px;
  overflow-wrap: anywhere;
  padding: 6px 9px;
  border-radius: 7px;
  background: #f3eed9;
  border: 2px solid #8b9876;
  font-size: 11px;
  font-weight: 800;
}

.player-name b {
  font-size: 6px;
  background: #a58aca;
  color: white;
  border-radius: 3px;
  padding: 3px;
}

.player.selected .player-name {
  background: #59476d;
  border-color: #e3c9f5;
  color: #fff0fe;
}

.player:hover :deep(.adventure-character) {
  filter: brightness(1.06) drop-shadow(0 0 5px #ffefb4);
}

.world-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 15px;
  background: #304c3eea;
  color: #f0efd5;
  padding: 14px 20px;
  font-size: 10px;
  font-weight: 700;
  border-top: 2px solid #94ab77;
}

.world-bottom > span {
  display: flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
}

.team-lives {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  justify-content: end;
  column-gap: 8px;
  row-gap: 2px;
  min-width: 128px;
  margin-left: auto;
  text-align: right;
}

.lives-label {
  grid-column: 1 / -1;
  color: #d9e5c8;
  font-size: 7px;
  letter-spacing: .11em;
}

.heart-row { display: inline-flex; gap: 2px; align-items:center; justify-content:flex-end; }
.heart-row :deep(svg) { color: #42594a; stroke-width: 2.7; transition: color .2s, transform .2s, filter .2s; }
.heart-row :deep(svg.alive) { color: #ff6682; fill: #ff6682; filter: drop-shadow(0 2px 4px #f43f5e55); }
.heart-row :deep(svg.threatened) { color: #ffc15c; fill: #ffc15c; animation: heart-warning .9s ease-in-out infinite alternate; }
.lives-caption { grid-column:1 / -1; color:#e0d8b7; font-size:7px; white-space:nowrap; }
.lives-at-risk .lives-caption { color:#ffd391; }

@keyframes heart-warning { from { transform:scale(1); filter:drop-shadow(0 0 0 #ffbf5c00); } to { transform:scale(1.16); filter:drop-shadow(0 0 5px #ffbf5caa); } }

.world-progress {
  flex: 1;
  max-width: 240px;
  background: #20372e;
  border: 1px solid #688363;
  border-radius: 5px;
  height: 9px;
  overflow: hidden;
}

.world-progress > span {
  display: block;
  height: 100%;
  background: #c5d995;
  transition: width 0.3s;
}

.adventure-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 22px;
  align-items: start;
}

.adventure-content.chat-closed {
  grid-template-columns: minmax(0, 1fr);
}

.compact-chat {
  height: 650px;
  min-height: 450px;
  border: 1px solid #574164;
  border-bottom: 4px solid #0d0915;
  border-radius: 17px;
  overflow: hidden;
  position: sticky;
  top: 0;
}

.player-detail-heading {
  display: flex;
  align-items: center;
  gap: 15px;
}

.player-detail-heading > div {
  flex: 1;
}

.player-detail-heading h2 {
  font-size: 20px;
  margin: 0 0 6px;
}

.player-detail-heading > div > span {
  font-size: 10px;
  color: #b5a5c6;
}

.customize-link {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #d2b5ef;
  font-size: 10px;
}

.current-habit {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 0;
  border-top: 1px solid #46334f;
  border-bottom: 1px solid #46334f;
  margin-top: 24px;
}

.current-habit > svg {
  color: #c7a6e9;
  flex-shrink: 0;
}

.current-habit strong {
  font-size: 13px;
  flex: 1;
}

.current-habit > span {
  font-size: 9px;
  color: #eac08a;
  background: #4a352c;
  padding: 5px 7px;
  border-radius: 5px;
}

.current-habit > span.complete {
  background: #32402d;
  color: #c4dfa2;
}

.player-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.player-metrics > div {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  padding: 13px 7px;
  background: #2d2337;
  border: 1px solid #4a3558;
  border-radius: 9px;
}

.player-metrics svg {
  color: #d7b083;
}

.player-metrics strong {
  font-size: 18px;
}

.player-metrics small {
  width: 100%;
  text-align: center;
  font-size: 8px;
  color: #baa7cb;
}

.last-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 14px;
  background: #32283d;
  border-radius: 9px;
  margin-top: 20px;
  color: #d1bddf;
}

.last-message svg {
  flex-shrink: 0;
}

.last-message p {
  font-size: 11px;
  line-height: 1.7;
  margin: 0;
  overflow-wrap: anywhere;
}

.player-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-top: 22px;
}

.edit-habit {
  font-size: 10px;
  background: none;
  border: 0;
  color: #c2a8da;
  padding: 8px;
  cursor: pointer;
}

.check-notice {
  font-size: 11px;
  color: #c4dda7;
  margin: 15px 0 0;
}

.roster-member {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 9px;
  background: none;
  border: 0;
  border-top: 1px solid #43304e;
  color: #eadff4;
  text-align: left;
  border-radius: 7px;
  cursor: pointer;
}

.roster-member > span:not(.character-icon) {
  flex: 1;
  font-size: 12px;
}

.roster-member small {
  display: block;
  margin-top: 4px;
  font-size: 9px;
  color: #b5a3c4;
}

.roster-member > svg {
  color: #b6cc99;
}

.roster-member.active {
  background: #35263f;
}

.reminder {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #d7c2a1;
  background: #30262a;
  border: 1px solid #644a3c;
  border-radius: 10px;
  padding: 15px;
  font-size: 11px;
  line-height: 1.6;
}

.reminder svg {
  flex-shrink: 0;
}

.adventure-modal-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #08050cba;
  z-index: 1000;
}

.adventure-modal {
  background: #2b2036;
  border: 1px solid #74508d;
  border-radius: 17px;
  padding: 27px;
  width: min(420px, 100%);
  color: #f1e5fc;
}

.adventure-modal h2 {
  font-size: 21px;
  margin: 0 0 14px;
}

.leave-copy {
  font-size: 12px;
  line-height: 1.65;
  color: #cab9dc;
  margin: 0 0 8px;
}

.danger-btn {
  background: #e15b76 !important;
  border-color: #f9a8b8 !important;
  border-bottom-color: #6b1d2f !important;
  color: #fff !important;
}

.adventure-modal label {
  display: block;
  font-size: 11px;
  margin-bottom: 10px;
}

.adventure-modal input {
  background: #18101f;
  border: 1px solid #6c4a81;
  border-radius: 8px;
  padding: 13px;
  width: 100%;
  font-size: 13px;
  color: #fff;
}

.adventure-modal > div {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}

.adventure-page button:focus-visible,
.adventure-page a:focus-visible {
  outline: 2px solid #d9b0f5;
  outline-offset: 4px;
}

@media (max-width: 1250px) {
  .adventure-body.side-chat-active {
    grid-template-columns: minmax(0, 1fr) 370px;
  }
  .adventure-content {
    grid-template-columns: minmax(0, 1fr) 305px;
  }
  .adventure-page {
    padding: 23px 20px;
  }
  .customize-link {
    font-size: 0;
  }
  .customize-link svg {
    width: 18px;
  }
  .player-metrics {
    gap: 6px;
  }
  .current-habit {
    flex-wrap: wrap;
  }
}

@media (max-width: 1050px) {
  .adventure-body.side-chat-active,
  .adventure-content {
    grid-template-columns: minmax(0, 1fr);
  }
  .expanded-side-chat,
  .compact-chat {
    position: static;
    height: 550px;
  }
  .world-title {
    font-size: 8px;
  }
  .world {
    height: 420px;
  }
  .world-route {
    left: 17%;
    right: 17%;
  }
}

@media (max-width: 650px) {
  .adventure-page {
    padding: 18px 12px;
  }
  .adventure-header {
    flex-wrap: wrap;
  }
  .adventure-header h1 {
    font-size: 23px;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .leave-btn span {
    display: none;
  }
  .world {
    height: 410px;
  }
  .world-hud {
    left: 9px;
    right: 9px;
    gap: 6px;
    flex-wrap: wrap;
  }
  .world-title {
    padding: 7px;
    font-size: 7px;
  }
  .world-time {
    font-size: 9px;
    padding: 7px;
  }
  .world-streak {
    font-size: 9px;
  }
  .players {
    left: 0;
    right: 0;
    gap: 10px;
    justify-content: space-evenly;
  }
  .player {
    min-width: 105px;
  }
  .player-name {
    font-size: 10px;
  }
  .world-route {
    left: 10%;
    right: 10%;
    top: 125px;
  }
  .world-bottom {
    gap: 8px;
    padding: 14px 10px;
    font-size: 8px;
  }
  .team-lives { min-width: 100px; column-gap:5px; }
  .heart-row :deep(svg) { width:15px; height:15px; }
  .lives-caption { max-width:112px; white-space:normal; line-height:1.25; }
  .world-progress {
    min-width: 25px;
  }
  .mountain {
    width: 230px;
  }
  .mountain-two {
    width: 300px;
  }
  .player-controls {
    flex-wrap: wrap;
  }
  .player-controls .game-button {
    font-size: 11px;
  }
  .player-detail-heading h2 {
    font-size: 18px;
  }
  .current-habit strong {
    font-size: 12px;
  }
}
.team-habits { display: grid; gap: 12px; }
.member-command-card { display: grid; grid-template-columns:auto 1fr; gap: 11px; margin-top: 13px; padding: 14px; background: linear-gradient(135deg,#342641,#281f32); border: 1px solid #624576; border-bottom: 3px solid #17101e; border-radius: 13px; }
.member-command-icon { display: grid; place-items: center; width: 38px; height: 38px; color: #2a1f31; background: #c6a4eb; border-radius: 11px; box-shadow: 0 3px 0 #755598; }
.member-command-copy { min-width: 0; }
.member-command-copy > small,.member-command-copy > strong,.member-command-copy > span { display: block; }
.member-command-copy > small { color:#ac8fc8; font-size:7px; letter-spacing:.12em; }
.member-command-copy > strong { margin-top:4px; font-size:12px; }
.member-command-copy > span { margin-top:3px; color:#b8a6c7; font-size:9px; }
.member-admin-actions { grid-column: 1/-1; display:grid; grid-template-columns:1fr auto; gap:8px; margin-top:3px; }
.member-admin-actions button { display:flex; align-items:center; justify-content:center; gap:6px; min-height:36px; border-radius:9px; font-size:10px; font-weight:800; cursor:pointer; }
.member-role-button { color:#281d31; background:#bfa0e1; border:1px solid #dabefa; border-bottom:3px solid #775990; }
.member-remove-button { color:#ffc5ce; background:#492934; border:1px solid #7c4454; border-bottom:3px solid #211119; }
.team-habit-row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-top: 1px solid #43304e; }
.team-habit-icon { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 36px; border-radius: 10px; background: #382b45; font-size: 18px; }
.team-habit-copy { min-width: 0; flex: 1; }
.team-habit-copy strong, .team-habit-copy small { display: block; overflow-wrap: anywhere; }
.team-habit-copy strong { font-size: 12px; }
.team-habit-copy small, .habit-empty { color: #b5a3c4; font-size: 10px; margin: 4px 0 0; }
.habit-check-state { color: #eac08a; background: #4a352c; border-radius: 5px; padding: 5px 7px; font-size: 9px; white-space: nowrap; }
.habit-check-state.complete { background: #32402d; color: #c4dfa2; }
.remove-habit { color: #f1a3ad; }
.group-edit-modal { display: grid; gap: 10px; }
.mission-modal { position:relative; width:min(720px,100%); max-height:calc(100vh - 34px); overflow-y:auto; padding:0; border:2px solid #725291; border-bottom:6px solid #160d20; border-radius:24px; background:#241b2e; box-shadow:0 30px 90px #050208cc; }
.mission-close { position:absolute; z-index:3; top:17px; right:17px; display:grid; place-items:center; width:36px; height:36px; color:#d8c8e5; background:#291f34cc; border:1px solid #684e7b; border-radius:10px; cursor:pointer; }
.mission-hero { display:grid; grid-template-columns:120px 1fr; align-items:center; gap:23px; min-height:190px; padding:30px 64px 27px 34px; overflow:hidden; background:linear-gradient(135deg,#5a3b73,#7b55a0 58%,#4a3161); border-bottom:1px solid #a17abb; position:relative; }
.mission-hero::after { content:''; position:absolute; width:190px; height:190px; right:-75px; top:-95px; border:25px solid #ffffff0b; border-radius:50%; }
.mission-flag { position:relative; display:grid; place-items:center; width:96px; height:104px; }
.mission-flag::before { content:''; position:absolute; left:13px; bottom:0; width:8px; height:88px; background:#26172f; border-radius:5px; box-shadow:3px 0 #a97dcc; }
.mission-flag::after { content:''; position:absolute; left:21px; top:6px; width:72px; height:56px; background:#c6e87e; border:4px solid #291936; border-radius:7px 10px 10px 5px; clip-path:polygon(0 0,100% 0,84% 50%,100% 100%,0 100%); box-shadow:0 5px 0 #34233f; }
.mission-flag > span { position:relative; z-index:1; margin:-34px 0 0 16px; color:#35451f; }
.mission-kicker { display:block; margin-bottom:8px; color:#d9f59f; font-size:9px; font-weight:900; letter-spacing:.14em; }
.mission-hero h2 { margin:0; max-width:440px; font-size:29px; line-height:1.13; color:#fff; text-shadow:0 3px #382345; }
.mission-hero p { margin:9px 0 0; color:#e2d4eb; font-size:12px; }
.mission-step { display:grid; grid-template-columns:38px 1fr; gap:15px; padding:22px 30px 0; }
.mission-step-number { display:grid; place-items:center; align-self:start; width:34px; height:34px; color:#2d2135; background:#c9ed7c; border:2px solid #e0ffa1; border-bottom:4px solid #718d3d; border-radius:10px; font-size:14px; font-weight:900; }
.mission-field { min-width:0; }
.mission-field > label { margin:0 0 10px; color:#f2e9f8; font-size:13px; font-weight:800; }
.mission-name-input { display:flex; align-items:center; gap:11px; padding:0 14px; color:#c1e777; background:#191220; border:2px solid #5e456f; border-bottom:4px solid #0d0911; border-radius:13px; }
.mission-name-input:focus-within { border-color:#b38bd0; box-shadow:0 0 0 3px #ae7dd524; }
.mission-name-input input { min-width:0; padding:15px 0; background:transparent; border:0; outline:0; }
.mission-length-options { display:grid; grid-template-columns:repeat(3,1fr); gap:11px; }
.mission-length-card { position:relative; display:grid; justify-items:center; min-height:132px; padding:13px 8px 11px; color:#cbbbd7; background:#30263a; border:2px solid #51405e; border-bottom:5px solid #15101b; border-radius:15px; cursor:pointer; transition:transform .15s,border-color .15s,background .15s; }
.mission-length-card:hover { transform:translateY(-2px); border-color:#8e6ba6; }
.mission-length-card.selected { color:#2b3520; background:#c8e87d; border-color:#ebffad; border-bottom-color:#69813d; transform:translateY(-3px); box-shadow:0 7px 20px #0b071040; }
.length-flag { display:grid; place-items:center; width:30px; height:30px; color:#d4b5ed; background:#493557; border-radius:9px; }
.selected .length-flag { color:#f4ffcf; background:#6c863d; }
.mission-length-card strong { margin-top:4px; font-size:29px; line-height:1; }
.mission-length-card small { font-size:8px; font-weight:900; letter-spacing:.15em; }
.mission-length-card em { margin-top:5px; font-size:8px; font-style:normal; opacity:.75; }
.mission-actions { display:grid; grid-template-columns:auto minmax(260px,1fr); gap:12px; padding:26px 30px 30px 83px; }
.mission-launch-button { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; min-height:60px; color:#28331c; background:#c8e87c; border:2px solid #e8ffa6; border-bottom:6px solid #6d863d; border-radius:14px; font-size:15px; font-weight:900; cursor:pointer; }
.mission-launch-button:hover { background:#d7f58c; transform:translateY(-1px); }
.mission-launch-button:active { transform:translateY(3px); border-bottom-width:2px; }
.mission-launch-button:disabled { opacity:.55; cursor:default; transform:none; }
.group-edit-modal textarea { width: 100%; resize: vertical; color: #fff; background: #18101f; border: 1px solid #6c4a81; border-radius: 8px; padding: 12px; font: inherit; }
.group-edit-modal .color-label { font-size: 11px; margin-top: 5px; }
.group-color-options { display: flex; gap: 10px; }
.group-color-options button { width: 28px; height: 28px; border-radius: 50%; background: var(--group-color); border: 2px solid #ffffff55; padding: 0; }
.group-color-options button.selected { outline: 2px solid #fff; outline-offset: 2px; }
@media(max-width:700px) { .team-habit-row { flex-wrap: wrap; } .team-habit-copy { min-width: calc(100% - 55px); } .group-edit-modal > div:last-child { flex-wrap: wrap; } .mission-hero{grid-template-columns:72px 1fr;min-height:150px;padding:25px 48px 22px 18px;gap:12px}.mission-flag{transform:scale(.72);transform-origin:left center}.mission-hero h2{font-size:21px}.mission-step{grid-template-columns:30px 1fr;padding:18px 16px 0;gap:10px}.mission-step-number{width:29px;height:29px}.mission-length-options{gap:6px}.mission-length-card{min-height:118px;padding-inline:4px}.mission-length-card strong{font-size:24px}.mission-actions{grid-template-columns:1fr;padding:22px 16px;}.mission-actions .secondary{order:2}.mission-actions button{width:100%}.member-admin-actions{grid-template-columns:1fr}.mission-modal{max-height:calc(100vh - 16px)} }
/* Pulido visual de misiones y roles, sin alterar sus acciones. */
.team-habits .game-title {
 padding-bottom: 14px;
 border-bottom: 1px solid #43304e;
 margin-bottom: 2px;
}

.team-habit-row {
 position: relative;
 padding: 13px;
 background: linear-gradient(120deg, #2d2438, #251f30);
 border: 1px solid #43344f;
 border-bottom: 3px solid #17111e;
 border-radius: 13px;
 transition: border-color .18s, transform .18s, background .18s;
}

.team-habit-row:hover {
 background: linear-gradient(120deg, #352941, #2b2236);
 border-color: #76578d;
 transform: translateY(-2px);
}

.team-habit-icon {
 width: 42px;
 height: 42px;
 flex-basis: 42px;
 background: linear-gradient(145deg, #4a3759, #33263f);
 border: 1px solid #654b78;
 box-shadow: inset 0 1px #ffffff12, 0 3px 0 #17111e;
}

.team-habit-copy strong {
 font-size: 13px;
 line-height: 1.4;
}

.team-habit-copy small {
 line-height: 1.55;
}

.habit-check-state {
 border: 1px solid #9a6b3f;
 border-radius: 999px;
 padding: 5px 9px;
 font-weight: 800;
 letter-spacing: .02em;
}

.habit-check-state.complete {
 border-color: #66824a;
}

.member-command-card {
 position: relative;
 overflow: hidden;
 background:
   radial-gradient(circle at 100% 0, #9b75ba24, transparent 38%),
   linear-gradient(135deg, #342641, #281f32);
 border-color: #705186;
}

.member-command-icon {
 border: 1px solid #e3c9ff;
 box-shadow: 0 3px 0 #755598, 0 0 18px #c6a4eb26;
}

.member-admin-actions button,
.edit-habit {
 transition: filter .16s, transform .16s, background .16s;
}

.member-admin-actions button:hover,
.edit-habit:hover {
 filter: brightness(1.13);
 transform: translateY(-1px);
}

.member-role-button {
 box-shadow: inset 0 1px #ffffff24;
}

.member-remove-button {
 border-radius: 9px;
}

.mission-step {
 margin: 18px 30px 0;
 padding: 16px;
 background: linear-gradient(120deg, #2b2235, #261e30);
 border: 1px solid #493953;
 border-radius: 15px;
}

.mission-length-card {
 box-shadow: inset 0 1px #ffffff0a, 0 4px 0 #15101b;
}

.mission-length-card.selected {
 box-shadow: inset 0 1px #ffffff70, 0 7px 20px #0b071040;
}

.mission-launch-button {
 box-shadow: inset 0 1px #ffffff80, 0 6px 18px #c8e87d1c;
}

@media(max-width:700px) {
 .team-habit-row {
   padding: 11px;
 }

 .mission-step {
   margin: 16px 16px 0;
   padding: 14px;
 }
}

.adventure-header .header-actions > .game-button.secondary {
 min-height: 42px;
 border-radius: 12px;
 box-shadow: inset 0 1px #ffffff12, 0 3px 0 #17111e;
 transition: transform .16s, filter .16s, border-color .16s;
}

.adventure-header .header-actions > .game-button.secondary:hover {
 border-color: #b28bd1;
 filter: brightness(1.12);
 transform: translateY(-2px);
}

.adventure-header .header-actions > .game-button.secondary:active {
 transform: translateY(1px);
}

.team-habit-row .edit-habit,
.player-controls > .edit-habit {
 display: inline-flex;
 align-items: center;
 justify-content: center;
 min-height: 32px;
 padding: 6px 10px;
 border: 1px solid #624b75;
 border-bottom: 3px solid #21172b;
 border-radius: 9px;
 background: #382a45;
 color: #e0c8f2;
 font-size: 10px;
 font-weight: 800;
}

.team-habits .game-title > .game-button {
 min-height: 40px;
 padding-inline: 14px;
 color: #2b3520;
 background: linear-gradient(135deg, #d5f291, #b8dc75);
 border-color: #e9ffb5;
 border-bottom-color: #6b843e;
 box-shadow: inset 0 1px #ffffff80, 0 4px 12px #b8dc7520;
 transition: filter .16s, transform .16s, box-shadow .16s;
}

.team-habits .game-title > .game-button:hover {
 filter: brightness(1.06);
 box-shadow: inset 0 1px #ffffffa0, 0 7px 16px #b8dc7530;
 transform: translateY(-2px);
}

.team-habits .game-title > .game-button:active {
 transform: translateY(1px);
}

.team-habit-row .edit-habit.remove-habit {
 background: #402832;
 border-color: #754454;
 border-bottom-color: #211119;
 color: #ffc0ca;
}

.team-habit-row .edit-habit:active,
.member-admin-actions button:active {
 transform: translateY(1px);
}

.member-command-card {
 box-shadow: inset 0 1px #ffffff0a, 0 5px 16px #0e09141c;
}

.member-command-copy > small {
 color: #d3b3eb;
}

.member-admin-actions button {
 min-height: 40px;
 font-size: 10px;
 letter-spacing: .01em;
 transition: transform .16s, filter .16s, box-shadow .16s;
}

.member-role-button:hover {
 box-shadow: 0 0 0 3px #caa9e726, inset 0 1px #ffffff24;
}

.member-remove-button:hover {
 box-shadow: 0 0 0 3px #e7798c20;
}

.group-edit-modal {
 width: min(500px, 100%);
 max-height: calc(100vh - 32px);
 overflow-y: auto;
 padding: 0 25px 24px;
 gap: 10px;
 border: 1px solid #77558f;
 border-bottom: 5px solid #160d20;
 background: linear-gradient(160deg, #2b2136, #211a2b 68%);
 box-shadow: 0 28px 80px #050208c9;
}

.group-edit-hero {
 display: flex;
 align-items: center;
 gap: 15px;
 margin: 0 -25px 7px;
 padding: 23px 25px;
 background:
   radial-gradient(circle at 100% 0, #c8a4eb26, transparent 38%),
   linear-gradient(125deg, #49325f, #30223e);
 border-bottom: 1px solid #76578d;
}

.group-edit-emblem {
 display: grid;
 place-items: center;
 width: 48px;
 height: 48px;
 flex: 0 0 48px;
 color: #30223d;
 background: #d0b1ed;
 border: 1px solid #f0ddff;
 border-bottom: 4px solid #80619a;
 border-radius: 14px;
 box-shadow: 0 7px 18px #120b1a55;
}

.group-edit-hero small {
 display: block;
 margin-bottom: 5px;
 color: #d8f39c;
 font-size: 8px;
 font-weight: 900;
 letter-spacing: .13em;
}

.group-edit-hero h2 {
 margin: 0;
 font-size: 22px;
}

.group-edit-hero p {
 margin: 5px 0 0;
 color: #cbb8d9;
 font-size: 10px;
 line-height: 1.5;
}

.group-edit-modal > label,
.group-edit-modal .color-label {
 margin: 5px 0 -5px;
 color: #e7d9f1;
 font-size: 10px;
 font-weight: 800;
}

.group-edit-modal > input,
.group-edit-modal textarea {
 width: 100%;
 color: #f7effc;
 background: #191420;
 border: 1px solid #574365;
 border-bottom: 3px solid #100c15;
 border-radius: 10px;
 padding: 11px 12px;
 font: inherit;
 font-size: 12px;
 transition: border-color .16s, box-shadow .16s, background .16s;
}

.group-edit-modal > input:focus,
.group-edit-modal textarea:focus {
 outline: 0;
 border-color: #b58bd5;
 background: #21192a;
 box-shadow: 0 0 0 3px #bd94df20;
}

.group-edit-modal textarea {
 min-height: 78px;
 resize: vertical;
}

.group-color-options {
 align-items: center;
 gap: 12px;
 padding: 8px 10px;
 background: #1c1624;
 border: 1px solid #40314c;
 border-radius: 12px;
}

.group-color-options button {
 width: 30px;
 height: 30px;
 cursor: pointer;
 transition: transform .16s, box-shadow .16s;
}

.group-color-options button:hover {
 transform: scale(1.12);
}

.group-color-options button.selected {
 outline: 2px solid #f5eaff;
 outline-offset: 3px;
 box-shadow: 0 0 14px var(--group-color);
}

.group-edit-actions {
 display: flex;
 justify-content: flex-end;
 gap: 9px;
 margin: 8px 0 0;
 padding-top: 15px;
 border-top: 1px solid #44334f;
}

.group-edit-actions .game-button {
 min-height: 42px;
}

@media(max-width:700px) {
 .group-edit-modal {
   padding: 0 17px 18px;
 }

 .group-edit-hero {
   margin-inline: -17px;
   padding-inline: 17px;
 }

 .group-edit-actions {
   flex-direction: column-reverse;
 }

 .group-edit-actions .game-button {
   width: 100%;
 }
}

.adventure-header .chat-toggle,
.adventure-header .edit-group-trigger,
.adventure-header .leave-btn {
 min-height: 44px;
 justify-content: center;
 border-radius: 12px;
 font-size: 12px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff18, 0 4px 0 #17111e;
 transition: transform .16s, filter .16s, box-shadow .16s;
}

.adventure-header .chat-toggle {
 color: #ead8fb;
 background: linear-gradient(145deg, #493358, #34233f);
 border-color: #8969a1;
 border-bottom-color: #1b1123;
}

.adventure-header .edit-group-trigger {
 color: #2e213b;
 background: linear-gradient(145deg, #e0c3fa, #b995db);
 border-color: #f0dcff;
 border-bottom-color: #72518a;
}

.adventure-header .leave-btn {
 padding: 0 14px;
 color: #ffcbd2;
 background: linear-gradient(145deg, #542d3b, #3e2530);
 border: 1px solid #98586a;
 border-bottom: 4px solid #211119;
}

.adventure-header .chat-toggle:hover,
.adventure-header .edit-group-trigger:hover,
.adventure-header .leave-btn:hover {
 filter: brightness(1.12);
 transform: translateY(-2px);
}

.adventure-header .chat-toggle:active,
.adventure-header .edit-group-trigger:active,
.adventure-header .leave-btn:active {
 transform: translateY(1px);
 box-shadow: inset 0 1px #ffffff12, 0 1px 0 #17111e;
}

.player-controls .checkin-button {
 min-height: 46px;
 padding: 11px 18px;
 border-radius: 12px;
 font-size: 12px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff80, 0 5px 0 var(--theme-dark, #6b843e), 0 9px 18px #a5ca6926;
}

.player-controls .checkin-button:hover {
 filter: brightness(1.1);
 transform: translateY(-2px);
}

.team-habits .game-title {
 align-items: center;
}

.team-habits .game-title h2 {
 font-size: 17px;
}

.team-habits .add-habit-button {
 min-height: 46px;
 padding: 9px 16px;
 gap: 9px;
 color: #2a351f;
 background: linear-gradient(145deg, #d8f48f, #aeda68);
 border: 1px solid #edffb7;
 border-bottom: 5px solid #617c37;
 border-radius: 13px;
 font-size: 12px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff9c, 0 7px 16px #b8dc7530;
 transition: transform .16s, filter .16s, box-shadow .16s;
}

.team-habits .add-habit-button:hover {
 filter: brightness(1.08);
 box-shadow: inset 0 1px #ffffffa8, 0 10px 20px #b8dc7542;
 transform: translateY(-3px);
}

.team-habits .add-habit-button:active {
 box-shadow: inset 0 1px #ffffff55, 0 2px 0 #617c37;
 transform: translateY(2px);
}

.team-habit-row {
 display: grid;
 grid-template-columns: 48px minmax(0, 1fr) auto;
 align-items: center;
 gap: 10px 13px;
 padding: 13px;
}

.team-habit-icon {
 grid-row: 1 / 3;
 width: 46px;
 height: 46px;
 flex-basis: 46px;
 border-radius: 13px;
 font-size: 21px;
 box-shadow: inset 0 1px #ffffff20, 0 4px 0 #17111e;
}

.team-habit-copy strong {
 font-size: 14px;
}

.team-habit-copy small {
 margin-top: 5px;
 font-size: 11px;
}

.team-habit-row .habit-check-state {
 grid-column: 3;
 grid-row: 1;
 padding: 6px 11px;
 font-size: 10px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff16;
}

.habit-actions {
 grid-column: 2 / 4;
 grid-row: 2;
 display: flex;
 justify-content: flex-end;
 gap: 8px;
}

.team-habit-row .habit-actions .edit-habit {
 min-height: 36px;
 padding: 7px 12px;
 gap: 7px;
 font-size: 11px;
 font-weight: 900;
 box-shadow: inset 0 1px #ffffff12, 0 3px 0 #21172b;
}

.team-habit-row .habit-actions .edit-habit:hover {
 box-shadow: inset 0 1px #ffffff1a, 0 5px 0 #21172b, 0 7px 14px #0e091433;
 transform: translateY(-2px);
}

.team-habit-row .habit-actions .remove-habit {
 border-color: #965568;
 border-bottom-color: #29141b;
 background: linear-gradient(145deg, #59313f, #402530);
}

.team-roster .roster-member {
 min-height: 64px;
 padding: 11px 13px;
 border: 1px solid #493753;
 border-bottom: 3px solid #17111e;
 border-radius: 12px;
 cursor: default;
}

.team-roster .roster-member-copy {
 display: block;
 flex: 1;
 min-width: 0;
 overflow-wrap: anywhere;
 font-size: 12px;
}

.team-roster .roster-member-progress {
 display: grid;
 justify-items: end;
 gap: 6px;
 flex: 0 0 auto;
}

.team-roster .roster-member-check,
.team-roster .roster-member-streak {
 display: inline-flex;
 align-items: center;
 justify-content: center;
 gap: 5px;
 width: fit-content;
 border: 1px solid #574361;
 border-radius: 999px;
 padding: 5px 9px;
 color: #d3c2df;
 background: #34283f;
 font-size: 9px;
 font-weight: 800;
 white-space: nowrap;
}

.team-roster .roster-member-check.complete {
 color: #d3e8b6;
 background: #34422e;
 border-color: #596e48;
}

.team-roster .roster-member-streak {
 color: #f0c58e;
 background: #43332b;
 border-color: #70513a;
}

.team-roster .roster-member .roster-role {
 display: inline-flex;
 width: fit-content;
 margin-top: 5px;
 padding: 3px 7px;
 color: #d7c3e8;
 background: #392b45;
 border: 1px solid #5b456d;
 border-radius: 999px;
 font-size: 8px;
 font-weight: 900;
 letter-spacing: .06em;
}

.team-roster .roster-member .roster-role.leader {
 color: #f0d7a3;
 background: #46372b;
 border-color: #79603b;
}

.member-command-card {
 padding: 16px;
 border-radius: 15px;
}

.member-admin-actions button {
 min-height: 44px;
 border-radius: 11px;
 font-size: 11px;
 font-weight: 900;
}

.member-role-button {
 background: linear-gradient(145deg, #d8b8f3, #b58bd5);
 border-color: #f0dcff;
 border-bottom-color: #72518a;
 box-shadow: inset 0 1px #ffffff80, 0 4px 12px #c6a4eb20;
}

.member-remove-button {
 background: linear-gradient(145deg, #59313f, #402530);
 border-color: #965568;
 border-bottom-color: #211119;
}

.habit-empty {
 padding: 18px;
 border: 1px dashed #705486;
 border-radius: 13px;
 background: #2b2235;
 font-size: 12px;
 text-align: center;
}

@media(max-width:700px) {
 .team-habit-row {
   grid-template-columns: 42px minmax(0, 1fr);
   gap: 9px 11px;
   padding: 11px;
 }

 .team-habit-copy {
   min-width: 0;
 }

 .team-habit-icon {
   grid-row: 1 / 3;
   width: 40px;
   height: 40px;
 }

 .team-habit-row .habit-check-state {
   grid-column: 2;
   grid-row: 2;
   justify-self: start;
 }

 .habit-actions {
   grid-column: 1 / -1;
   grid-row: 3;
   justify-content: stretch;
 }

 .habit-actions .edit-habit {
   flex: 1;
 }

 .header-actions .chat-toggle,
 .header-actions .edit-group-trigger,
 .header-actions .leave-btn {
   min-height: 40px;
   font-size: 10px;
 }
}

.player-controls {
 display: block;
}

.player-controls .checkin-button {
 display: flex;
 width: 100%;
 min-height: 66px;
 justify-content: center;
 gap: 12px;
 padding: 14px 20px;
 color: #382817;
 background: linear-gradient(135deg, #ffe08b, #ffad55 58%, #f28a45);
 border: 2px solid #fff0b0;
 border-bottom: 6px solid #985526;
 border-radius: 16px;
 font-size: 16px;
 font-weight: 950;
 letter-spacing: .01em;
 box-shadow: inset 0 1px #ffffffb3, 0 8px 18px #ee9b4635;
 transition: filter .16s, transform .16s, box-shadow .16s;
}

.player-controls .checkin-button svg {
 width: 23px;
 height: 23px;
 filter: drop-shadow(0 2px 2px #8c4e3340);
}

.player-controls .checkin-button:hover {
 filter: brightness(1.06) saturate(1.08);
 box-shadow: inset 0 1px #ffffffc9, 0 12px 24px #ee9b4650;
 transform: translateY(-3px);
}

.player-controls .checkin-button:active {
 border-bottom-width: 3px;
 transform: translateY(2px);
}

.player-controls .checkin-button.completed {
 color: #26351f;
 background: linear-gradient(135deg, #e1f8a7, #bce477 58%, #9ac85d);
 border-color: #f0ffc6;
 border-bottom-color: #5f7c37;
 box-shadow: inset 0 1px #ffffffb3, 0 8px 18px #a9d46a30;
}

.player-controls .checkin-button.completed:hover {
 box-shadow: inset 0 1px #ffffffc9, 0 12px 24px #a9d46a48;
}

.team-habits .add-habit-button {
 min-height: 54px;
 padding: 11px 20px;
 gap: 11px;
 font-size: 14px;
 border-radius: 15px;
 border-bottom-width: 6px;
 box-shadow: inset 0 1px #ffffffb5, 0 9px 20px #b8dc7542;
}

.team-habits .add-habit-button svg {
 width: 21px;
 height: 21px;
}

.mission-modal .mission-step {
 align-items: start;
}

.habit-icon-options {
 display: grid;
 grid-template-columns: repeat(6, minmax(0, 1fr));
 gap: 9px;
}

.habit-icon-option {
 display: grid;
 place-items: center;
 min-width: 0;
 aspect-ratio: 1;
 color: #f4e9fc;
 background: linear-gradient(145deg, #392d46, #2a2235);
 border: 1px solid #5b456c;
 border-bottom: 4px solid #17111e;
 border-radius: 13px;
 font-size: 25px;
 cursor: pointer;
 box-shadow: inset 0 1px #ffffff10;
 transition: transform .16s, border-color .16s, background .16s, box-shadow .16s;
}

.habit-icon-option:hover {
 border-color: #b48cd1;
 background: linear-gradient(145deg, #4a3859, #34273f);
 transform: translateY(-3px) scale(1.04);
}

.habit-icon-option.selected {
 color: #30381f;
 background: linear-gradient(145deg, #e0f6a1, #b9de76);
 border-color: #f0ffbf;
 border-bottom-color: #66803e;
 box-shadow: inset 0 1px #ffffffb3, 0 0 0 3px #c8e87d26, 0 6px 14px #c8e87d20;
 transform: translateY(-2px);
}

.habit-icon-note {
 display: block;
 margin-top: 9px;
 color: #bba8ca;
 font-size: 10px;
 line-height: 1.5;
}

.mission-launch-button {
 min-height: 64px;
 font-size: 16px;
 box-shadow: inset 0 1px #ffffffa8, 0 8px 18px #c8e87d30;
}

@media(max-width:700px) {
 .player-controls .checkin-button {
   min-height: 62px;
   font-size: 14px;
 }

 .team-habits .add-habit-button {
   min-height: 48px;
   padding-inline: 13px;
   font-size: 12px;
 }

 .habit-icon-options {
   grid-template-columns: repeat(4, minmax(0, 1fr));
   gap: 8px;
 }

 .habit-icon-option {
   font-size: 23px;
 }
}

@media(max-width:650px) {
 .team-roster .roster-member {
   grid-template-columns: 36px minmax(0, 1fr);
   gap: 8px 10px;
 }

 .team-roster .roster-member-progress {
   grid-column: 2;
   display: flex;
   justify-items: start;
   flex-wrap: wrap;
   justify-content: flex-start;
 }
}

.adventure-header .edit-group-trigger {
 min-height: 48px;
 padding: 10px 17px;
 gap: 9px;
 font-size: 13px;
 box-shadow: inset 0 1px #ffffffb3, 0 5px 0 #72518a, 0 8px 18px #b995db30;
}

.adventure-header .edit-group-trigger svg {
 width: 18px;
 height: 18px;
}

.group-edit-modal {
 max-height: calc(100vh - 28px);
 overflow-y: auto;
 scrollbar-color: #76578d #211a2b;
}

.group-edit-emblem {
 color: #fff;
 background: linear-gradient(145deg, var(--emblem-color, #b995db), #30213d);
 border-color: color-mix(in srgb, var(--emblem-color, #b995db) 65%, white);
 box-shadow: inset 0 1px #ffffff80, 0 5px 0 #1b1123, 0 0 20px color-mix(in srgb, var(--emblem-color, #b995db) 35%, transparent);
}

.group-edit-field-label {
 margin: 5px 0 -5px;
 color: #e7d9f1;
 font-size: 10px;
 font-weight: 800;
}

.group-category-options {
 display: grid;
 grid-template-columns: repeat(3, minmax(0, 1fr));
 gap: 8px;
}

.group-category-option {
 display: flex;
 align-items: center;
 justify-content: center;
 gap: 7px;
 min-height: 42px;
 padding: 7px 8px;
 color: #d7c6e4;
 background: linear-gradient(145deg, #34283f, #282130);
 border: 1px solid #554064;
 border-bottom: 3px solid #18111f;
 border-radius: 10px;
 font-size: 10px;
 font-weight: 800;
 cursor: pointer;
 transition: transform .15s, color .15s, border-color .15s, background .15s;
}

.group-category-option:hover {
 border-color: #a886c2;
 color: #fff;
 transform: translateY(-2px);
}

.group-category-option.selected {
 color: #2e213b;
 background: linear-gradient(145deg, #e0c3fa, #b995db);
 border-color: #f0dcff;
 border-bottom-color: #72518a;
 box-shadow: inset 0 1px #ffffff80, 0 0 0 2px #caa9e726;
}

.group-member-editor {
 display: grid;
 gap: 10px;
 margin-top: 6px;
 padding: 13px;
 background: linear-gradient(145deg, #261e30, #211a2b);
 border: 1px solid #493753;
 border-radius: 13px;
}

.group-member-heading {
 display: flex;
 align-items: center;
 justify-content: space-between;
 gap: 8px;
}

.group-member-heading > span {
 display: flex;
 align-items: center;
 gap: 7px;
 color: #f1e5fa;
 font-size: 11px;
 font-weight: 900;
}

.group-member-heading svg {
 color: #d1aff0;
}

.group-member-heading small {
 color: #bba8ca;
 font-size: 9px;
}

.group-member-list {
 display: grid;
 gap: 6px;
 max-height: 180px;
 overflow-y: auto;
 scrollbar-color: #705486 #211a2b;
}

.group-member-option {
 display: flex;
 align-items: center;
 gap: 9px;
 width: 100%;
 min-width: 0;
 padding: 7px 9px;
 color: #f2eaf8;
 background: #30263a;
 border: 1px solid #493753;
 border-radius: 10px;
 text-align: left;
 cursor: pointer;
 transition: background .15s, border-color .15s, transform .15s;
}

.group-member-option:hover {
 background: #392b45;
 border-color: #83639b;
 transform: translateX(2px);
}

.group-member-option.selected {
 background: linear-gradient(100deg, #473454, #34283f);
 border-color: #b58bd5;
 box-shadow: inset 3px 0 #d8b8f3;
}

.group-member-copy {
 display: grid;
 flex: 1;
 min-width: 0;
 gap: 3px;
}

.group-member-copy strong,
.group-member-copy small {
 overflow: hidden;
 text-overflow: ellipsis;
 white-space: nowrap;
}

.group-member-copy strong {
 font-size: 10px;
}

.group-member-copy small {
 color: #bba8ca;
 font-size: 9px;
}

.group-member-role {
 padding: 4px 7px;
 color: #d8c6e7;
 background: #44364f;
 border: 1px solid #645273;
 border-radius: 999px;
 font-size: 7px;
 font-weight: 900;
 letter-spacing: .04em;
}

.group-member-role.admin {
 color: #f2daa2;
 background: #4a3a2a;
 border-color: #806442;
}

.group-member-hint,
.group-member-actions > p {
 margin: 0;
 color: #c4b1d3;
 font-size: 10px;
}

.group-member-actions {
 display: grid;
 gap: 8px;
 padding-top: 10px;
 border-top: 1px solid #493753;
}

.group-member-actions > div {
 display: grid;
 grid-template-columns: 1fr 1fr;
 gap: 8px;
}

.group-member-actions button {
 display: flex;
 align-items: center;
 justify-content: center;
 gap: 7px;
 min-height: 40px;
 border-radius: 10px;
 font-size: 10px;
 font-weight: 900;
 cursor: pointer;
 transition: filter .15s, transform .15s;
}

.group-member-actions button:hover {
 filter: brightness(1.1);
 transform: translateY(-2px);
}

.group-member-actions .member-role-button {
 color: #2e213b;
 background: linear-gradient(145deg, #d8b8f3, #b58bd5);
 border: 1px solid #f0dcff;
 border-bottom: 4px solid #72518a;
}

.group-member-actions .member-remove-button {
 color: #ffcbd2;
 background: linear-gradient(145deg, #59313f, #402530);
 border: 1px solid #965568;
 border-bottom: 4px solid #211119;
}

@media(max-width:700px) {
 .group-category-options {
   grid-template-columns: repeat(2, minmax(0, 1fr));
 }

 .group-member-editor {
   padding: 10px;
 }
}

.group-edit-modal {
 display: flex;
 flex-direction: column;
 width: min(940px, 100%);
 max-height: calc(100vh - 36px);
 gap: 0;
 padding: 0;
 overflow: hidden;
}

.group-edit-hero {
 flex: 0 0 auto;
 margin: 0;
 padding: 22px 28px;
}

.group-edit-content {
 display: grid;
 grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
 align-items: start;
 gap: 18px;
 min-height: 0;
 padding: 20px 24px;
 overflow-y: auto;
 scrollbar-color: #76578d #211a2b;
}

.adventure-modal.group-edit-modal > .group-edit-content {
 display: grid;
 justify-content: stretch;
 gap: 18px;
 margin: 0;
}

.group-edit-settings,
.group-member-editor {
 display: flex;
 flex-direction: column;
 align-items: stretch;
 gap: 11px;
 min-width: 0;
 margin: 0;
 padding: 17px;
 background:
   radial-gradient(ellipse at 100% 0, #9b75ba12, transparent 38%),
   linear-gradient(155deg, #292132, #211a2b);
 border: 1px solid #4d3a5b;
 border-bottom: 3px solid #17111e;
 border-radius: 16px;
}

.group-editor-section-title {
 display: flex;
 align-items: center;
 gap: 11px;
 padding-bottom: 13px;
 border-bottom: 1px solid #493753;
}

.group-editor-section-icon,
.group-member-title-icon {
 display: grid;
 place-items: center;
 width: 42px;
 height: 42px;
 flex: 0 0 42px;
 color: #f0ddff;
 background: linear-gradient(145deg, #72558c, #493358);
 border: 1px solid #b28bd1;
 border-bottom: 4px solid #21152b;
 border-radius: 12px;
 box-shadow: inset 0 1px #ffffff38, 0 4px 10px #0e091433;
}

.group-editor-section-title > span:last-child,
.group-member-title-copy {
 display: grid;
 gap: 4px;
 min-width: 0;
}

.group-editor-section-title strong,
.group-member-title-copy strong {
 color: #f4eafa;
 font-size: 13px;
}

.group-editor-section-title small,
.group-member-title-copy small {
 color: #bba8ca;
 font-size: 9px;
 line-height: 1.4;
}

.group-edit-settings > label,
.group-edit-settings .group-edit-field-label,
.group-edit-settings .color-label {
 margin: 3px 0 -4px;
 color: #e7d9f1;
 font-size: 10px;
 font-weight: 850;
}

.group-edit-settings > input,
.group-edit-settings textarea {
 width: 100%;
}

.group-edit-settings .group-category-options {
 grid-template-columns: repeat(2, minmax(0, 1fr));
}

.group-edit-settings .group-category-option {
 min-height: 40px;
 justify-content: flex-start;
 padding-inline: 10px;
}

.group-edit-settings .group-color-options {
 justify-content: space-around;
 gap: 8px;
}

.group-member-editor {
 gap: 12px;
 align-self: start;
}

.group-member-heading {
 justify-content: flex-start;
 flex-wrap: nowrap;
 padding-bottom: 12px;
 border-bottom: 1px solid #493753;
}

.group-member-heading .group-member-title-icon {
 color: #e8d2fa;
 background: linear-gradient(145deg, #644a7b, #3e2d4d);
 border-color: #9878b0;
}

.group-member-heading .group-member-title-copy {
 flex: 1;
}

.group-member-heading > small {
 flex: 0 0 auto;
 margin-left: auto;
 padding: 5px 8px;
 color: #d7c3e8;
 background: #392b45;
 border: 1px solid #5b456d;
 border-radius: 999px;
}

.group-member-list {
 max-height: 250px;
 flex: 0 0 auto;
}

.group-member-option {
 min-height: 58px;
 padding: 9px 10px;
 border-radius: 12px;
}

.group-member-option.selected {
 box-shadow: inset 4px 0 #d8b8f3, 0 0 0 2px #caa9e71a;
}

.group-member-copy strong {
 font-size: 11px;
}

.group-member-role {
 font-size: 8px;
}

.group-member-actions {
 margin-top: auto;
 padding: 12px;
 background: #30263a;
 border: 1px solid #59436a;
 border-radius: 13px;
}

.group-member-actions > p {
 font-size: 11px;
}

.group-member-actions button {
 min-height: 44px;
 font-size: 11px;
}

.group-member-hint {
 display: flex;
 align-items: center;
 min-height: 52px;
 padding: 11px 12px;
 background: #30263a;
 border: 1px dashed #705486;
 border-radius: 12px;
 line-height: 1.5;
}

.group-edit-actions {
 flex: 0 0 auto;
 margin: 0;
 padding: 14px 24px 18px;
 background: #211a2b;
 border-top: 1px solid #493753;
}

.adventure-modal.group-edit-modal > .group-edit-actions {
 display: flex;
 justify-content: flex-end;
 margin: 0;
}

@media(max-width:700px) {
 .group-edit-modal {
   max-height: calc(100vh - 20px);
 }

 .group-edit-hero {
   padding: 17px;
 }

 .group-edit-content {
   grid-template-columns: minmax(0, 1fr);
   gap: 12px;
   padding: 13px;
 }

 .group-member-heading {
   flex-wrap: wrap;
 }

 .group-member-heading > small {
   margin-left: 53px;
 }

 .group-edit-settings,
 .group-member-editor {
   padding: 13px;
 }

 .group-edit-actions {
   flex-direction: row;
   padding: 12px 13px;
 }

 .adventure-modal.group-edit-modal > .group-edit-actions {
   flex-direction: row;
 }

 .group-edit-actions .game-button {
   width: auto;
   flex: 1;
 }
}
</style>
