<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 88 })
</script>

<template>
  <svg viewBox="0 0 88 88" :width="size" :height="size" aria-hidden="true">
    <ellipse cx="44" cy="78" rx="34" ry="6" fill="#292139" opacity=".35" />
    <path d="M22 75V36a22 22 0 0 1 44 0v39Z" fill="#a49eb1" stroke="#51485e" stroke-width="4" />
    <path d="M44 31v22m-8-15h16M34 62h20" stroke="#51485e" stroke-width="3" stroke-linecap="round" />
    <rect x="16" y="71" width="56" height="9" rx="4" fill="#756d84" stroke="#51485e" stroke-width="3" />
  </svg>
</template>
