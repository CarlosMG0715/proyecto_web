<script setup lang="ts">
import { computed } from 'vue'
import { usarAlmacenPersonajes } from '@/stores/personajes'
const characters = usarAlmacenPersonajes()
const estilosTema = computed(() => ({
  '--tema-acento': characters.theme.color,
  '--tema-oscuro': characters.theme.dark,
  '--tema-suave': characters.theme.sky,
  '--tema-suelo': characters.theme.grass,
}))
</script>
<template>
  <div
    class="kordia-app-theme"
    :style="estilosTema"
    :data-kordia-theme="characters.theme.id"
  >
    <RouterView />
  </div>
</template>
