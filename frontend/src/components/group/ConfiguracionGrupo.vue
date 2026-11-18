<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DialogoAplicacion from '@/components/ui/DialogoAplicacion.vue'
import ColoresGrupo from './ColoresGrupo.vue'
import type { Grupo } from '@/types/grupo'
import { servicioGrupos } from '@/services/servicioGrupos'
import { mensajeError } from '@/services/errores'
import { usarAlmacenGrupos } from '@/stores/grupos'
import { usarAlmacenSesion } from '@/stores/sesion'
const props = defineProps<{ group: Grupo }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const name = ref(props.group.name)
const color = ref(props.group.color)
const error = ref('')
const busy = ref(false)
const router = useRouter()
const groups = usarAlmacenGrupos()
const session = usarAlmacenSesion()
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await action()
    emit('changed')
  } catch (cause) {
    error.value = mensajeError(cause)
  } finally {
    busy.value = false
  }
}
async function save() {
  await run(() =>
    servicioGrupos.actualizarGrupo(props.group.id, {
      name: name.value,
      color: color.value,
    }),
  )
  if (!error.value) emit('close')
}
function reviveMember(id: string) {
  void run(() => servicioGrupos.reiniciarPersonaje(props.group.id, id))
}
function removeMember(id: string) {
  if (confirm('¿Quitar a este integrante?'))
    void run(() => servicioGrupos.quitarIntegrante(props.group.id, id))
}
async function remove() {
  if (!confirm('¿Borrar el grupo y todos sus hábitos y mensajes?')) return
  await run(async () => {
    await servicioGrupos.eliminarGrupo(props.group.id)
    await groups.recargarGrupos()
    emit('close')
    await router.push('/app/perfil')
  })
}
</script>
<template>
  <DialogoAplicacion title="Opciones del grupo" @close="emit('close')">
    <form @submit.prevent="save">
      <label>
        Nombre
        <input v-model="name" required maxlength="80" />
      </label>
      <ColoresGrupo v-model="color" />
      <button class="boton-juego" :disabled="busy">Guardar</button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <h3>Integrantes</h3>
    <div v-for="member in group.members" :key="member.id" class="member">
      <span>
        {{ member.name }} · {{ member.role === 'ADMIN' ? 'Admin' : 'Miembro' }}
      </span>
      <button
        v-if="member.caidoEn && member.id !== session.usuarioActual?.id"
        class="boton-juego"
        :disabled="busy"
        @click="reviveMember(member.id)"
      >Revivir</button>
      <button
        v-if="member.id !== session.usuarioActual?.id"
        class="boton-juego secondary"
        :disabled="busy"
        @click="removeMember(member.id)"
      >
        Quitar
      </button>
    </div>
    <button class="boton-juego secondary" :disabled="busy" @click="remove">
      Borrar grupo
    </button>
  </DialogoAplicacion>
</template>
<style scoped>
.member {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 15px 0;
}
</style>
