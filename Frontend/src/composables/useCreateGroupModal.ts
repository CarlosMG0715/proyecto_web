import { ref } from 'vue'

export type GroupModalTab = 'create' | 'join'

/**
 * Estado compartido del modal de "Crear grupo / Unirse a un grupo".
 * Permite abrirse directamente en la pestaña 'create' o 'join', y alternar entre ambas.
 */
const isOpen = ref(false)
const activeTab = ref<GroupModalTab>('create')

export function useCreateGroupModal() {
  function open(tabOrEvent?: GroupModalTab | Event): void {
    if (tabOrEvent === 'join' || tabOrEvent === 'create') {
      activeTab.value = tabOrEvent
    } else {
      activeTab.value = 'create'
    }
    isOpen.value = true
  }

  function openCreate(): void {
    open('create')
  }

  function openJoin(): void {
    open('join')
  }

  function close(): void {
    isOpen.value = false
  }

  return {
    isOpen,
    activeTab,
    open,
    openCreate,
    openJoin,
    close,
  }
}
