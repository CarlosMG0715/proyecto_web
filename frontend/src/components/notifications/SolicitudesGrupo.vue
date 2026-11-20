<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import IconoPersonaje from '@/components/ui/IconoPersonaje.vue'
import { PERSONAJES } from '@/stores/personajes'
import { obtenerTemaBannerGrupo } from '@/constants/bannersGrupos'
import { servicioGrupos, type SolicitudIngreso } from '@/services/servicioGrupos'
import { usarAlmacenGrupos } from '@/stores/grupos'
import { mensajeError } from '@/services/errores'

const route = useRoute()
const grupos = usarAlmacenGrupos()
const solicitudes = ref<SolicitudIngreso[]>([])
const cargando = ref(false)
const error = ref('')
const aviso = ref(route.query.enviada ? 'Solicitud enviada. El administrador debe aceptarte.' : '')

async function cargar() {
  cargando.value = true
  error.value = ''
  try { solicitudes.value = await servicioGrupos.listarSolicitudes() }
  catch (causa) { error.value = mensajeError(causa) }
  finally { cargando.value = false }
}

async function responder(solicitud: SolicitudIngreso, aceptar: boolean) {
  try {
    await servicioGrupos.resolverSolicitud(solicitud.id, aceptar)
    aviso.value = aceptar ? `${solicitud.usuario.name} ya puede entrar al grupo.` : 'Solicitud rechazada.'
    if (aceptar) await grupos.recargarGrupos()
    await cargar()
  } catch (causa) { error.value = mensajeError(causa) }
}

onMounted(cargar)
</script>

<template>
  <div class="solicitudes-pagina">
    <header><h1>Solicitudes</h1></header>
    <p v-if="aviso" class="aviso" role="status">{{ aviso }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="cargando">Cargando solicitudes…</p>
    <p v-else-if="!error && !solicitudes.length" class="vacio">No hay solicitudes.</p>
    <section v-else class="lista-solicitudes">
      <article v-for="solicitud in solicitudes" :key="solicitud.id" class="solicitud">
        <div class="banner" :style="{ '--banner': `url('${obtenerTemaBannerGrupo(solicitud.grupo.color).urlBanner}')` }">
          <span>Quiere unirse a</span><h2>{{ solicitud.grupo.name }}</h2>
        </div>
        <div class="persona">
          <IconoPersonaje :character="PERSONAJES.find(p => p.id === solicitud.usuario.idPersonaje) ?? PERSONAJES[0]" :size="58" />
          <div><small>PERFIL</small><strong>{{ solicitud.usuario.name }}</strong><span>{{ new Date(solicitud.creadoEn).toLocaleDateString('es-CO') }}</span></div>
        </div>
        <footer><button class="rechazar" @click="responder(solicitud, false)">Rechazar</button><button class="aceptar" @click="responder(solicitud, true)">Aceptar</button></footer>
      </article>
    </section>
  </div>
</template>

<style scoped>
.solicitudes-pagina { padding:22px; color:#f5efff; }
header p, .persona small { margin:0; font-size:11px; letter-spacing:.12em; color:#bca5d5; font-weight:800; }
header h1 { margin:0 40px 18px 0; font:800 26px 'Baloo 2',var(--font); }
header > span { color:#c5b9d2; }
.lista-solicitudes { display:grid; gap:14px; }
.solicitud { overflow:hidden; border-radius:20px; background:#251e30; box-shadow:0 10px 30px #08050c30; }
.banner { min-height:115px; display:flex; flex-direction:column; justify-content:end; padding:18px; background:linear-gradient(0deg,#120d20cc,#120d2040),var(--banner) center/cover; }
.banner span { font-size:12px; }.banner h2 { margin:0; font:800 24px 'Baloo 2',var(--font); }
.persona { display:flex; align-items:center; gap:14px; padding:18px; }.persona div { display:grid; gap:3px; }.persona strong { font-size:18px; }.persona span { color:#bcaec9; font-size:12px; }
footer { display:flex; justify-content:flex-end; gap:10px; padding:0 18px 18px; }button { border:0; border-radius:12px; padding:10px 16px; cursor:pointer; font-weight:800; }.aceptar { background:#9bd9ad;color:#183425; }.rechazar { background:#423247;color:#f0dcec; }
.aviso,.vacio { padding:16px; border-radius:14px; background:#282032; color:#d8c9e7; }
.error { color:#ff8c9b; }
</style>
