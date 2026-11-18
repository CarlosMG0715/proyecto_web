// Pinia conserva los grupos recibidos del servidor para que las pantallas compartan el mismo estado.
import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { servicioGrupos } from '@/services/servicioGrupos'
import { mensajeError } from '@/services/errores'
import { usarAlmacenSesion } from './sesion'
import type { Grupo } from '@/types/grupo'
export const usarAlmacenGrupos = defineStore('groups', () => {
  const session = usarAlmacenSesion()
  const groups = ref<Grupo[]>([])
  const error = ref('')
  const estaCargando = ref(false)
  function grupoPorId(id: string) {
    return groups.value.find((group) => group.id === id)
  }
  async function recargarGrupos() {
    const idUsuario = session.usuarioActual?.id
    if (!idUsuario) return
    estaCargando.value = true
    try {
      const result = await servicioGrupos.listarGrupos()
      if (session.usuarioActual?.id === idUsuario) {
        groups.value = result
        error.value = ''
      }
    } catch (cause) {
      if (session.usuarioActual?.id === idUsuario) error.value = mensajeError(cause)
    } finally {
      estaCargando.value = false
    }
  }
  async function recargarGrupo(id: string) {
    const idUsuario = session.usuarioActual?.id
    const group = await servicioGrupos.obtenerGrupo(id)
    if (session.usuarioActual?.id !== idUsuario) return
    groups.value = [...groups.value.filter((item) => item.id !== id), group]
  }
  watch(
    () => session.usuarioActual?.id,
    () => {
      groups.value = []
      error.value = ''
      void recargarGrupos()
    },
    { immediate: true },
  )
  return {
    groups,
    grupoPorId,
    error,
    estaCargando,
    recargarGrupos,
    recargarGrupo,
  }
})
