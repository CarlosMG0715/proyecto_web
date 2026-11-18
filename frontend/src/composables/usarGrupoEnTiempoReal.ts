// Escucha avisos de Socket.IO y vuelve a consultar el grupo con la sesión actual.
import { onUnmounted, watch } from 'vue'
import { io, type Socket } from 'socket.io-client'
import type { Ref } from 'vue'
import { usarAlmacenSesion } from '@/stores/sesion'
export function usarGrupoEnTiempoReal(
  idGrupo: Ref<string>,
  refresh: () => Promise<void>,
) {
  const session = usarAlmacenSesion()
  let socket: Socket | undefined
  watch(
    [idGrupo, () => session.tokenAcceso],
    ([id, token]) => {
      socket?.disconnect()
      if (!token) return
      socket = io({ auth: { token } })
      socket.on('connect', () => {
        socket?.emit('watch-group', id)
        void refresh()
      })
      socket.on('group-changed', () => {
        void refresh()
      })
    },
    { immediate: true },
  )
  onUnmounted(() => socket?.disconnect())
}
