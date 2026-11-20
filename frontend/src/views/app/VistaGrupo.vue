<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconoAplicacion from '@/components/ui/IconoAplicacion.vue'
import PersonajeAventura from '@/components/ui/PersonajeAventura.vue'
import LapidaAventura from '@/components/ui/LapidaAventura.vue'
import LlamaRacha from '@/components/ui/LlamaRacha.vue'
import ChatGrupo from '@/components/group/ChatGrupo.vue'
import HabitosGrupo from '@/components/group/HabitosGrupo.vue'
import ConfiguracionGrupo from '@/components/group/ConfiguracionGrupo.vue'
import { obtenerTemaBannerGrupo } from '@/constants/bannersGrupos'
import { obtenerFondoTema } from '@/constants/fondosTemas'
import { PERSONAJES, usarAlmacenPersonajes } from '@/stores/personajes'
import { usarAlmacenGrupos } from '@/stores/grupos'
import { usarAlmacenSesion } from '@/stores/sesion'
import { servicioGrupos } from '@/services/servicioGrupos'
import { mensajeError } from '@/services/errores'
import { usarGrupoEnTiempoReal } from '@/composables/usarGrupoEnTiempoReal'
const route = useRoute()
const router = useRouter()
const store = usarAlmacenGrupos()
const session = usarAlmacenSesion()
const characters = usarAlmacenPersonajes()
const idGrupo = computed(() => String(route.params.idGrupo))
const group = computed(() => store.grupoPorId(idGrupo.value))
const me = computed(() =>
  group.value?.members.find((m) => m.id === session.usuarioActual?.id),
)
const idPersonajeEnVista = ref('')
const integrantesEnVista = computed(() => {
  const integrantes = group.value?.members ?? []
  const indice = integrantes.findIndex((integrante) => integrante.id === idPersonajeEnVista.value)
  const centro = Math.max(0, indice)

  if (integrantes.length <= 2) return integrantes
  return [-1, 0, 1].map((paso) =>
    integrantes[(centro + paso + integrantes.length) % integrantes.length]!,
  )
})

watch(
  () => [idGrupo.value, me.value?.id],
  () => { idPersonajeEnVista.value = me.value?.id ?? '' },
  { immediate: true },
)

function recorrerPersonajes(paso: number) {
  const integrantes = group.value?.members ?? []
  if (!integrantes.length) return
  const indice = Math.max(0, integrantes.findIndex(
    (integrante) => integrante.id === idPersonajeEnVista.value,
  ))
  idPersonajeEnVista.value = integrantes[
    (indice + paso + integrantes.length) % integrantes.length
  ]!.id
}

const theme = computed(() => obtenerTemaBannerGrupo(group.value?.color))
const todosCaidos = computed(() => !!group.value?.members.length && group.value.members.every((miembro) => miembro.caidoEn))
const configuracionVisible = ref(false)
const showChat = ref(true)
const codigoCopiado = ref(false)
const notice = ref('')
const busy = ref(false)
async function refresh() {
  try {
    await store.recargarGrupo(idGrupo.value)
    notice.value = ''
  } catch (cause) {
    notice.value = mensajeError(cause)
    await store.recargarGrupos()
  }
}
usarGrupoEnTiempoReal(idGrupo, refresh)
watch(
  idGrupo,
  () => {
    configuracionVisible.value = false
    void refresh()
  },
  { immediate: true },
)
async function revive(idMiembro?: string) {
  if (busy.value) return
  busy.value = true
  try {
    await servicioGrupos.reiniciarPersonaje(idGrupo.value, idMiembro)
    await refresh()
  } catch (cause) {
    notice.value = mensajeError(cause)
  } finally {
    busy.value = false
  }
}
async function expulsarCaido(idMiembro: string) {
  if (busy.value || !confirm('¿Expulsar a este integrante?')) return
  busy.value = true
  try {
    await servicioGrupos.quitarIntegrante(idGrupo.value, idMiembro)
    await refresh()
  } catch (cause) {
    notice.value = mensajeError(cause)
  } finally {
    busy.value = false
  }
}
async function copyCode() {
  try {
    await navigator.clipboard.writeText(group.value?.codigoInvitacion ?? '')
    codigoCopiado.value = true
    notice.value = ''
    window.setTimeout(() => { codigoCopiado.value = false }, 1800)
  } catch {
    notice.value = 'No se pudo copiar. Selecciona el código del botón.'
  }
}
async function leave() {
  if (!confirm('¿Salir de este grupo?')) return
  try {
    await servicioGrupos.salirDelGrupo(idGrupo.value)
    await store.recargarGrupos()
    await router.push('/app/perfil')
  } catch (cause) {
    notice.value = mensajeError(cause)
  }
}
</script>
<template>
  <div
    v-if="group"
    class="adventure-page"
    :style="{
      '--group-accent': theme.color,
      '--tema-acento': theme.color,
      '--group-section-banner': `url('${theme.urlBannerSeccion}')`,
      '--group-window-banner': `url('${theme.urlBannerVentana}')`,
    }"
  >
    <section v-if="me?.caidoEn" class="derrota-grupo">
      <div class="escena-derrota">
        <LapidaAventura :size="todosCaidos ? 200 : 160" />
        <strong>{{ me?.name ?? session.usuarioActual?.name }}</strong>
      </div>
      <div class="texto-derrota">
        <h1>{{ todosCaidos ? 'Aventura cerrada' : 'Tu personaje cayó' }}</h1>
        <p>{{ todosCaidos
          ? 'Todo el equipo cayó. Puedes reiniciar la aventura para comenzar de nuevo.'
          : 'Un admin debe revivir tu personaje para que puedas volver a participar.' }}</p>
        <button v-if="(todosCaidos && me?.role === 'ADMIN')" class="boton-juego" :disabled="busy" @click="revive()">
          Reiniciar aventura
        </button>
        <p v-if="notice" role="status">{{ notice }}</p>
      </div>
    </section>
    <div v-else class="adventure-wrap">
      <header
        class="adventure-header"
        :style="{
          '--header-banner': `url('${theme.urlBanner}')`,
          '--header-banner-filter': theme.filter ?? 'none',
          '--header-accent': theme.color,
        }"
      >
        <div class="header-identity">
          <div class="group-brand-row">
            <div
              class="group-header-emblem"
              :style="{ '--emblem-color': theme.color }"
            >
              <IconoAplicacion name="users" :size="24" />
            </div>
            <div class="group-brand-copy">
              <h1>{{ group.name }}</h1>
              <p v-if="group.descripcion" class="descripcion-grupo">{{ group.descripcion }}</p>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="invite-copy"
            :style="{ '--invite-color': theme.color }"
            :aria-label="codigoCopiado ? 'Código copiado' : 'Copiar código de invitación'"
            @click="copyCode"
          >
            <span class="invite-copy-text">
              <span class="invite-label" aria-live="polite">
                {{ codigoCopiado ? 'Código copiado' : 'Copiar código' }}
              </span>
              <strong>{{ group.codigoInvitacion }}</strong>
            </span>
          </button>
          <button class="boton-juego secondary" @click="showChat = !showChat">
            {{ showChat ? 'Ocultar chat' : 'Abrir chat' }}
          </button>
          <button
            v-if="me?.role === 'ADMIN'"
            class="boton-juego secondary"
            @click="configuracionVisible = true"
          >
            Editar grupo
          </button>
          <button class="leave-btn" @click="leave">Salir del grupo</button>
        </div>
      </header>
      <p v-if="notice" role="status">{{ notice }}</p>
      <section
        class="world"
        :style="{
          '--world-bg': `url('${obtenerFondoTema(characters.theme.id)}')`,
          '--sky': characters.theme.sky,
          '--mountain': characters.theme.mountain,
          '--grass': characters.theme.grass,
        }"
      >
        <div class="world-hud">
          <span class="world-streak">
            <LlamaRacha :size="49" />
            <span>
              <strong>{{ group.streak }} días</strong>
              <small>de racha grupal</small>
            </span>
          </span>
        </div>
        <div class="scenery" aria-hidden="true">
          <span class="sun"></span>
          <span class="cloud cloud-one"></span>
          <span class="cloud cloud-two"></span>
          <span class="mountain mountain-one"></span>
          <span class="mountain mountain-two"></span>
          <span class="mountain mountain-three"></span>
          <span class="hill hill-one"></span>
          <span class="hill hill-two"></span>
          <span class="trail"></span>
          <span class="camp-flag"></span>
        </div>
        <div class="recorrido-personajes">
          <button
            v-if="group.members.length > 3"
            class="flecha-personajes"
            aria-label="Ver integrante anterior"
            @click="recorrerPersonajes(-1)"
          >‹</button>
        <div class="simple-players">
          <div
            v-for="member in integrantesEnVista"
            :key="member.id"
            class="simple-player"
            :class="{ propio: member.id === session.usuarioActual?.id }"
          >
            <span class="player-bubble" :class="{ 'con-mensaje': !member.caidoEn && member.mensajeHoy }">
              <span v-if="!member.caidoEn && member.mensajeHoy" class="mensaje-personaje">{{ member.mensajeHoy }}</span>
              <span class="estado-habitos">{{ member.caidoEn ? 'Caído' : member.completadosHoy + '/' + group.habits.length + ' hábitos completados' }}</span>
            </span>
            <LapidaAventura v-if="member.caidoEn" :size="100" />
            <PersonajeAventura
              v-else
              :character="
                PERSONAJES.find((c) => c.id === member.idPersonaje) ??
                PERSONAJES[0]
              "
              :size="132"
              :complete="
                group.habits.length > 0 &&
                member.completadosHoy === group.habits.length
              "
            />
            <span class="player-name">
              {{ member.name }}{{ member.id === session.usuarioActual?.id ? ' · Tú' : '' }}
            </span>
            <div v-if="member.caidoEn && me?.role === 'ADMIN'" class="acciones-caido">
              <button :disabled="busy" @click="revive(member.id)">Revivir</button>
              <button :disabled="busy" @click="expulsarCaido(member.id)">Expulsar</button>
            </div>
            <small v-if="member.diasSinCumplir >= 3">
              {{ member.diasSinCumplir }} días sin cumplir
            </small>
          </div>
        </div>
          <button
            v-if="group.members.length > 3"
            class="flecha-personajes"
            aria-label="Ver siguiente integrante"
            @click="recorrerPersonajes(1)"
          >›</button>
        </div>
        <button
          v-if="group.members.length > 3 && me && idPersonajeEnVista !== me.id"
          class="volver-personaje"
          @click="idPersonajeEnVista = me.id"
        >Volver a mi personaje</button>
      </section>
      <div class="simple-columns" :class="{ 'chat-open': showChat }">
        <div class="simple-stack">
          <HabitosGrupo :key="group.id" :group="group" @changed="refresh" />
        </div>
        <ChatGrupo
          :key="group.id"
          v-if="showChat"
          :group="group"
          @changed="refresh"
        />
      </div>
      <ConfiguracionGrupo
        v-if="configuracionVisible"
        :group="group"
        @close="configuracionVisible = false"
        @changed="refresh"
      />
    </div>
  </div>
  <div v-else class="pagina-juego">
    <p role="status">{{ notice || 'Cargando grupo…' }}</p>
    <RouterLink to="/app/perfil">Volver a mis grupos</RouterLink>
  </div>
</template>
<style scoped src="@/assets/styles/components/VistaGrupo.css"></style>
<style scoped>

.derrota-grupo {
  display: grid;
  min-height: calc(100dvh - 112px);
  max-width: 1250px;
  margin: auto;
  align-content: center;
  overflow: hidden;
  color: #f1f1f4;
  border-radius: 28px;
  background: #232429;
  text-align: center;
}
.derrota-grupo > .back { display: block; text-align: left; }
.escena-derrota {
  display: grid;
  justify-items: center;
  align-content: center;
  min-height: clamp(260px, 48vh, 520px);
  gap: 8px;
  padding: 24px;
  filter: grayscale(1);
  background: linear-gradient(#20212755, #232429), var(--group-section-banner) center / cover;
}
.escena-derrota strong { padding: 8px 16px; border-radius: 10px; background: #26262c; }
.texto-derrota { padding: 8px 24px 40px; }
.texto-derrota h1 { margin: 0; color: #c5c5cc; font: 800 clamp(34px, 6vw, 64px)/1.1 'Baloo 2', var(--font); }
.texto-derrota p { max-width: 48ch; margin: 16px auto 26px; color: #a5a5af; line-height: 1.6; }
.texto-derrota .boton-juego { background: #e4e4ea; color: #212126; padding: 14px 22px; border: none; }
.acciones-caido { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.acciones-caido button { border: none; border-radius: 12px; padding: 8px 12px; background: #fff1dc; color: #332139; }

.adventure-page {
  height: 100%;
  overflow-y: auto;
}
.adventure-wrap {
  display: grid;
  gap: 22px;
}
.recorrido-personajes {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 104px 20px 30px;
  min-height: 410px;
}
.simple-players {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: end;
  justify-content: center;
  gap: clamp(10px, 4vw, 70px);
}
.simple-player {
  display: grid;
  justify-items: center;
  gap: 12px;
  min-width: 0;
  flex: 0 1 190px;
}
.simple-player.propio .player-name {
  background: #fff6e4;
  color: #332139;
  font-weight: 800;
  padding: 8px 18px;
  border: none;
  box-shadow: 0 5px 20px #3e24542b;
}
.flecha-personajes {
  flex-shrink: 0;
  width: 36px;
  height: 48px;
  border: none;
  border-radius: 18px;
  background: #fff5;
  color: #332139;
  font-size: 30px;
}
.flecha-personajes:hover {
  background: #fffa;
}
.volver-personaje {
  position: relative;
  display: block;
  margin: -24px auto 16px;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  background: #fff8;
  color: #332139;
}
@media (max-width: 650px) {
  .recorrido-personajes {
    padding-inline: 8px;
  }
  .simple-player :deep(.adventure-character) {
    font-size: 0.7em;
    zoom: 0.7;
  }
  .simple-player .player-name {
    font-size: 10px;
    padding: 5px;
  }
  .simple-player .player-bubble {
    font-size: 9px;
    white-space: normal;
    text-align: center;
  }
}
.simple-player .player-bubble {
  position: relative;
  display: grid;
  gap: 7px;
  max-width: 220px;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
  padding: 9px 13px;
  margin-bottom: 9px;
  border: none;
  background: #fff7e7;
  color: #3b3040;
  border-radius: 14px;
  box-shadow: 0 5px 15px #39244220;
}
.simple-player .player-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -21px;
  transform: translateX(-50%);
  width: 30px;
  height: 24px;
  background: #fff7e7;
  clip-path: polygon(0 0, 100% 0, 57% 100%);
  filter: drop-shadow(0 2px 2px #39244220);
}
.mensaje-personaje { font-size: 13px; line-height: 1.4; font-weight: 700; }
.estado-habitos { font-size: 10px; opacity: .8; }
.simple-player .player-name {
  position: static;
  transform: none;
}
.simple-player small {
  background: #35253e;
  color: #ffcbcb;
  border-radius: 8px;
  padding: 4px;
}
.simple-columns {
  display: grid;
  gap: 22px;
  align-items: start;
}
.simple-columns.chat-open {
  grid-template-columns: minmax(0, 1fr) 360px;
}


.simple-stack {
  display: grid;
  gap: 22px;
  min-width: 0;
}
.simple-fallen img {
  display: block;
  width: min(320px, 100%);
  margin: auto;
}
.simple-history {
  display: flex;
  gap: 15px;
  margin: 20px 0;
}
.simple-history > div {
  display: grid;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.simple-history meter {
  width: 100%;
}
.simple-history small {
  font-size: 11px;
}
.panel-juego h2 {
  font-size: 18px;
}
.world {
  height: auto;
  min-height: 300px;
}
.simple-fallen {
  text-align: center;
}
@media (max-width: 1100px) {
  .simple-columns.chat-open {
    grid-template-columns: 1fr;
  }
}
</style>

