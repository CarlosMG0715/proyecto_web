<script setup lang="ts">
/**
 * Chat del grupo (panel derecho desplegable).
 * Hoy trabaja con el store local; luego Carlos lo conectará a socket.io.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import type { ChatMessage, Group, GroupMember } from '@/types/group'
import { dayLabel, formatClock } from '@/utils/time'

const props = defineProps<{
  group: Group
  alert: string | null
}>()

const emit = defineEmits<{
  close: []
  send: [text: string]
}>()

interface ChatRow {
  message: ChatMessage
  author: GroupMember | undefined
  showDay: boolean
  showHeader: boolean
}

const draft = ref('')
const scroller = ref<HTMLElement | null>(null)

const onlineCount = computed(() => props.group.members.filter((m) => m.isOnline).length)

const rows = computed<ChatRow[]>(() => {
  const list: ChatRow[] = []
  let prev: ChatMessage | undefined
  for (const message of props.group.messages) {
    const showDay = !prev || dayLabel(prev.sentAt) !== dayLabel(message.sentAt)
    const sameAuthor =
      prev !== undefined &&
      prev.kind === 'user' &&
      prev.authorId === message.authorId &&
      new Date(message.sentAt).getTime() - new Date(prev.sentAt).getTime() < 5 * 60_000
    list.push({
      message,
      author: props.group.members.find((m) => m.id === message.authorId),
      showDay,
      showHeader: showDay || !sameAuthor,
    })
    prev = message
  }
  return list
})

async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

function submit(): void {
  const text = draft.value.trim()
  if (!text) return
  emit('send', text)
  draft.value = ''
}

watch(() => props.group.messages.length, scrollToBottom)
watch(() => props.group.id, scrollToBottom)
onMounted(scrollToBottom)
</script>

<template>
  <section class="chat">
    <header class="chat-head">
      <div class="title">
        <h3>Chat del grupo</h3>
        <div class="presence">
          <div class="stack">
            <UserAvatar
              v-for="m in group.members"
              :key="m.id"
              :name="m.name"
              :src="m.avatarUrl"
              :size="20"
            />
          </div>
          <span>{{ group.members.length }} miembros · {{ onlineCount }} en línea</span>
        </div>
      </div>
      <button type="button" class="icon-btn" title="Cerrar chat" @click="emit('close')">
        <AppIcon name="x" :size="18" />
      </button>
    </header>

    <div v-if="alert" class="alert">
      <AppIcon name="alert" :size="16" />
      <p>{{ alert }}</p>
    </div>

    <div ref="scroller" class="messages">
      <template v-for="row in rows" :key="row.message.id">
        <div v-if="row.showDay" class="day-sep">
          <span>{{ dayLabel(row.message.sentAt) }}</span>
        </div>

        <div v-if="row.message.kind === 'system'" class="system-msg">
          <AppIcon name="shield" :size="13" />
          {{ row.message.text }}
        </div>

        <div
          v-else
          class="msg"
          :class="{ mine: row.author?.isCurrentUser, grouped: !row.showHeader }"
        >
          <div class="avatar-slot">
            <UserAvatar
              v-if="row.showHeader && !row.author?.isCurrentUser"
              :name="row.author?.name ?? 'Usuario'"
              :src="row.author?.avatarUrl ?? null"
              :size="32"
            />
          </div>
          <div class="body">
            <div v-if="row.showHeader" class="meta">
              <span class="author">{{ row.author?.isCurrentUser ? 'Tú' : row.author?.name }}</span>
              <span class="time">{{ formatClock(row.message.sentAt) }}</span>
            </div>
            <p class="bubble">{{ row.message.text }}</p>
          </div>
        </div>
      </template>
    </div>

    <form class="composer" @submit.prevent="submit">
      <input v-model="draft" type="text" maxlength="500" placeholder="Escribe un mensaje…" />
      <button type="submit" class="send" :disabled="!draft.trim()" title="Enviar">
        <AppIcon name="send" :size="16" />
      </button>
    </form>
  </section>
</template>

<style scoped>
.chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border);
}

.chat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.1rem 1.1rem 0.9rem;
  border-bottom: 1px solid var(--border);
}

.title h3 {
  margin: 0;
  font-size: 0.98rem;
}

.presence {
  margin-top: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.74rem;
  color: var(--muted);
}

.stack {
  display: flex;
}

.stack > * + * {
  margin-left: -6px;
}

.stack :deep(.avatar) {
  box-shadow: 0 0 0 2px var(--bg-sidebar);
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
}

.icon-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}

.alert {
  margin: 0.9rem 1rem 0;
  display: flex;
  gap: 0.55rem;
  padding: 0.7rem 0.8rem;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(245, 165, 36, 0.35);
  background: var(--warning-soft);
  color: #fcd34d;
  font-size: 0.8rem;
  line-height: 1.4;
}

.alert p {
  margin: 0;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
}

.day-sep {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 1rem 0 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: capitalize;
}

.day-sep::before,
.day-sep::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.system-msg {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.5rem 0;
  padding: 0.35rem 0.7rem;
  border-radius: 99px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.72rem;
  color: var(--text-soft);
  text-align: center;
}

.msg {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.75rem;
  max-width: 88%;
}

.msg.grouped {
  margin-top: 0.2rem;
}

.avatar-slot {
  width: 32px;
  flex-shrink: 0;
}

.body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.meta {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  margin-bottom: 0.2rem;
}

.author {
  font-size: 0.8rem;
  font-weight: 700;
}

.time {
  font-size: 0.68rem;
  color: var(--muted);
}

.bubble {
  margin: 0;
  padding: 0.55rem 0.75rem;
  border-radius: 4px 12px 12px 12px;
  background: var(--surface-2);
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--text);
  word-wrap: break-word;
}

.msg.mine {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.msg.mine .avatar-slot {
  display: none;
}

.msg.mine .body {
  align-items: flex-end;
}

.msg.mine .bubble {
  border-radius: 12px 4px 12px 12px;
  background: var(--primary-strong);
  color: #fff;
}

.composer {
  display: flex;
  gap: 0.5rem;
  padding: 0.85rem 1rem 1rem;
  border-top: 1px solid var(--border);
}

.composer input {
  flex: 1;
  min-width: 0;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--surface);
  font-size: 0.86rem;
  outline: none;
}

.composer input:focus {
  border-color: var(--primary);
}

.send {
  width: 40px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--primary-strong);
  color: #fff;
}

.send:disabled {
  background: var(--surface-2);
  color: var(--muted);
  cursor: not-allowed;
}
</style>
