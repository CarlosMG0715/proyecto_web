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
import streakLostBanner from '@/assets/Racha perdida.png'
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
const theme = computed(() => obtenerTemaBannerGrupo(group.value?.color))
const configuracionVisible = ref(false)
const showChat = ref(true)
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
async function revive() {
  if (busy.value) return
  busy.value = true
  try {
    await servicioGrupos.reiniciarPersonaje(idGrupo.value)
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
    notice.value = 'Código copiado'
  } catch {
    notice.value = 'Selecciona y copia el código que aparece en el encabezado.'
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
    <div class="adventure-wrap">
      <header
        class="adventure-header"
        :style="{
          '--header-banner': `url('${theme.urlBanner}')`,
          '--header-banner-filter': theme.filter ?? 'none',
          '--header-accent': theme.color,
        }"
      >
        <div class="header-identity">
          <RouterLink to="/app/perfil" class="back">‹ Mis grupos</RouterLink>
          <div class="group-brand-row">
            <div
              class="group-header-emblem"
              :style="{ '--emblem-color': theme.color }"
            >
              <IconoAplicacion name="users" :size="24" />
            </div>
            <div class="group-brand-copy">
              <h1>{{ group.name }}</h1>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button class="invite-copy" @click="copyCode">
            <span class="invite-copy-text">
              <span class="invite-label">Copiar código</span>
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
            Opciones
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
        <div class="simple-players">
          <div
            v-for="member in group.members"
            :key="member.id"
            class="simple-player"
          >
            <span class="player-bubble">
              {{
                member.caidoEn
                  ? 'Caído'
                  : `${member.completadosHoy}/${group.habits.length} hábitos`
              }}
            </span>
            <LapidaAventura v-if="member.caidoEn" :size="100" />
            <PersonajeAventura
              v-else
              :character="
                PERSONAJES.find((c) => c.id === member.idPersonaje) ??
                PERSONAJES[0]
              "
              :size="88"
              :complete="
                group.habits.length > 0 &&
                member.completadosHoy === group.habits.length
              "
            />
            <span class="player-name">
              {{ member.id === session.usuarioActual?.id ? 'Tú' : member.name }}
            </span>
            <small v-if="member.diasSinCumplir >= 3">
              {{ member.diasSinCumplir }} días sin cumplir
            </small>
          </div>
        </div>
      </section>
      <section v-if="me?.caidoEn" class="simple-fallen panel-juego">
        <img :src="streakLostBanner" alt="Racha perdida" />
        <p>
          Tu personaje cayó por no completar todos los hábitos del grupo. Puedes
          empezar de nuevo, sin vidas ni solicitudes.
        </p>
        <button class="boton-juego" :disabled="busy" @click="revive">
          Reiniciar personaje
        </button>
      </section>
      <div class="simple-columns" :class="{ 'chat-open': showChat }">
        <div class="simple-stack">
          <HabitosGrupo :key="group.id" :group="group" @changed="refresh" />
          <section class="panel-juego">
            <h2>Estadísticas del grupo</h2>
            <p>
              {{
                group.members.filter(
                  (m) =>
                    m.completadosHoy === group!.habits.length &&
                    group!.habits.length > 0,
                ).length
              }}
              de {{ group.members.length }} integrantes completaron todo hoy.
            </p>
            <div class="simple-history">
              <div v-for="day in group.history" :key="day.date">
                <strong>{{ day.percent }}%</strong>
                <meter
                  min="0"
                  max="100"
                  :value="day.percent"
                  :aria-label="day.date"
                />
                <small>{{ day.date.slice(5) }}</small>
              </div>
            </div>
            <p v-if="!group.history.length" class="game-muted">
              Las estadísticas aparecen después del primer cierre diario.
            </p>
            <p class="game-muted">
              A medianoche, si falta algún hábito, el equipo pierde la racha y
              cae el personaje que incumplió. Tres días seguidos sin cumplir
              generan una alerta de deserción.
            </p>
          </section>
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
.adventure-page {
  height: 100%;
  overflow-y: auto;
}
.adventure-wrap {
  display: grid;
  gap: 22px;
}
.simple-players {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: end;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
  padding: 85px 24px 30px;
  min-height: 280px;
}
.simple-player {
  display: grid;
  justify-items: center;
  gap: 10px;
  min-width: 95px;
}
.simple-player .player-bubble,
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
