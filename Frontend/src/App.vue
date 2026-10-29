<script setup lang="ts">
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/characters'
const characters = useCharacterStore()
const themeStyle = computed(() => ({ '--theme-accent': characters.theme.color, '--theme-dark': characters.theme.dark, '--theme-soft': characters.theme.sky, '--theme-ground': characters.theme.grass }))
</script>
<template><div class="kordia-app-theme" :style="themeStyle" :data-kordia-theme="characters.theme.id"><RouterView /></div></template>
