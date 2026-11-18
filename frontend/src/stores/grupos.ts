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
  // mas nuevos primero siempre por fecha de creacion
  function ordenarGrupos() {
    groups.value.sort((a, b) => {
      const diferencia = Date.parse(b.creadoEn) - Date.parse(a.creadoEn)
      return diferencia || a.id.localeCompare(b.id)
    })
  }
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
        ordenarGrupos()
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
    const indice = groups.value.findIndex((item) => item.id === id)
    if (indice === -1) {
      groups.value.push(group)
    } else {
      groups.value[indice] = group
    }
    ordenarGrupos()
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
