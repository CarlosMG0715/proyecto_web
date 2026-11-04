<script setup lang="ts">
import '@/assets/styles/views/grupo.css'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import AdventureCharacter from '@/components/ui/AdventureCharacter.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import GroupChat from '@/components/group/GroupChat.vue'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import { GROUP_COLORS, useGroupsStore } from '@/stores/groups'
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
const editingHabitId = ref<string | null>(null)
const groupNameDraft = ref('')
const groupCategoryDraft = ref('')
const groupDescriptionDraft = ref('')
const groupColorDraft = ref('#8b5cf6')
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
  editingHabitId.value = habit?.id ?? null
  editing.value = true
}

async function saveHabit() {
  if (!group.value || !draft.value.trim() || !isAdmin.value) return
  saving.value = true
  try {
    if (editingHabitId.value) await store.editGroupHabit(group.value.id, editingHabitId.value, draft.value.trim())
    else await store.createGroupHabit(group.value.id, draft.value.trim())
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

function openGroupEditor() {
  if (!group.value) return
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
            class="game-button secondary"
            :aria-expanded="isChatOpen"
            @click="isChatOpen = !isChatOpen"
          >
            <AppIcon name="message" :size="16" />
            {{ isChatOpen ? 'Ocultar chat' : 'Abrir chat' }}
          </button>

          <button v-if="isAdmin" type="button" class="game-button secondary" @click="openGroupEditor">
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
                  <button class="game-button" @click="toggle">
                    <AppIcon :name="selectedMember.checkedInToday ? 'check' : 'target'" :size="16" />
                    {{ selectedMember.checkedInToday ? 'Deshacer check-in' : 'Completar hábito' }}
                  </button>
                  <button v-if="isAdmin" class="edit-habit" @click="openEditor()">Administrar hábitos</button>
                </div>

                <p v-if="notice && selectedMember.isCurrentUser" class="check-notice" role="status">
                  {{ notice }}
                </p>
              </section>

              <section class="game-panel team-habits">
                <div class="game-title">
                  <h2>Hábitos del grupo</h2>
                  <button v-if="isAdmin" class="game-button secondary" @click="openEditor()">
                    <AppIcon name="plus" :size="15" />Agregar hábito
                  </button>
                </div>
                <p v-if="!group.habits?.length" class="habit-empty">Aún no hay hábitos activos en esta aventura.</p>
                <article v-for="habit in group.habits ?? []" :key="habit.id" class="team-habit-row">
                  <span class="team-habit-icon">{{ habit.icon || '🎯' }}</span>
                  <div class="team-habit-copy">
                    <strong>{{ habit.name }}</strong>
                    <small>{{ habit.description || 'Misión diaria del equipo' }}</small>
                  </div>
                  <span class="habit-check-state" :class="{ complete: habit.checks[me?.id ?? '']?.done }">
                    {{ habit.checks[me?.id ?? '']?.done ? 'Hecho' : 'Pendiente' }}
                  </span>
                  <button v-if="isAdmin" class="edit-habit" @click="openEditor(habit)">Editar</button>
                  <button v-if="isAdmin" class="edit-habit remove-habit" @click="removeHabit(habit.id, habit.name)">Quitar</button>
                </article>
              </section>

              <section class="game-panel team-roster">
                <div class="game-title">
                  <h2>Equipo</h2>
                  <small>{{ group.members.length }} miembros</small>
                </div>
                <button
                  v-for="m in group.members"
                  :key="m.id"
                  class="roster-member"
                  :class="{ active: selectedMember?.id === m.id }"
                  @click="selectedId = m.id"
                >
                  <CharacterIcon :character="characters.forMember(m.id, m.isCurrentUser, m.name)" :size="35" />
                  <span>
                    {{ nameOf(m) }}
                    <small>{{ m.habit }}</small>
                  </span>
                  <AppIcon :name="m.checkedInToday ? 'check' : 'clock'" :size="17" />
                </button>
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
          class="adventure-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
          @submit.prevent="saveHabit"
        >
          <h2 id="edit-title">{{ editingHabitId ? 'Editar hábito del grupo' : 'Agregar hábito al grupo' }}</h2>
          <label for="habit-name">Nombre del hábito</label>
          <input id="habit-name" v-model="draft" autofocus maxlength="120" required />
          <div>
            <button type="button" class="game-button secondary" @click="editing = false">
              Cancelar
            </button>
            <button class="game-button" type="submit" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
          </div>
        </form>
      </div>

      <div
        v-if="editingGroup"
        class="adventure-modal-backdrop"
        @click.self="editingGroup = false"
        @keydown.esc="editingGroup = false"
      >
        <form class="adventure-modal group-edit-modal" role="dialog" aria-modal="true" aria-labelledby="group-edit-title" @submit.prevent="saveGroup">
          <h2 id="group-edit-title">Editar aventura</h2>
          <label for="group-name">Nombre del grupo</label>
          <input id="group-name" v-model="groupNameDraft" maxlength="60" minlength="3" required />
          <label for="group-category">Categoría</label>
          <input id="group-category" v-model="groupCategoryDraft" maxlength="40" />
          <label for="group-description">Descripción</label>
          <textarea id="group-description" v-model="groupDescriptionDraft" maxlength="200" rows="3" />
          <span class="color-label">Color del grupo</span>
          <div class="group-color-options">
            <button v-for="color in GROUP_COLORS" :key="color" type="button" :aria-label="`Elegir color ${color}`" :aria-pressed="groupColorDraft === color" :class="{ selected: groupColorDraft === color }" :style="{ '--group-color': color }" @click="groupColorDraft = color" />
          </div>
          <div>
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
