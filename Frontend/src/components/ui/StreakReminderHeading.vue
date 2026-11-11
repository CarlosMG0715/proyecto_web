<script setup lang="ts">
import reminderBanner from '@/assets/Recordatorio RACHA.png'
import StreakFlame from '@/components/ui/StreakFlame.vue'

defineProps<{ title: string; titleId: string }>()
</script>

<template>
  <header class="streak-reminder-heading">
    <img :src="reminderBanner" alt="" />
    <div class="streak-reminder-title">
      <span class="streak-reminder-flame" aria-hidden="true"><StreakFlame :size="40" /></span>
      <h2 :id="titleId">{{ title }}</h2>
    </div>
  </header>
</template>

<style scoped>
.streak-reminder-heading img { display: block; width: 100%; border-radius: 17px; }
.streak-reminder-title { display: flex; align-items: center; gap: 12px; margin-top: 15px; }
.streak-reminder-flame {
  display: grid;
  place-items: center;
  flex: none;
  width: 50px;
  height: 50px;
  border-radius: 15px;
  background: #f8a25222;
}
.streak-reminder-title h2 {
  margin: 0;
  color: #fff1e2;
  font: 800 clamp(22px, 5vw, 31px)/1.05 'Baloo 2', var(--font);
}
</style>
