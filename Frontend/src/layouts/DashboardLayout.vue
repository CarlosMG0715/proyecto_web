<script setup lang="ts">
/**
 * Layout de la parte privada de la app (después de iniciar sesión):
 * menú lateral a la izquierda + la pantalla actual (RouterView) a la derecha.
 */
import { onMounted } from 'vue'
import '@/assets/styles/game-views.css'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import CreateGroupModal from '@/components/group/CreateGroupModal.vue'
import { useGroupsStore } from '@/stores/groups'
const groups = useGroupsStore()
onMounted(() => { void groups.fetchGroups() })
onMounted(() => {
  try {
    const preferences = JSON.parse(localStorage.getItem('kordia:preferences') ?? '{}')
    document.documentElement.classList.toggle('kordia-reduce-motion', preferences.motion === false)
  } catch { /* Las preferencias inválidas usan los efectos predeterminados. */ }
})
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <main class="content">
      <RouterView />
    </main>
    <CreateGroupModal />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  min-height: 100vh;
  background: var(--bg);
}

.content {
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}
@media(max-width:700px){.shell{grid-template-columns:minmax(0,1fr);padding-bottom:68px;min-height:100dvh}.content{height:calc(100dvh - 68px)}}
</style>
