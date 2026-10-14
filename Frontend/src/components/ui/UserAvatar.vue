<script setup lang="ts">
/**
 * Foto de perfil circular. Si no hay foto, muestra las iniciales con un color
 * estable (siempre el mismo color para el mismo nombre).
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    src?: string | null
    size?: number
    online?: boolean
    ring?: boolean
  }>(),
  { src: null, size: 36, online: false, ring: false },
)

const PALETTE = ['#8b5cf6', '#22c55e', '#f5a524', '#38bdf8', '#f43f5e', '#a855f7', '#14b8a6']

const initials = computed(() =>
  props.name
    .split(' ')
    .filter((p) => p.length > 0)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join(''),
)

const color = computed(() => {
  let hash = 0
  for (const ch of props.name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length] ?? '#8b5cf6'
})

const dotSize = computed(() => Math.max(8, Math.round(props.size * 0.26)))
</script>

<template>
  <span
    class="avatar"
    :class="{ ring }"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px` }"
  >
    <img v-if="src" :src="src" :alt="`Foto de ${name}`" />
    <span v-else class="initials" :style="{ background: color }">{{ initials }}</span>
    <span
      v-if="online"
      class="online"
      :style="{ width: `${dotSize}px`, height: `${dotSize}px` }"
    ></span>
  </span>
</template>

<style scoped>
.avatar {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  border-radius: 50%;
}

.avatar.ring {
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--primary);
}

.avatar img,
.initials {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.initials {
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
}

.online {
  position: absolute;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  background: var(--success);
  border: 2px solid var(--surface);
}
</style>
