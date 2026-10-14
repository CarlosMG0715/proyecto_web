<script setup lang="ts">
/**
 * Layout de la parte privada de la app (después de iniciar sesión):
 * menú lateral a la izquierda + la pantalla actual (RouterView) a la derecha.
 */
import AppSidebar from '@/components/layout/AppSidebar.vue'
import CreateGroupModal from '@/components/group/CreateGroupModal.vue'
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
</style>
