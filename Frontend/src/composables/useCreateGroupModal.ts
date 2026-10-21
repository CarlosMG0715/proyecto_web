import { ref } from 'vue'

/**
 * Estado compartido del modal "Crear grupo".
 * Lo puede abrir el menú lateral o la pantalla de Inicio, y el layout lo muestra.
 */
const isOpen = ref(false)

export function useCreateGroupModal() {
  return {
    isOpen,
    open: (): void => {
      isOpen.value = true
    },
    close: (): void => {
      isOpen.value = false
    },
  }
}
