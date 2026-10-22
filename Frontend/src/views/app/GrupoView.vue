<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import AdventureCharacter from '@/components/ui/AdventureCharacter.vue'
import StreakFlame from '@/components/ui/StreakFlame.vue'
import GroupChat from '@/components/group/GroupChat.vue'
import { useMidnightCountdown } from '@/composables/useMidnightCountdown'
import { useGroupsStore } from '@/stores/groups'
import { useCharacterStore } from '@/stores/characters'
import { useSessionStore } from '@/stores/session'
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
const nameOf = (m: { name: string; isCurrentUser: boolean }) =>
  m.isCurrentUser ? session.currentUser?.name ?? m.name : m.name
const done = computed(() => group.value?.members.filter((m) => m.checkedInToday).length ?? 0)

const isChatOpen = ref(true)
/** true = Chat grande slideado al lado derecho; false = Chat minimizado como estaba abajo */
const isChatExpanded = ref(true)
const editing = ref(false)
const confirmingLeave = ref(false)
const draft = ref('')
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

function toggle() {
  if (!group.value || !me.value) return
  store.toggleMyCheckIn(group.value.id)
  notice.value = me.value.checkedInToday ? 'Check-in completado' : 'Check-in pendiente'
}

function openEditor() {
  draft.value = me.value?.habit ?? ''
  editing.value = true
}

function saveHabit() {
  if (!group.value || !draft.value.trim()) return
  store.updateMyHabit(group.value.id, draft.value)
  editing.value = false
}

function send(text: string) {
  if (group.value) store.sendMessage(group.value.id, text)
}

async function handleLeaveGroup() {
  if (!group.value) return
  const id = group.value.id
  confirmingLeave.value = false
  store.leaveGroup(id)
  await router.push({ name: 'inicio' })
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
              <span>{{ group.health }} salud</span>
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
                  <button class="edit-habit" @click="openEditor">Editar hábito</button>
                </div>

                <p v-if="notice && selectedMember.isCurrentUser" class="check-notice" role="status">
                  {{ notice }}
                </p>
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
          <h2 id="edit-title">Editar mi hábito</h2>
          <label for="habit-name">Hábito diario</label>
          <input id="habit-name" v-model="draft" autofocus maxlength="120" required />
          <div>
            <button type="button" class="game-button secondary" @click="editing = false">
              Cancelar
            </button>
            <button class="game-button" type="submit">Guardar</button>
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
            Dejarás de ver este grupo en tu inicio, pero podrás volver a unirte cuando quieras con el código
            <strong>{{ group.inviteCode }}</strong>.
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
</style>
