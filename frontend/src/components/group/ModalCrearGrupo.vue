<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DialogoAplicacion from '@/components/ui/DialogoAplicacion.vue'
import IconoAplicacion, { type IconName } from '@/components/ui/IconoAplicacion.vue'
import IconoPersonaje from '@/components/ui/IconoPersonaje.vue'
import ColoresGrupo from './ColoresGrupo.vue'
import { usarModalCrearGrupo } from '@/composables/usarModalCrearGrupo'
import { servicioGrupos } from '@/services/servicioGrupos'
import { mensajeError } from '@/services/errores'
import { usarAlmacenGrupos } from '@/stores/grupos'
import { usarAlmacenPersonajes } from '@/stores/personajes'
import { URL_BANNER_UNIRSE, obtenerTemaBannerGrupo } from '@/constants/bannersGrupos'

const modal = usarModalCrearGrupo()
const router = useRouter()
const grupos = usarAlmacenGrupos()
const personajes = usarAlmacenPersonajes()
const nombre = ref('')
const descripcion = ref('')
const color = ref('#8b5cf6')
const codigo = ref('')
const nombreHabito = ref('')
const descripcionHabito = ref('')
const insignia = ref<IconName>('target')
const paso = ref(1)
const error = ref('')
const guardando = ref(false)
const insignias: IconName[] = ['target', 'flame', 'globe', 'heart', 'activity', 'moon', 'code', 'monitor', 'shield', 'trophy', 'flag', 'message']
const tema = computed(() => obtenerTemaBannerGrupo(color.value))
const prefijo = computed(() => nombre.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X'))

watch(modal.estaAbierto, () => {
  nombre.value = ''
  descripcion.value = ''
  codigo.value = ''
  nombreHabito.value = ''
  descripcionHabito.value = ''
  insignia.value = 'target'
  paso.value = 1
  error.value = ''
})

async function enviar() {
  if (guardando.value) return
  if (modal.activeTab.value === 'create' && paso.value === 1) {
    paso.value = 2
    return
  }
  guardando.value = true
  error.value = ''
  try {
    const grupo = modal.activeTab.value === 'create'
      ? await servicioGrupos.crearGrupo({
          name: nombre.value,
          descripcion: descripcion.value,
          color: color.value,
          primerHabito: { name: nombreHabito.value, description: descripcionHabito.value, insignia: insignia.value },
        })
      : await servicioGrupos.unirseAlGrupo(codigo.value)
    await grupos.recargarGrupos()
    modal.close()
    await router.push({ name: 'grupo', params: { idGrupo: grupo.id } })
  } catch (causa) {
    error.value = mensajeError(causa)
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <DialogoAplicacion v-if="modal.estaAbierto.value" :title="modal.activeTab.value === 'join' ? 'Unirme a un grupo' : paso === 1 ? 'Crear nuevo grupo' : 'Crea el hábito de tu grupo'" @close="modal.close">
    <div class="creacion-grupo" :style="{ '--acento-modal': tema.color }">
      <div v-if="paso === 1" class="pestanas-grupo">
        <button type="button" :class="{ elegida: modal.activeTab.value === 'create' }" @click="modal.activeTab.value = 'create'"><IconoAplicacion name="plus" :size="14" /> Crear grupo</button>
        <button type="button" :class="{ elegida: modal.activeTab.value === 'join' }" @click="modal.activeTab.value = 'join'"><IconoAplicacion name="link" :size="14" /> Unirme a un grupo</button>
      </div>

      <form @submit.prevent="enviar">
        <template v-if="modal.activeTab.value === 'create' && paso === 1">
          <div class="portada-grupo" :style="{ backgroundImage: 'url(' + tema.urlBanner + ')', filter: tema.filter }">
            <strong>{{ nombre || 'Nombre de tu grupo' }}</strong>
            <IconoPersonaje :character="personajes.current" :size="42" />
          </div>
          <label>Nombre del grupo<input v-model="nombre" required maxlength="80" placeholder="Ej: Madrugadores, Club de Código…" /></label>
          <label>Descripción del grupo (opcional)<textarea v-model="descripcion" maxlength="300" rows="2" /></label>
          <label>Banner y tema del grupo</label>
          <ColoresGrupo v-model="color" />
          <div class="codigo-grupo">
            <small>CÓDIGO DE INVITACIÓN</small>
            <strong>{{ prefijo }}-••••</strong>
            <p>Se completa al crear el grupo. Podrás copiarlo y compartirlo.</p>
          </div>
        </template>

        <template v-else-if="modal.activeTab.value === 'create'">
          <div class="portada-habito" :style="{ backgroundImage: 'linear-gradient(transparent, #171020cc), url(' + URL_BANNER_UNIRSE + ')' }">
            <span class="pasos-grupo"><span>1/2</span><strong>2/2</strong></span>
            <h3>¡Crea el hábito de tu grupo!</h3>
          </div>
          <label>Nombre del hábito<input v-model="nombreHabito" required maxlength="80" placeholder="Ej: Leer 20 minutos" /></label>
          <label>Descripción del hábito (opcional)<textarea v-model="descripcionHabito" maxlength="300" rows="2" /></label>
          <label>Insignia</label>
          <div class="insignias-grupo">
            <button v-for="icono in insignias" :key="icono" type="button" :aria-label="icono" :aria-pressed="insignia === icono" :class="{ elegida: insignia === icono }" @click="insignia = icono"><IconoAplicacion :name="icono" :size="18" /></button>
          </div>
        </template>

        <template v-else>
          <div class="portada-unirse" :style="{ backgroundImage: 'url(' + URL_BANNER_UNIRSE + ')' }" role="img" aria-label="Únete a un grupo y comparte metas con tus amigos"></div>
          <div class="entrada-codigo">
            <label>Escribe el código de invitación que te compartió el creador del grupo<input v-model="codigo" required maxlength="40" placeholder="KORD-FHJ4" autocomplete="off" /></label>
          </div>
        </template>

        <p v-if="error" role="alert">{{ error }}</p>
        <div class="acciones-modal">
          <button type="button" class="boton-juego secondary" :disabled="guardando" @click="paso === 2 ? paso = 1 : modal.close()">{{ paso === 2 ? 'Volver' : 'Cancelar' }}</button>
          <button class="boton-juego" :disabled="guardando">{{ guardando ? 'Guardando…' : modal.activeTab.value === 'join' ? 'Entrar al grupo' : paso === 1 ? 'Continuar →' : 'Crear grupo →' }}</button>
        </div>
      </form>
    </div>
  </DialogoAplicacion>
</template>

<style scoped>
.creacion-grupo { --acento-modal: #a78bda; }
.pestanas-grupo { display: flex; gap: 6px; background: #16111f; padding: 6px; border-radius: 10px; margin: 10px 0 18px; }
.pestanas-grupo button { display: flex; justify-content: center; align-items: center; gap: 8px; flex: 1; border: 0; border-radius: 8px; background: transparent; color: #b9accd; padding: 10px; font-size: 12px; font-weight: 700; }
.pestanas-grupo .elegida { background: #392849; color: #fff; }
.portada-grupo { display: flex; align-items: center; justify-content: space-between; min-height: 112px; background-size: cover; background-position: center; border-radius: 16px; padding: 22px; }
.portada-grupo strong { font: 800 26px/1.1 'Baloo 2', var(--font); text-shadow: 0 2px 8px #0009; overflow-wrap: anywhere; }
.portada-habito { display: flex; flex-direction: column; justify-content: space-between; min-height: 148px; border-radius: 16px; padding: 20px; background-size: cover; background-position: center; }
.portada-habito h3 { margin: 0; font: 800 32px/1.1 'Baloo 2', var(--font); }
.pasos-grupo { display: flex; gap: 8px; font-size: 10px; }
.pasos-grupo > * { border-radius: 50%; background: #2b2539; padding: 8px; }
.pasos-grupo strong { background: var(--acento-modal); color: #15111e; }
.codigo-grupo { display: grid; gap: 8px; padding: 18px; background: #16111f; border-radius: 12px; }
.codigo-grupo small { font-size: 10px; font-weight: 800; color: #bad695; }
.codigo-grupo strong { letter-spacing: 4px; font: 800 24px monospace; }
.codigo-grupo p { margin: 0; font-size: 11px; color: #a89ab9; }
.insignias-grupo { display: flex; flex-wrap: wrap; gap: 8px; }
.insignias-grupo button { display: grid; place-items: center; width: 34px; height: 34px; background: #293b38; color: #d9ecd4; border: 0; border-radius: 9px; }
.insignias-grupo .elegida { background: var(--acento-modal); color: #17201b; }
.portada-unirse { aspect-ratio: 2.3; background-size: cover; background-position: center; border-radius: 18px; }
.entrada-codigo { padding: 12px 22px 24px; text-align: center; }
.entrada-codigo label { font-size: 12px; }
.entrada-codigo input { text-align: center; font: 800 23px monospace; letter-spacing: 4px; margin-top: 16px; text-transform: uppercase; }
.acciones-modal { display: flex; gap: 12px; justify-content: flex-end; margin-top: 10px; }
</style>
