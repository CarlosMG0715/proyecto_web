<script setup lang="ts">
import { usarAlmacenGrupos } from '@/stores/grupos'
import { usarModalCrearGrupo } from '@/composables/usarModalCrearGrupo'
import { obtenerTemaBannerGrupo } from '@/constants/bannersGrupos'
import LlamaRacha from '@/components/ui/LlamaRacha.vue'
const store = usarAlmacenGrupos()
const modal = usarModalCrearGrupo()
</script>
<template>
  <section class="panel-juego">
    <div class="titulo-seccion">
      <h2>Mis grupos</h2>
      <button class="boton-juego" @click="modal.open">Crear grupo</button>
    </div>
    <p v-if="store.error" role="alert">{{ store.error }}</p>
    <p v-else-if="store.estaCargando && !store.groups.length">Cargando grupos…</p>
    <div class="cards">
      <RouterLink
        v-for="group in store.groups"
        :key="group.id"
        :to="{ name: 'grupo', params: { idGrupo: group.id } }"
        class="group-card"
        :style="{ '--accent': group.color }"
      >
        <img
          :src="obtenerTemaBannerGrupo(group.color).urlBanner"
          :style="{ filter: obtenerTemaBannerGrupo(group.color).filter }"
          alt=""
        />
        <div>
          <h3>{{ group.name }}</h3>
          <p>
            {{ group.members.length }} integrantes ·
            {{ group.habits.length }} hábitos
          </p>
          <span>
            <LlamaRacha :size="30" />
            {{ group.streak }} días de racha
          </span>
        </div>
      </RouterLink>
    </div>
    <p v-if="!store.estaCargando && !store.groups.length" class="game-empty">
      Tu aventura comienza creando un grupo o entrando con su código.
    </p>
    <button class="boton-juego secondary" @click="modal.openJoin">
      Unirme con código
    </button>
  </section>
</template>
<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 20px;
}
.group-card {
  border: 1px solid var(--accent);
  border-radius: 16px;
  overflow: hidden;
  background: #201a2d;
  color: #f4edff;
  text-decoration: none;
}
.group-card > img {
  width: 100%;
  height: 100px;
  object-fit: cover;
}
.group-card > div {
  padding: 16px;
}
.group-card h3 {
  margin: 0;
}
.group-card p {
  font-size: 12px;
  color: #bbafcb;
}
.group-card span {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
</style>
