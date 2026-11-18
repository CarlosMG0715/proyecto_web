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
.colors {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.colors button {
  position: relative;
  padding: 0;
  border: 2px solid;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: #20192d;
  color: white;
}
.colors img {
  width: 100%;
  height: 62px;
  object-fit: cover;
}
.colors span {
  display: block;
  font-size: 10px;
  padding: 6px;
}
.colors .chosen {
  outline: 2px solid #fff;
  outline-offset: 3px;
}
</style>
