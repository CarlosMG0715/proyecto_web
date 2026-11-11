<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import { useCharacterStore } from '@/stores/characters'
import { useGroupsStore } from '@/stores/groups'
import { joinHabitRequest } from '@/services/groupsService'
import { api } from '@/services/api'
import { getGroupBannerTheme } from '@/constants/groupBanners'
import type { ChatMessage, Group, GroupHabit, GroupMember } from '@/types/group'
import { dayLabel, formatClock } from '@/utils/time'
const props = defineProps<{ group: Group; alert: string | null; expanded?: boolean }>()
const emit = defineEmits<{ close: []; send: [text: string]; toggleExpand: [] }>()
const characters = useCharacterStore()
const groups = useGroupsStore()
const joiningMission = ref('')
const joinedMissions = ref<Record<string, boolean>>({})
const missionError = ref<{ id: string; text: string }>()
const canJoinMission = computed(() => props.group.members.some((member) => member.isCurrentUser && !member.isFallen))
const groupTheme = computed(() => getGroupBannerTheme(props.group.color))
const chatThemeStyle = computed(() => ({
  '--chat-accent': groupTheme.value.color,
  '--chat-banner': `url("${groupTheme.value.sectionBannerUrl}")`,
}))

async function joinMission(habitId: string) {
  if (joiningMission.value) return
  joiningMission.value = habitId
  missionError.value = undefined
  try {
    await joinHabitRequest(props.group.id, habitId)
    joinedMissions.value[habitId] = true
    await groups.refreshRemoteGroups()
  } catch {
    missionError.value = { id: habitId, text: 'No pudimos sumarte a la misión. Intenta de nuevo.' }
  } finally {
    joiningMission.value = ''
  }
}
const draft = ref('')
const typingIds = ref<string[]>([])
const typingMembers = computed(() => props.group.members.filter(member => typingIds.value.includes(member.id)))
const typingLabel = computed(() => {
  if (typingMembers.value.length > 3) return 'Varias personas están escribiendo'
  const names = typingMembers.value.map(member => member.name)
  return names.length === 1 ? names[0] + ' está escribiendo' : names.join(', ') + ' están escribiendo'
})
let idleTimer: number | undefined
let pollTimer: number | undefined
let typingGroup: string | undefined
let lastSignal = 0
let polling = false
let signals = Promise.resolve()

function signalTyping(groupId: string, active: boolean) {
  signals = signals.then(async () => {
    await api.put('/groups/' + groupId + '/typing', { active }, { timeout: 4000 })
  }).catch(() => { /* El indicador caduca aunque se pierda la conexión. */ })
}

function stopTyping() {
  window.clearTimeout(idleTimer)
  if (typingGroup) signalTyping(typingGroup, false)
  typingGroup = undefined
  lastSignal = 0
}

async function refreshTyping() {
  if (document.hidden || polling || !canJoinMission.value) return
  const groupId = props.group.id
  polling = true
  try {
    const { data } = await api.get<{ userIds: string[] }>('/groups/' + groupId + '/typing', { timeout: 4000 })
    if (props.group.id === groupId) typingIds.value = data.userIds
  } catch {
    typingIds.value = []
  } finally {
    polling = false
  }
}

watch(draft, value => {
  if (!value.trim() || !canJoinMission.value) {
    stopTyping()
    return
  }
  const now = Date.now()
  if (now - lastSignal >= 2000) {
    typingGroup = props.group.id
    lastSignal = now
    signalTyping(typingGroup, true)
  }
  window.clearTimeout(idleTimer)
  idleTimer = window.setTimeout(stopTyping, 3000)
}, { flush: 'sync' })

const scroller = ref<HTMLElement | null>(null)
interface Row { message: ChatMessage; author: GroupMember | undefined; showDay: boolean; showHeader: boolean; mission?: GroupHabit }
const rows = computed<Row[]>(() => {
  let previous: ChatMessage | undefined
  return props.group.messages.map(message => {
    const showDay = !previous || dayLabel(previous.sentAt) !== dayLabel(message.sentAt)
    const same = previous?.kind === 'user' && message.kind === 'user' && previous.authorId === message.authorId && new Date(message.sentAt).getTime() - new Date(previous.sentAt).getTime() < 300000
    previous = message
    const mission = message.habitId ? props.group.habits?.find((habit) => habit.id === message.habitId) : undefined
    return { message, author: props.group.members.find(m => m.id === message.authorId), showDay, showHeader: showDay || !same, mission }
  })
})
async function scrollBottom() { await nextTick(); if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight }
function submit() { const text = draft.value.trim(); if (!text) return; emit('send', text); draft.value = '' }
watch(() => props.group.messages.length, scrollBottom)
watch(() => props.group.id, () => {
  stopTyping()
  typingIds.value = []
  draft.value = ''
  void refreshTyping()
  void scrollBottom()
})
onMounted(() => {
  void scrollBottom()
  void refreshTyping()
  pollTimer = window.setInterval(refreshTyping, 1500)
})
onUnmounted(() => {
  window.clearInterval(pollTimer)
  stopTyping()
})
</script>
<template><section class="chat" :style="chatThemeStyle">
<header class="chat-head"><span class="chat-emblem"><AppIcon name="message" :size="22" /></span><div class="chat-title"><h3>Campamento</h3></div><div class="chat-head-actions"><button type="button" class="size-toggle-btn" :title="expanded ? 'Minimizar chat' : 'Ampliar chat lateral'" @click="emit('toggleExpand')"><AppIcon :name="expanded ? 'chevron-right' : 'chevron-left'" :size="14" />{{ expanded ? 'Minimizar' : 'Ampliar' }}</button><button type="button" class="icon-button" aria-label="Cerrar chat" @click="emit('close')"><AppIcon name="x" :size="17" /></button></div></header>
<div v-if="alert" class="alert"><AppIcon name="bell" :size="15" /><p>{{ alert }}</p></div>
<div ref="scroller" class="messages" role="log" aria-label="Mensajes del equipo" aria-live="polite" aria-relevant="additions text"><template v-for="row in rows" :key="row.message.id"><div v-if="row.showDay" class="day-sep"><span>{{ dayLabel(row.message.sentAt) }}</span></div><div v-if="row.message.kind === 'system'" class="system-msg"><span><AppIcon name="shield" :size="18" /></span><div><p>{{ row.message.text }}</p><template v-if="row.mission"><p v-if="row.mission.joined || joinedMissions[row.mission.id]">Ya haces parte de esta misión.</p><button v-else-if="canJoinMission" class="mission-join" type="button" :disabled="!!joiningMission" @click="joinMission(row.mission.id)">{{ joiningMission === row.mission.id ? 'Uniéndote…' : '¡Unirme a la aventura!' }}</button><p v-if="missionError?.id === row.mission.id" role="status">{{ missionError.text }}</p></template></div></div><article v-else class="msg" :class="{ mine: row.author?.isCurrentUser, grouped: !row.showHeader }"><div class="avatar-slot"><CharacterIcon v-if="row.showHeader" :character="characters.forMember(row.author?.id ?? 'guest', row.author?.isCurrentUser, row.author?.name)" :size="28" /></div><div class="message-body"><div v-if="row.showHeader" class="meta"><strong>{{ row.author?.isCurrentUser ? 'Tú' : row.author?.name ?? 'Miembro' }}</strong><span v-if="row.author?.role === 'ADMIN'" class="leader">ADMIN</span></div><p class="bubble">{{ row.message.text }}</p><div class="message-foot"><time :datetime="row.message.sentAt">{{ formatClock(row.message.sentAt) }}</time></div></div></article></template></div>
<div v-if="typingMembers.length" class="chat-typing" role="status">
  <span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
  <span>{{ typingLabel }}</span>
</div>
<form class="composer" @submit.prevent="submit"><label class="sr-only" :for="`chat-input-${group.id}`">Mensaje al equipo</label><input :id="`chat-input-${group.id}`" v-model="draft" @blur="stopTyping" maxlength="500" autocomplete="off" placeholder="Mensaje al equipo…" /><button class="send" type="submit" :disabled="!draft.trim()" aria-label="Enviar mensaje"><AppIcon name="send" :size="19" /></button></form>
</section></template>
<style scoped>
.mission-join {
  margin-top: 8px;
  padding: 7px 10px;
  border: 0;
  border-radius: 8px;
  background: #c8e87d;
  color: #28331c;
  font-size: 11px;
  font-weight: 800;
}
.chat{height:100%;min-height:0;display:flex;flex-direction:column;background:#1e1b28;color:#eee5f6}.chat-head{display:flex;align-items:center;gap:11px;padding:19px 16px;background:#342741;border-bottom:2px solid #53405f}.chat-emblem{display:grid;place-items:center;width:41px;height:43px;background:#aa83cc;border:2px solid #d5b5eb;border-bottom:4px solid #73518c;border-radius:12px;color:#291a35;transform:rotate(-5deg)}.chat-title{flex:1}.chat-title h3{font-size:17px;margin:0 0 6px;letter-spacing:-.02em}.chat-title>span{display:flex;align-items:center;gap:5px;font-size:9px;color:#cbb5dc}.chat-title i{width:5px;height:5px;background:#b8d69b;border-radius:50%}.chat-head-actions{display:flex;align-items:center;gap:6px}.size-toggle-btn{display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 9px;background:#281c34;color:#dec6f5;border:1px solid #6c4d7d;border-bottom:3px solid #180f21;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer}.size-toggle-btn:hover{background:#352546;color:#fff}.icon-button{width:28px;height:30px;background:#281c34;color:#d9c0ee;border:1px solid #6c4d7d;border-bottom:3px solid #180f21;border-radius:7px;display:grid;place-items:center;cursor:pointer}.team-checks{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;background:#272031;border-bottom:1px solid #43334e;gap:12px}.camp-avatars{display:flex;padding-left:5px;gap:3px}.camp-avatars>*{margin-left:-5px}.team-checks>span{display:flex;align-items:center;gap:5px;font-size:9px;color:#c4d7a8;background:#34402e;border:1px solid #526443;padding:5px 8px;border-radius:6px}.alert{display:flex;gap:8px;align-items:flex-start;padding:12px 15px;background:#40302a;color:#ead0a0;font-size:10px;border-bottom:1px solid #69503a}.alert p{margin:0;line-height:1.6}.alert svg{flex-shrink:0}.messages{flex:1;min-height:0;overflow-y:auto;padding:4px 16px 17px;display:flex;flex-direction:column;scrollbar-color:#695276 #201928}.day-sep{display:flex;align-items:center;gap:8px;margin:17px 0 9px;font-size:9px;text-transform:capitalize;color:#ac96be}.day-sep:before,.day-sep:after{content:'';height:1px;background:#44344f;flex:1}.day-sep span{background:#2b2235;border:1px solid #493451;border-radius:5px;padding:4px 7px}.system-msg{align-self:center;display:flex;align-items:center;gap:9px;margin:8px 0;padding:11px;background:#303b2c;border:1px solid #536848;border-bottom:3px solid #1a2617;border-radius:9px;color:#cdddba;max-width:100%}.system-msg>span{color:#d6c58a;flex-shrink:0}.system-msg p{font-size:10px;line-height:1.6;margin:0;overflow-wrap:anywhere}.msg{display:flex;align-items:flex-start;gap:10px;max-width:95%;margin-top:13px}.msg.grouped{margin-top:4px}.avatar-slot{width:28px;flex-shrink:0;padding-top:4px}.message-body{min-width:0;flex:1}.meta{display:flex;align-items:center;gap:6px;margin:0 0 6px}.meta strong{font-size:10px;font-weight:700;color:#d4b9e9}.leader{font-size:6px;background:#51412e;color:#e3ca94;border:1px solid #75603d;padding:2px 3px;border-radius:3px}.bubble{font-size:12px;line-height:1.7;padding:11px 13px;margin:0;background:#352a41;border:1px solid #604570;border-bottom:3px solid #171020;border-radius:3px 13px 13px 13px;color:#ede1f6;white-space:pre-wrap;overflow-wrap:anywhere}.msg.mine{align-self:flex-end;flex-direction:row-reverse}.mine .meta{justify-content:flex-end}.mine .bubble{background:#654b7c;border-color:#a17bba;border-bottom-color:#332140;border-radius:13px 3px 13px 13px}.message-foot{display:flex;align-items:center;gap:8px;justify-content:flex-end;margin:4px 0}.message-foot time{font-size:8px;color:#b5a0c4}.reaction{display:inline-flex;align-items:center;gap:3px;border:0;border-radius:5px;background:none;color:#a88dbb;padding:3px;font-size:8px}.reaction:hover,.reaction.reacted{color:#f1b1c3;background:#4f3048}.reaction.reacted svg{fill:#e6a1b4}.quick-replies{display:flex;gap:6px;overflow-x:auto;padding:11px 12px 5px;border-top:1px solid #493451;flex-shrink:0}.quick-replies button{border:1px solid #684979;border-bottom:3px solid #1a1024;background:#36263f;color:#d8bce9;border-radius:7px;padding:6px;font-size:8px;white-space:nowrap}.quick-replies button:hover{background:#4d355b}.composer{display:flex;gap:8px;align-items:center;padding:10px 12px 14px}.composer input{flex:1;min-width:0;border:1px solid #715180;border-bottom:3px solid #100a18;border-radius:9px;background:#15101d;color:#f3e8fc;font-size:11px;padding:13px 11px;outline-offset:2px}.composer input::placeholder{color:#a48bb7}.send{width:42px;height:43px;display:grid;place-items:center;background:#b4d58b;border:1px solid #daecb7;border-bottom:4px solid #687e4e;border-radius:10px;color:#2e4229;transition:transform .15s}.send:enabled:hover{transform:translateY(-2px);background:#c8e5a3}.send:disabled{background:#43364e;border-color:#655171;color:#9983a8;cursor:default}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.chat button:focus-visible,.chat input:focus-visible{outline:2px solid #e0bdff;outline-offset:2px}
.chat {
  background:
    radial-gradient(ellipse at 100% 0, #9b75ba18, transparent 34%),
    #1e1b28;
}

.chat-head {
  background:
    radial-gradient(circle at 100% 0, #ffffff10, transparent 35%),
    linear-gradient(125deg, #42304f, #30243b);
  border-bottom-color: #72558a;
}

.chat-emblem {
  box-shadow: 0 5px 0 #21152b, 0 0 20px #d2b0ef24;
  transition: transform .18s;
}

.chat-head:hover .chat-emblem {
  transform: rotate(0) translateY(-2px);
}

.chat-title i {
  box-shadow: 0 0 0 3px #b8d69b20;
  animation: camp-online 2.4s ease-in-out infinite;
}

.size-toggle-btn,
.icon-button {
  transition: transform .16s, background .16s, border-color .16s, color .16s;
}

.size-toggle-btn:hover,
.icon-button:hover {
  transform: translateY(-1px);
  border-color: #a17bba;
}

.size-toggle-btn:active,
.icon-button:active {
  transform: translateY(1px);
}

.team-checks {
  background: linear-gradient(100deg, #2c2437, #26202f);
}

.camp-avatars > * {
  position: relative;
  border: 2px solid #2b2235;
  border-radius: 50%;
}

.team-checks > span {
  border-radius: 999px;
  box-shadow: inset 0 1px #ffffff10;
}

.day-sep span {
  box-shadow: 0 2px 8px #0e091422;
}

.bubble {
  box-shadow: 0 3px 10px #0d08131c;
  transition: border-color .16s, transform .16s;
}

.msg:not(.mine) .bubble:hover {
  border-color: #8e6ba6;
  transform: translateY(-1px);
}

.mine .bubble {
  background: linear-gradient(135deg, #73558c, #5c426f);
}

.system-msg {
  box-shadow: inset 0 1px #ffffff0a, 0 3px 10px #0d081322;
}

.reaction {
  min-width: 25px;
  min-height: 23px;
  justify-content: center;
  transition: background .16s, color .16s, transform .16s;
}

.reaction:hover {
  transform: scale(1.08);
}

.quick-replies {
  background: linear-gradient(180deg, #201a29, #1e1b28);
}

.quick-replies button {
  border-radius: 999px;
  transition: transform .15s, background .15s, border-color .15s;
}

.quick-replies button:hover {
  transform: translateY(-2px);
  border-color: #a17bba;
}

.quick-replies button:active {
  transform: translateY(0);
}

.composer {
  background: #1e1b28;
  border-top: 1px solid #34283f;
}

.composer:focus-within input {
  border-color: #ae86c9;
  box-shadow: 0 0 0 3px #bd94df1c;
}

.send:enabled {
  transition: transform .16s, filter .16s, box-shadow .16s;
}

.send:enabled:hover {
  filter: brightness(1.08);
  transform: translateY(-2px) rotate(-3deg);
}

.send:enabled:active {
  box-shadow: 0 1px 0 color-mix(in srgb, var(--chat-accent, #8b5cf6) 42%, #1d142a);
  transform: translateY(1px);
}

@keyframes camp-online {
  50% { box-shadow: 0 0 0 5px #b8d69b10; }
}

@media(prefers-reduced-motion:reduce) {
  .chat-title i {
    animation: none;
  }
}

.chat-head {
  min-height: 78px;
  padding: 18px 17px;
}

.chat-title h3 {
  font-size: 19px;
}

.chat-title > span {
  font-size: 10px;
}

.size-toggle-btn,
.icon-button {
  min-height: 36px;
  font-size: 11px;
  border-radius: 9px;
}

.icon-button {
  width: 36px;
}

.team-checks {
  min-height: 62px;
  padding: 12px 17px;
}

.team-checks > span {
  font-size: 10px;
  padding: 7px 10px;
}

.messages {
  padding-inline: 18px;
}

.day-sep {
  font-size: 10px;
}

.msg {
  max-width: 97%;
}

.meta strong {
  font-size: 11px;
}

.leader {
  padding: 3px 6px;
  font-size: 8px;
  font-weight: 900;
}

.bubble {
  padding: 12px 14px;
  font-size: 13px;
}

.message-foot time,
.reaction {
  font-size: 9px;
}

.quick-replies {
  gap: 8px;
  padding: 12px 14px 7px;
}

.quick-replies button {
  padding: 8px 11px;
  font-size: 10px;
  font-weight: 800;
}

.composer {
  gap: 10px;
  padding: 12px 14px 16px;
}

.composer input {
  min-height: 46px;
  padding: 12px 13px;
  font-size: 12px;
}

.send {
  width: 46px;
  height: 46px;
  border-radius: 12px;
}

@media(max-width:650px) {
  .chat-head {
    gap: 8px;
    padding-inline: 12px;
  }

  .chat-head-actions {
    gap: 4px;
  }

  .size-toggle-btn {
    padding-inline: 7px;
    font-size: 10px;
  }
}
.chat-head {
  position: relative;
  overflow: hidden;
  border-bottom: 0;
  background: color-mix(in srgb, var(--chat-accent, #8b5cf6) 28%, #1d1428);
}
.chat-head::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--chat-banner);
  background-size: 104% 238%;
  background-position: center 49.5%;
  background-repeat: no-repeat;
  z-index: 0;
  pointer-events: none;
}
.chat-head::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    92deg,
    rgba(16, 10, 26, 0.56) 0%,
    rgba(16, 10, 26, 0.18) 52%,
    rgba(16, 10, 26, 0.38) 100%
  );
  z-index: 0;
  pointer-events: none;
}
.chat-head > * {
  position: relative;
  z-index: 1;
}
.chat-emblem {
  color: #231730;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--chat-accent, #aa83cc) 56%, #f9f2ff),
    color-mix(in srgb, var(--chat-accent, #aa83cc) 68%, #f1e6ff)
  );
  border: 0;
  border-bottom: 4px solid rgba(18, 10, 28, 0.55);
  box-shadow: 0 5px 14px rgba(10, 5, 18, 0.4);
}
.chat-title h3 {
  color: #fff;
  text-shadow: 0 2px 8px rgba(10, 6, 18, 0.75);
}
.chat-title > span {
  color: #f4ecfc;
  text-shadow: 0 1px 6px rgba(10, 6, 18, 0.8);
}
.chat {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--chat-accent, #8b5cf6) 40%, #241730) 0%,
    color-mix(in srgb, var(--chat-accent, #8b5cf6) 32%, #1d1328) 100%
  );
}
.team-checks {
  background: color-mix(in srgb, var(--chat-accent, #8b5cf6) 34%, #21152c);
}
.day-sep span {
  background: color-mix(in srgb, var(--chat-accent, #8b5cf6) 36%, #231630);
  color: #f4ebfb;
}
.msg:not(.mine) .bubble {
  background: color-mix(in srgb, var(--chat-accent, #8b5cf6) 28%, #261a34);
}
.mine .bubble {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--chat-accent, #73558c) 56%, #453359),
    color-mix(in srgb, var(--chat-accent, #5c426f) 44%, #312340)
  );
}
.quick-replies {
  background: color-mix(in srgb, var(--chat-accent, #8b5cf6) 30%, #1f142b);
}
.quick-replies button {
  background: color-mix(in srgb, var(--chat-accent, #8b5cf6) 42%, #281a36);
  color: #f7effd;
}
.composer {
  background: color-mix(in srgb, var(--chat-accent, #8b5cf6) 30%, #1d1328);
}
.composer input {
  background: rgba(18, 12, 28, 0.62);
}
.team-checks > span {
  color: #231730;
  font-weight: 800;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--chat-accent, #8b5cf6) 56%, #f9f2ff),
    color-mix(in srgb, var(--chat-accent, #8b5cf6) 68%, #f1e6ff)
  );
  border-color: transparent;
}
.send:enabled,
.send:enabled:hover {
  color: #231730;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--chat-accent, #8b5cf6) 56%, #f9f2ff),
    color-mix(in srgb, var(--chat-accent, #8b5cf6) 68%, #f1e6ff)
  );
  border-color: transparent;
  box-shadow: 0 3px 0 color-mix(in srgb, var(--chat-accent, #8b5cf6) 42%, #1d142a);
}
.mission-join {
  color: #231730;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--chat-accent, #8b5cf6) 56%, #f9f2ff),
    color-mix(in srgb, var(--chat-accent, #8b5cf6) 68%, #f1e6ff)
  );
}
.chat { background: color-mix(in srgb, var(--chat-accent) 7%, #201b28); }
.chat-head::before { opacity: .55; }
.chat-head { min-height: 64px; }
.composer { background: transparent; }
.day-sep span { background: transparent; color: #b7a9c3; }
.msg:not(.mine) .bubble { background: color-mix(in srgb, var(--chat-accent) 10%, #2a2433); }
.mine .bubble { background: color-mix(in srgb, var(--chat-accent) 24%, #342940); }
.chat .system-msg {
  background: color-mix(in srgb, var(--chat-accent) 18%, #231d2d);
  color: color-mix(in srgb, var(--chat-accent) 32%, white);
  border: 0;
}
.chat .system-msg > span { color: color-mix(in srgb, var(--chat-accent) 68%, white); }
.chat .mission-join { background: color-mix(in srgb, var(--chat-accent) 64%, #ece3f3); color: #241a2d; }

.chat-typing{display:flex;align-items:center;gap:8px;flex:none;padding:5px 14px 8px;color:#dcc8e8;font-size:11px}
.typing-dots{display:inline-flex;align-items:center;gap:4px;flex:none;padding:8px 9px;border-radius:12px;background:#3a2d46;color:var(--chat-accent,#cba5eb)}
.typing-dots i{width:5px;height:5px;border-radius:50%;background:currentColor;animation:typing-bounce 1s ease-in-out infinite}
.typing-dots i:nth-child(2){animation-delay:.13s}
.typing-dots i:nth-child(3){animation-delay:.26s}
@keyframes typing-bounce{0%,60%,100%{transform:none;opacity:.55}30%{transform:translateY(-3px);opacity:1}}
@media(prefers-reduced-motion:reduce){.typing-dots i{animation:none}}
</style>
