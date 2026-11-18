<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DialogoAplicacion from '@/components/ui/DialogoAplicacion.vue'
import ColoresGrupo from './ColoresGrupo.vue'
import { usarModalCrearGrupo } from '@/composables/usarModalCrearGrupo'
import { servicioGrupos } from '@/services/servicioGrupos'
import { mensajeError } from '@/services/errores'
import { usarAlmacenGrupos } from '@/stores/grupos'
import {
  URL_BANNER_UNIRSE,
  obtenerTemaBannerGrupo,
} from '@/constants/bannersGrupos'
const modal = usarModalCrearGrupo()
const router = useRouter()
const groups = usarAlmacenGrupos()
const name = ref('')
const color = ref('#8b5cf6')
const code = ref('')
const error = ref('')
const busy = ref(false)
watch(modal.estaAbierto, () => {
  error.value = ''
  name.value = ''
  code.value = ''
})
async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const group =
      modal.activeTab.value === 'create'
        ? await servicioGrupos.crearGrupo({
            name: name.value,
            color: color.value,
          })
        : await servicioGrupos.unirseAlGrupo(code.value)
    await groups.recargarGrupos()
    modal.close()
    await router.push({ name: 'grupo', params: { idGrupo: group.id } })
  } catch (cause) {
    error.value = mensajeError(cause)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <DialogoAplicacion
    v-if="modal.estaAbierto.value"
    :title="
      modal.activeTab.value === 'create' ? 'Crear grupo' : 'Unirme a un grupo'
    "
    @close="modal.close"
  >
    <img
      class="modal-banner"
      :src="
        modal.activeTab.value === 'create'
          ? obtenerTemaBannerGrupo(color).urlBanner
          : URL_BANNER_UNIRSE
      "
      alt=""
    />
    <form @submit.prevent="submit">
      <template v-if="modal.activeTab.value === 'create'">
        <label>
          Nombre
          <input v-model="name" required maxlength="80" />
        </label>
        <ColoresGrupo v-model="color" />
        <p>El código de invitación se genera automáticamente.</p>
      </template>
      <label v-else>
        Código de invitación
        <input v-model="code" required maxlength="40" />
      </label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button class="boton-juego" :disabled="busy">
        {{
          busy
            ? 'Guardando…'
            : modal.activeTab.value === 'create'
              ? 'Crear mi grupo'
              : 'Entrar al grupo'
        }}
      </button>
    </form>
  </DialogoAplicacion>
</template>
<style scoped>
.modal-banner {
  width: 100%;
  height: 130px;
  object-fit: cover;
  border-radius: 14px;
}
</style>
