<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Grupo } from '@/types/grupo'
import { servicioGrupos } from '@/services/servicioGrupos'
import { mensajeError } from '@/services/errores'
import { PERSONAJES } from '@/stores/personajes'
import { usarAlmacenSesion } from '@/stores/sesion'
import IconoPersonaje from '@/components/ui/IconoPersonaje.vue'
import IconoAplicacion from '@/components/ui/IconoAplicacion.vue'
import { obtenerTemaBannerGrupo } from '@/constants/bannersGrupos'
const props = defineProps<{ group: Grupo }>()
const emit = defineEmits<{ changed: [] }>()
const session = usarAlmacenSesion()
const draft = ref('')
const error = ref('')
const busy = ref(false),
  scroller = ref<HTMLElement>()
watch(
  () => props.group.messages.length,
  async () => {
    await nextTick()
    scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
  },
  { immediate: true },
)
async function send() {
  if (busy.value || !draft.value.trim()) return
  busy.value = true
  error.value = ''
  try {
    await servicioGrupos.enviarMensaje(props.group.id, draft.value)
    draft.value = ''
    emit('changed')
  } catch (cause) {
    error.value = mensajeError(cause)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section
    class="chat"
    :style="{
      '--chat-accent': group.color,
      '--chat-banner': `url('${obtenerTemaBannerGrupo(group.color).urlBannerSeccion}')`,
    }"
  >
    <header class="chat-head">
      <span class="chat-emblem"><IconoAplicacion name="message" /></span>
      <div class="chat-title">
        <h3>Chat del grupo</h3>
        <span>Mensajes y actividad del equipo</span>
      </div>
    </header>
    <div
      ref="scroller"
      class="messages"
      role="log"
      aria-label="Mensajes del grupo"
    >
      <template v-for="message in group.messages" :key="message.id">
        <div v-if="message.type === 'SYSTEM'" class="system-msg">
          <p>{{ message.content }}</p>
        </div>
        <article
          v-else
          class="msg"
          :class="{ mine: message.author?.id === session.usuarioActual?.id }"
        >
          <IconoPersonaje
            :character="
              PERSONAJES.find((c) => c.id === message.author?.idPersonaje) ??
              PERSONAJES[0]
            "
            :size="28"
          />
          <div class="message-body">
            <div class="meta">
              <strong>{{ message.author?.name ?? 'Cuenta eliminada' }}</strong>
            </div>
            <p class="bubble">{{ message.content }}</p>
            <time>
              {{
                new Date(message.creadoEn).toLocaleTimeString('es', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }}
            </time>
          </div>
        </article>
      </template>
    </div>
    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <form class="composer" @submit.prevent="send">
      <label class="sr-only" for="chat-message">Mensaje</label>
      <input
        id="chat-message"
        v-model="draft"
        placeholder="Escribe a tu equipo…"
        maxlength="1000"
        autocomplete="off"
        required
      />
      <button
        class="send"
        :disabled="busy || !draft.trim()"
        aria-label="Enviar mensaje"
      >
        <IconoAplicacion name="arrow-right" />
      </button>
    </form>
  </section>
</template>
<style scoped src="@/assets/styles/components/ChatGrupo.css"></style>

<style scoped>
.chat {
  height: 580px;
  border: 1px solid #59416b;
  border-radius: 18px;
  overflow: hidden;
}
.message-body time {
  font-size: 9px;
  color: #b5a4bf;
}
.messages {
  min-height: 200px;
}
</style>
