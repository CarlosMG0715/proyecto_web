<script setup lang="ts">
// modal para ingresar un codigo; el store se ocupa de llamar a la api y guardar el grupo.
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGroupsStore } from '@/stores/groups'

const props = defineProps<{ open: boolean; initialCode?: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const groups = useGroupsStore()
const router = useRouter()
const code = ref('')
const loading = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      code.value = props.initialCode ?? ''
      groups.error = null
    }
  },
)

async function onSubmit(): Promise<void> {
  // evita doble envio mientras espera y muestra el error que devuelve el store.
  loading.value = true
  try {
    const id = await groups.joinGroup(code.value.trim())
    emit('close')
    await router.push({ name: 'grupo', params: { groupId: id } })
  } catch {
    /* el mensaje queda en groups.error */
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('close')">
    <form class="modal" @submit.prevent="onSubmit">
      <h2>Unirme con código</h2>
      <input v-model="code" type="text" placeholder="Código de invitación" required minlength="4" maxlength="20" autofocus />
      <p v-if="groups.error" class="err" role="alert">{{ groups.error }}</p>
      <div class="row">
        <button type="button" class="ghost" @click="emit('close')">Cancelar</button>
        <button type="submit" :disabled="loading">{{ loading ? 'Uniéndome...' : 'Unirme' }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: grid; place-items: center; z-index: 50; }
.modal { width: min(24rem, 92vw); display: flex; flex-direction: column; gap: .75rem; padding: 1.25rem; border-radius: 12px; background: #17171f; color: #fff; border: 1px solid #2d2d3a; }
.modal h2 { margin: 0; font-size: 1.1rem; }
input { padding: .6rem .75rem; border-radius: 8px; border: 1px solid #3a3a4a; background: #0f0f15; color: #fff; font: inherit; text-transform: uppercase; }
.row { display: flex; justify-content: flex-end; gap: .5rem; }
button { padding: .55rem 1rem; border: 0; border-radius: 8px; background: #8b5cf6; color: #fff; font: inherit; cursor: pointer; }
button.ghost { background: transparent; border: 1px solid #3a3a4a; }
button:disabled { opacity: .6; }
.err { margin: 0; color: #f87171; font-size: .9rem; }
</style>
