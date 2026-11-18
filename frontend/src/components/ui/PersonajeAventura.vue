<script setup lang="ts">
import type { Personaje } from '@/stores/personajes'
withDefaults(
  defineProps<{ character: Personaje; size?: number; complete?: boolean }>(),
  { size: 84, complete: false },
)
</script>
<template>
  <span
    class="adventure-character"
    :class="[character.id, { complete }]"
    :style="{
      width: `${size}px`,
      height: `${size * 1.2}px`,
      '--body': character.body,
      '--accent': character.color,
      '--dark': character.dark,
    }"
    aria-hidden="true"
  >
    <span class="shadow"></span>
    <span class="backpack"></span>
    <span class="leg left"></span>
    <span class="leg right"></span>
    <span class="arm left"></span>
    <span class="arm right"></span>
    <span class="body"></span>
    <span class="scarf"></span>
    <span class="hood"></span>
    <span class="hair-back"></span>
    <span class="ear left"></span>
    <span class="ear right"></span>
    <span class="tail"></span>
    <span class="head">
      <span class="muzzle"></span>
      <span class="beak"></span>
      <span class="eye left"></span>
      <span class="eye right"></span>
      <span class="cheek left"></span>
      <span class="cheek right"></span>
    </span>
    <span class="fringe"></span>
    <span class="headphones"></span>
    <span
      v-if="character.id === 'royal'"
      class="headphones headphones-right"
    ></span>
    <span class="hat"></span>
    <span class="leaf"></span>
    <span v-if="complete" class="spark">✦</span>
  </span>
</template>
<style scoped src="@/assets/styles/components/PersonajeAventura.css"></style>
