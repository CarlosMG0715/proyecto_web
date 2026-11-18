import { ref } from 'vue'
const estaAbierto = ref(false)
const activeTab = ref<'create' | 'join'>('create')
export function usarModalCrearGrupo() {
  return {
    estaAbierto,
    activeTab,
    open() {
      activeTab.value = 'create'
      estaAbierto.value = true
    },
    openJoin() {
      activeTab.value = 'join'
      estaAbierto.value = true
    },
    close() {
      estaAbierto.value = false
    },
  }
}
