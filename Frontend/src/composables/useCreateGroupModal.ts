// estado compartido para que distintos componentes abran y cierren el mismo modal.
import { ref } from 'vue'

export type GroupModalTab = 'create' | 'join'

/**
 * Estado compartido del modal de "Crear grupo / Unirse a un grupo".
 * Permite abrirse directamente en la pestaña 'create' o 'join', y alternar entre ambas.
 */
const isOpen = ref(false)
const activeTab = ref<GroupModalTab>('create')
const replaceArchivedGroupId = ref<string>()

export function useCreateGroupModal() {
  function open(tabOrEvent?: GroupModalTab | Event): void {
    replaceArchivedGroupId.value = undefined
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

  function openReplacement(groupId: string): void {
    open('create')
    replaceArchivedGroupId.value = groupId
  }

  function openJoin(): void {
    open('join')
  }

  function close(): void {
    isOpen.value = false
    replaceArchivedGroupId.value = undefined
  }

  return {
    isOpen,
    activeTab,
    open,
    openCreate,
    openReplacement,
    replaceArchivedGroupId,
    openJoin,
    close,
  }
}
