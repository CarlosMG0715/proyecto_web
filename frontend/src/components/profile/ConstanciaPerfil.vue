<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api } from '@/services/clienteHttp'
import { usarAlmacenPersonajes } from '@/stores/personajes'
import { usarAlmacenGrupos } from '@/stores/grupos'
import { obtenerFondoTema } from '@/constants/fondosTemas'
import { mensajeError } from '@/services/errores'
import IconoAplicacion from '@/components/ui/IconoAplicacion.vue'

interface Constancia {
  resumenSemanal: { fecha: string; porcentaje: number }[]
  constanciaTreintaDias: number
  promedioSemanal: number
}
const personajes = usarAlmacenPersonajes()
const grupos = usarAlmacenGrupos()
const datos = ref<Constancia>()
const error = ref('')
const cargando = ref(false)
const estilo = computed(() => ({
  '--acento-constancia': personajes.theme.color,
  '--fondo-constancia': 'url(' + obtenerFondoTema(personajes.theme.id) + ')',
}))
let solicitud = 0
async function cargar() {
  const actual = ++solicitud
  cargando.value = true
  try {
    const respuesta = await api.get<Constancia>('/profile/constancia')
    if (actual === solicitud) {
      datos.value = respuesta.data
      error.value = ''
    }
  } catch (causa) {
    if (actual === solicitud) error.value = mensajeError(causa)
  } finally {
    if (actual === solicitud) cargando.value = false
  }
}
watch(() => grupos.groups, cargar, { deep: true, immediate: true })
function dia(fecha: string, ultimo: boolean) {
  return ultimo ? 'Hoy' : new Date(fecha + 'T12:00:00Z').toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'UTC' })
}
</script>

<template>
  <section class="constancia-perfil" :style="estilo" :aria-busy="cargando" aria-label="Tu compromiso">
    <header><h2>Tu compromiso</h2><IconoAplicacion name="activity" :size="22" /></header>
    <template v-if="datos">
      <div class="promedio"><strong>{{ datos.promedioSemanal }}<span>%</span></strong><p>cumplimiento promedio<br />en los últimos 7 días</p></div>
      <div class="grafico-constancia">
        <div v-for="(registro, indice) in datos.resumenSemanal" :key="registro.fecha" :class="{ hoy: indice === 6 }" :aria-label="registro.fecha + ': ' + registro.porcentaje + '%'">
          <div class="barra-constancia"><span :style="{ height: Math.max(3, registro.porcentaje) + '%' }" :title="registro.porcentaje + '%'"></span></div>
          <small>{{ dia(registro.fecha, indice === 6) }}</small>
        </div>
      </div>
      <footer><span>Tu constancia · últimos 30 días</span><strong>{{ datos.constanciaTreintaDias }}%</strong></footer>
    </template>
    <p v-else-if="!error">Cargando tu compromiso…</p>
    <p v-if="error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></p>
  </section>
</template>

<style scoped>
.constancia-perfil { position: relative; isolation: isolate; overflow: hidden; border-radius: 20px; padding: 24px 22px 0; min-height: 310px; color: #edf0fa; background: #26263b; display: flex; flex-direction: column; }
.constancia-perfil::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(135deg, #202134e8, #203339bb), var(--fondo-constancia) center / cover; }
.constancia-perfil header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.constancia-perfil h2 { font: 800 16px 'Baloo 2', var(--font); margin: 0; }
.constancia-perfil header svg { color: #b4adcb; }
.promedio { display: flex; align-items: center; gap: 16px; margin-top: 10px; }
.promedio > strong { font: 800 48px 'Baloo 2', var(--font); line-height: 1.2; }
.promedio strong span { font-size: 24px; color: var(--acento-constancia); }
.promedio p { font-size: 11px; line-height: 1.7; color: #b9c5dc; }
.grafico-constancia { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin: 20px 0; margin-top: auto; padding-top: 20px; }
.grafico-constancia > div { text-align: center; min-width: 0; }
.barra-constancia { display: flex; align-items: end; height: 75px; }
.barra-constancia span { display: block; width: 100%; background: color-mix(in srgb, var(--acento-constancia) 45%, #34454e); border-radius: 7px 7px 0 0; }
.hoy .barra-constancia span { background: var(--acento-constancia); }
.grafico-constancia small { display: block; margin-top: 9px; font-size: 10px; color: #b8cae0; }
.constancia-perfil footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #ffffff0a; margin: 0 -22px; padding: 18px 22px; }
.constancia-perfil footer span { font-size: 10px; color: #b8cae0; }
.constancia-perfil footer strong { font: 800 20px 'Baloo 2', var(--font); }
</style>
