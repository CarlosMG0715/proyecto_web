<script setup lang="ts">
import { TEMAS_BANNER_GRUPO } from '@/constants/bannersGrupos'
const color = defineModel<string>({ required: true })
</script>
<template>
  <div class="colors">
    <button
      v-for="theme in TEMAS_BANNER_GRUPO"
      :key="theme.id"
      type="button"
      :aria-pressed="color === theme.color"
      :aria-label="theme.name"
      :class="{ chosen: color === theme.color }"
      :style="{ borderColor: theme.color }"
      @click="color = theme.color"
    >
      <img :src="theme.urlBanner" :style="{ filter: theme.filter }" alt="" />
      <span>{{ theme.name }}</span>
    </button>
  </div>
</template>
<style scoped>
.colors { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.colors button { position: relative; padding: 0; border: 1px solid transparent; border-radius: 10px; overflow: hidden; background: #20192d; color: white; min-height: 46px; }
.colors img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.colors span { position: relative; display: block; padding: 24px 8px 6px; font-size: 9px; font-weight: 800; background: linear-gradient(transparent, #120c1cb0); }
.colors .chosen { box-shadow: 0 0 0 2px #eee2ff; }
</style>
