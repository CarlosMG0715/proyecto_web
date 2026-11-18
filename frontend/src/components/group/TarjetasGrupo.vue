<script setup lang="ts">
import { usarAlmacenGrupos } from '@/stores/grupos'
import { usarModalCrearGrupo } from '@/composables/usarModalCrearGrupo'
import { obtenerTemaBannerGrupo } from '@/constants/bannersGrupos'
import { PERSONAJES } from '@/stores/personajes'
import IconoAplicacion from '@/components/ui/IconoAplicacion.vue'
import IconoPersonaje from '@/components/ui/IconoPersonaje.vue'
import LlamaRacha from '@/components/ui/LlamaRacha.vue'
import type { Grupo } from '@/types/grupo'
const store = usarAlmacenGrupos()
const modal = usarModalCrearGrupo()
function caido(grupo: Grupo) {
  return grupo.members.length > 0 && grupo.members.every((miembro) => miembro.caidoEn)
}
</script>

<template>
  <section class="equipos">
    <header class="equipos-titulo">
      <h2>Tus equipos <small>{{ store.groups.length }}</small></h2>
      <div>
        <button @click="modal.open"><IconoAplicacion name="plus" :size="15" /> Crear grupo</button>
        <button @click="modal.openJoin"><IconoAplicacion name="link" :size="15" /> Unirme a un grupo</button>
      </div>
    </header>
    <p v-if="store.error" role="alert">{{ store.error }}</p>
    <div class="cards">
      <RouterLink v-for="grupo in store.groups" :key="grupo.id" :to="{ name: 'grupo', params: { idGrupo: grupo.id } }" class="team" :class="{ caido: caido(grupo) }" :style="{ '--team': grupo.color, '--team-banner': 'url(' + obtenerTemaBannerGrupo(grupo.color).urlBanner + ')', '--team-banner-filter': obtenerTemaBannerGrupo(grupo.color).filter ?? 'none' }">
        <div class="team-banner-cover">
          <span class="team-banner-art" aria-hidden="true"></span>
          <span class="team-banner-shade" aria-hidden="true"></span>
          <div class="team-top">
            <span class="emblem"><IconoAplicacion name="users" :size="22" /></span>
            <span class="team-streak"><template v-if="caido(grupo)">Aventura cerrada</template><template v-else><LlamaRacha :size="22" /> {{ grupo.streak }} días</template></span>
          </div>
          <h3>{{ grupo.name }}</h3>
          <p v-if="grupo.descripcion">{{ grupo.descripcion }}</p>
        </div>
        <div class="team-card-body">
          <div class="team-people">
            <div class="avatars">
              <IconoPersonaje v-for="miembro in grupo.members.slice(0, 5)" :key="miembro.id" :character="PERSONAJES.find((personaje) => personaje.id === miembro.idPersonaje) ?? PERSONAJES[0]!" :size="33" />
            </div>
            <IconoAplicacion name="arrow-right" :size="17" />
          </div>
          <template v-if="!caido(grupo)">
            <div class="team-track"><span :style="{ width: (grupo.members.length && grupo.habits.length ? grupo.members.filter((miembro) => miembro.completadosHoy === grupo.habits.length).length / grupo.members.length * 100 : 0) + '%' }"></span></div>
            <small>{{ grupo.members.filter((miembro) => grupo.habits.length > 0 && miembro.completadosHoy === grupo.habits.length).length }} de {{ grupo.members.length }} completaron hoy</small>
          </template>
        </div>
      </RouterLink>
    </div>
    <p v-if="!store.estaCargando && !store.groups.length">Crea un grupo o únete con el código de tus amigos.</p>
  </section>
</template>

<style scoped>
.equipos-titulo { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
.equipos-titulo h2 { font: 800 24px 'Baloo 2', var(--font); margin: 0; }
.equipos-titulo h2 small { background: #30283d; border-radius: 5px; padding: 4px 7px; font: 700 10px var(--font); vertical-align: middle; }
.equipos-titulo > div { display: flex; gap: 18px; }
.equipos-titulo button { display: flex; align-items: center; gap: 6px; background: none; border: 0; color: var(--profile-color, #9bd7c4); font-size: 11px; }
.cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.team { border-radius: 19px; position: relative; padding: 0; overflow: hidden; display: flex; flex-direction: column; background: color-mix(in srgb, var(--team) 9%, #211d2c); }
.team-banner-cover { position: relative; isolation: isolate; overflow: hidden; padding: 18px 19px 16px; min-height: 142px; }
.team-banner-art { position: absolute; inset: 0; z-index: -2; background-image: var(--team-banner); background-size: cover; background-position: center; filter: var(--team-banner-filter, none); transition: transform .35s; }
.team:hover .team-banner-art { transform: scale(1.06); }
.team-banner-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, #100b1a61, #100b1ad1); }
.team-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
.team h3 { font: 800 23px/1.2 'Baloo 2', var(--font); color: #fff; text-shadow: 0 2px 8px #000b; margin: 0; overflow-wrap: anywhere; }
.team-banner-cover > p { font-size: 11px; color: #f4eeffe6; margin: 5px 0 0; font-weight: 700; overflow-wrap: anywhere; }
.emblem { display: grid; place-items: center; width: 43px; height: 43px; background: #161022c7; color: #fff; border-radius: 14px; transform: rotate(-5deg); box-shadow: 0 4px 10px #0007; }
.team-streak { display: flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; background: #120c1cb8; color: #ffe2b0; font-size: 10px; font-weight: 800; }
.team-card-body { padding: 15px 19px 18px; display: flex; flex-direction: column; flex: 1; gap: 10px; }
.team-people { display: flex; align-items: center; justify-content: space-between; }
.avatars { display: flex; padding-left: 4px; }
.avatars > * { margin-left: -4px; }
.team-track { height: 5px; border-radius: 10px; background: #15111e; overflow: hidden; }
.team-track span { display: block; height: 100%; background: var(--team); }
.team-card-body small { font-size: 10px; color: #bcb2c9; }
.team.caido { filter: grayscale(1); }
@media (max-width: 650px) { .cards { grid-template-columns: 1fr; } }
</style>
