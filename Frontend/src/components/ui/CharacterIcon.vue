<script setup lang="ts">
import sheet from '@/assets/ICONOS.png'
import type { Character } from '@/stores/characters'

withDefaults(
  defineProps<{
    character: Character
    size?: number
    ring?: boolean
  }>(),
  {
    size: 58,
    ring: true,
  }
)
</script>

<template>
  <span
    class="character-icon"
    :class="{ 'has-ring': ring }"
    role="img"
    :aria-label="character.name"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      '--character-color': character.color,
      '--character-dark': character.dark || '#261b33',
    }"
  >
    <span
      class="character-icon-art"
      :style="{
        backgroundImage: `url(${sheet})`,
        backgroundPosition: `${character.x}% ${character.y}%`,
      }"
    />
  </span>
</template>

<style scoped>
.character-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  vertical-align: middle;
  background-color: var(--character-dark);
  box-sizing: border-box;
}

.character-icon.has-ring {
  box-shadow: 0 0 0 3px var(--character-color), 0 4px 10px rgba(0, 0, 0, 0.4);
}

.character-icon-art {
  position: absolute;
  /* El zoom del 7% elimina los márgenes oscuros del recorte de la hoja y centra el retrato circular exactamente con el marco */
  inset: -7%;
  background-size: 300% 200%;
  background-repeat: no-repeat;
  border-radius: 50%;
  pointer-events: none;
}
</style>
