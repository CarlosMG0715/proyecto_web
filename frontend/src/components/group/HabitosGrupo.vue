<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Grupo, HabitoGrupo } from '@/types/grupo'
import { usarAlmacenSesion } from '@/stores/sesion'
import { PERSONAJES } from '@/stores/personajes'
import { servicioGrupos } from '@/services/servicioGrupos'
import { mensajeError } from '@/services/errores'
import DialogoAplicacion from '@/components/ui/DialogoAplicacion.vue'
import IconoAplicacion, { type IconName } from '@/components/ui/IconoAplicacion.vue'
import IconoPersonaje from '@/components/ui/IconoPersonaje.vue'
import { obtenerTemaBannerGrupo, URL_BANNER_UNIRSE } from '@/constants/bannersGrupos'

const props = defineProps<{ group: Grupo }>()
const emit = defineEmits<{ changed: [] }>()
const sesion = usarAlmacenSesion()
const yo = computed(() => props.group.members.find((miembro) => miembro.id === sesion.usuarioActual?.id))
const personaje = computed(() => PERSONAJES.find((item) => item.id === yo.value?.idPersonaje) ?? PERSONAJES[0]!)
const seleccionados = ref<string[]>([])
const mensaje = ref('')
const error = ref('')
const guardando = ref(false)
const editando = ref(false)
const idHabito = ref<string>()
const nombre = ref('')
const descripcion = ref('')
const insignia = ref<IconName>('target')
const insignias: IconName[] = ['target', 'flame', 'globe', 'heart', 'activity', 'moon', 'code', 'monitor', 'shield', 'trophy', 'flag', 'message']
const completados = computed(() => props.group.habits.filter((habito) => habito.completadoPor.includes(sesion.usuarioActual?.id ?? '')).length)
const pendientes = computed(() => seleccionados.value.filter((id) => {
  const habito = props.group.habits.find((item) => item.id === id)
  return habito && !habito.completadoPor.includes(sesion.usuarioActual?.id ?? '')
}))
watch(() => props.group, (grupo) => {
  seleccionados.value = grupo.habits.filter((habito) => habito.completadoPor.includes(sesion.usuarioActual?.id ?? '')).map((habito) => habito.id)
}, { immediate: true })

function editar(habito?: HabitoGrupo) {
  idHabito.value = habito?.id
  nombre.value = habito?.name ?? ''
  descripcion.value = habito?.description ?? ''
  insignia.value = (habito?.insignia as IconName) ?? 'target'
  error.value = ''
  editando.value = true
}
async function ejecutar(accion: () => Promise<void>) {
  if (guardando.value) return
  guardando.value = true
  error.value = ''
  try {
    await accion()
    editando.value = false
    emit('changed')
  } catch (causa) {
    error.value = mensajeError(causa)
  } finally {
    guardando.value = false
  }
}
function guardar() {
  return ejecutar(() => servicioGrupos.guardarHabito(props.group.id, {
    name: nombre.value, description: descripcion.value, insignia: insignia.value,
  }, idHabito.value))
}
async function registrar() {
  await ejecutar(async () => {
    await servicioGrupos.registrarCheckGrupal(props.group.id, pendientes.value, mensaje.value)
    mensaje.value = ''
  })
}
function quitar(habito: HabitoGrupo) {
  if (confirm('¿Quitar ' + habito.name + '?')) void ejecutar(() => servicioGrupos.eliminarHabito(props.group.id, habito.id))
}
</script>

<template>
  <section class="check-equipo">
    <div class="mis-habitos">
      <div class="identidad-check">
        <IconoPersonaje :character="personaje" :size="64" />
        <div><h3>{{ yo?.name }}</h3><small>Tu aporte de hoy</small></div>
      </div>
      <h4>Hábitos de hoy</h4>
      <label v-for="habito in group.habits" :key="habito.id" class="habito-check">
        <input v-model="seleccionados" type="checkbox" :value="habito.id" :disabled="guardando || !!yo?.caidoEn || habito.completadoPor.includes(sesion.usuarioActual?.id ?? '')" />
        <span>{{ habito.name }}</span>
        <IconoAplicacion v-if="habito.completadoPor.includes(sesion.usuarioActual?.id ?? '')" name="check" :size="16" />
      </label>
      <p v-if="!group.habits.length">El admin puede crear el primer hábito.</p>
    </div>
    <form class="registro-check" @submit.prevent="registrar">
      <header :style="{ backgroundImage: 'linear-gradient(#19132155, #19132199), url(' + obtenerTemaBannerGrupo(group.color).urlBannerVentana + ')' }">
        <span class="insignia-check"><IconoAplicacion name="flag" :size="27" /></span>
        <div><h2>Registra tus hábitos</h2><small>{{ completados }}/{{ group.habits.length }} hábitos completados</small></div>
      </header>
      <progress :value="completados" :max="group.habits.length || 1"></progress>
      <label>Mensaje para el equipo (opcional)<input v-model="mensaje" maxlength="300" placeholder="Cuéntales qué hiciste hoy…" /></label>
      <button class="enviar-check" :disabled="guardando || !pendientes.length || !!yo?.caidoEn"><IconoAplicacion name="check" :size="25" /> {{ guardando ? 'Guardando…' : completados === group.habits.length && group.habits.length ? '¡Todo completo por hoy!' : 'Check grupal' }} <IconoAplicacion name="arrow-right" :size="23" /></button>
    </form>
  </section>

  <section class="lista-habitos">
    <header :style="{ backgroundImage: 'linear-gradient(#19132133, #19132166), url(' + obtenerTemaBannerGrupo(group.color).urlBannerVentana + ')' }">
      <span class="insignia-check"><IconoAplicacion name="flag" :size="24" /></span><h2>Hábitos del grupo</h2>
      <button v-if="yo?.role === 'ADMIN'" class="crear-habito" @click="editar()"><IconoAplicacion name="plus" :size="19" /> Crear hábito</button>
    </header>
    <p v-if="error" class="error-habito" role="alert">{{ error }}</p>
    <div class="lista-contenido">
      <article v-for="habito in group.habits" :key="habito.id">
        <span class="insignia-check"><IconoAplicacion :name="(habito.insignia as IconName) || 'target'" :size="25" /></span>
        <div class="datos-habito">
          <strong>{{ habito.name }}</strong>
          <p>{{ habito.description || 'Hábito del equipo' }}</p>
          <small>{{ habito.completadoPor.length }}/{{ group.members.length }} aportaron hoy</small>
          <p v-for="aporte in habito.mensajesHoy" :key="aporte.idUsuario" class="mensaje-aporte"><strong>{{ group.members.find((miembro) => miembro.id === aporte.idUsuario)?.name }}:</strong> {{ aporte.mensaje }}</p>
        </div>
        <div v-if="yo?.role === 'ADMIN'" class="acciones-habito">
          <button :disabled="guardando" @click="editar(habito)">Editar</button>
          <button :disabled="guardando" @click="quitar(habito)">Quitar</button>
        </div>
      </article>
    </div>
  </section>

  <DialogoAplicacion v-if="editando" :title="idHabito ? 'Editar hábito' : 'Crear hábito'" @close="editando = false">
    <div class="portada-nuevo-habito" :style="{ backgroundImage: 'linear-gradient(transparent, #191321bb), url(' + URL_BANNER_UNIRSE + ')' }"><h3>¡Un hábito para tu equipo!</h3></div>
    <form @submit.prevent="guardar">
      <label>Nombre del hábito<input v-model="nombre" required maxlength="80" placeholder="Ej: Leer 20 minutos" /></label>
      <label>Descripción (opcional)<textarea v-model="descripcion" maxlength="300" rows="2" /></label>
      <label>Insignia</label>
      <div class="elegir-insignia"><button v-for="icono in insignias" :key="icono" type="button" :class="{ elegida: insignia === icono }" :aria-pressed="insignia === icono" :aria-label="icono" @click="insignia = icono"><IconoAplicacion :name="icono" :size="20" /></button></div>
      <p v-if="error" role="alert">{{ error }}</p>
      <button class="boton-juego" :disabled="guardando">Guardar hábito</button>
    </form>
  </DialogoAplicacion>
</template>

<style scoped>
.check-equipo, .lista-habitos { --acento: color-mix(in srgb, var(--group-accent) 60%, #dcebd7); background: var(--group-surface); border-radius: 24px; overflow: hidden; }
.check-equipo { display: grid; grid-template-columns: 1fr 1.15fr; gap: 22px; padding: 24px; }
.mis-habitos { display: flex; flex-direction: column; gap: 12px; }
.identidad-check { display: flex; align-items: center; gap: 16px; margin: 10px 0 35px; }
.identidad-check h3 { font: 800 24px 'Baloo 2', var(--font); margin: 0 0 5px; }
.identidad-check small { color: var(--group-soft); font-size: 11px; }
.mis-habitos h4 { font-size: 14px; margin: auto 0 0; }
.habito-check { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; background: #ffffff04; font-size: 14px; }
.habito-check input { accent-color: var(--group-accent); width: 19px; height: 19px; }
.registro-check { display: grid; gap: 15px; padding: 20px; border-radius: 24px; background: color-mix(in srgb, var(--group-accent) 5%, #24212c); }
.registro-check header, .lista-habitos > header { display: flex; align-items: center; gap: 15px; padding: 18px; border-radius: 20px; background-size: cover; background-position: center; }
.registro-check h2 { font: 800 29px/1.1 'Baloo 2', var(--font); margin: 0 0 5px; }
.registro-check small { font-size: 11px; }
.insignia-check { display: grid; place-items: center; flex-shrink: 0; width: 50px; height: 50px; border-radius: 16px; background: var(--acento); color: #182c28; }
.registro-check progress { width: 100%; height: 10px; accent-color: var(--acento); border: 0; border-radius: 10px; overflow: hidden; }
.registro-check progress::-webkit-progress-bar { background: #130f1b; }
.registro-check progress::-webkit-progress-value { background: var(--acento); }
.registro-check label { display: grid; gap: 8px; font-size: 13px; font-weight: 700; }
.registro-check input { background: #171621; border: 0; border-radius: 12px; padding: 13px; width: 100%; }
.enviar-check { display: flex; align-items: center; justify-content: center; gap: 15px; background: linear-gradient(110deg, var(--acento), color-mix(in srgb, var(--acento) 75%, var(--group-accent))); border: 0; border-radius: 22px; padding: 22px 14px; font: 800 25px 'Baloo 2', var(--font); color: #222330; }
.enviar-check:disabled { opacity: .6; cursor: default; }
.lista-habitos > header { border-radius: 0; padding: 20px; }
.lista-habitos h2 { font: 800 24px 'Baloo 2', var(--font); margin: 0; flex: 1; }
.crear-habito { display: flex; align-items: center; gap: 9px; border: 0; border-radius: 16px; background: var(--acento); color: #162b26; font-weight: 800; padding: 13px; }
.lista-contenido { display: grid; gap: 14px; padding: 22px; }
.lista-contenido article { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; padding: 20px; border-radius: 22px; background: #ffffff04; }
.datos-habito { flex: 1; min-width: 120px; overflow-wrap: anywhere; }
.datos-habito > strong { font-weight: 800; }
.datos-habito p { margin: 6px 0; font-size: 13px; }
.datos-habito small { font-size: 11px; color: var(--group-soft); }
.mensaje-aporte { background: #0002; border-radius: 10px; padding: 9px 12px; }
.acciones-habito { display: flex; gap: 8px; }
.acciones-habito button { border: 0; border-radius: 10px; padding: 10px; color: #efe7f3; background: color-mix(in srgb, var(--group-accent) 20%, #282331); }
.acciones-habito button:last-child { background: #4c293b; }
.portada-nuevo-habito { min-height: 140px; padding: 20px; display: flex; align-items: end; background-size: cover; background-position: center; border-radius: 18px; }
.portada-nuevo-habito h3 { font: 800 28px 'Baloo 2', var(--font); margin: 0; }
.elegir-insignia { display: flex; flex-wrap: wrap; gap: 8px; }
.elegir-insignia button { display: grid; place-items: center; border: 0; border-radius: 8px; padding: 9px; background: #2a403b; color: #e9eee5; }
.elegir-insignia .elegida { background: #a6d787; color: #192b21; }
.error-habito { padding: 0 22px; color: #ffb6c4; }
@media (max-width: 850px) { .check-equipo { grid-template-columns: 1fr; } .identidad-check { margin-bottom: 10px; } }
</style>
