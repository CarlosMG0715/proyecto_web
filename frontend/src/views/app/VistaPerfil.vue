<script setup lang="ts">
import { computed, ref } from 'vue'
import IconoAplicacion from '@/components/ui/IconoAplicacion.vue'
import IconoPersonaje from '@/components/ui/IconoPersonaje.vue'
import PersonajeAventura from '@/components/ui/PersonajeAventura.vue'
import ConfiguracionCuenta from '@/components/profile/ConfiguracionCuenta.vue'
import TarjetasGrupo from '@/components/group/TarjetasGrupo.vue'
import {
  PERSONAJES,
  TEMAS_PERSONAJE,
  usarAlmacenPersonajes,
} from '@/stores/personajes'
import { obtenerFondoTema } from '@/constants/fondosTemas'
import { usarAlmacenGrupos } from '@/stores/grupos'
import { usarAlmacenSesion } from '@/stores/sesion'

const store = usarAlmacenGrupos()

const session = usarAlmacenSesion()

const characters = usarAlmacenPersonajes()

const configuracionVisible = ref(false)

const apodo = computed(() => session.usuarioActual?.name ?? '')

const fecha = new Date().toLocaleDateString('es-CO',{
  weekday:'long',
  day: 'numeric',
  month: 'long',
})

const email = computed(() => session.usuarioActual?.email ?? '')
</script>
<template>
  <div
    class="pagina-juego profile-page"
    :style="{
      '--profile-color': characters.theme.color,
      '--profile-shade': characters.theme.dark,
    }"
  >



    <div class="contenido-juego">
      <header class="banner-bienvenida"
        :style="{
           '--banner-imagen': `url('${obtenerFondoTema(characters.theme.id)}')`,

        }"
        >


        <span class="adornos-tema" aria-hidden="true"></span>
        <div>
          <h1> Hola, <span class="nombre-tema">{{ apodo }}.</span></h1>
        </div>
       
        <span class="fecha-banner">
          <iconoAplicacion name="calendar" :size="16"/>
          {{ fecha }}

        </span>
      </header>

      <section
        class="identity panel-juego"
        :style="{
          '--profile-cover': characters.theme.dark,
          '--profile-accent': characters.theme.color,
          '--theme-bg': `url('${obtenerFondoTema(characters.theme.id)}')`,
        }"
      >
        <div class="identity-art">
          <div class="avatar-stage">
            <span class="orbit one"></span>
            <span class="orbit two"></span>
            <div class="avatar-ring">
              <IconoPersonaje :character="characters.current" :size="124" />
            </div>
          </div>
        </div>


 
 

        <div class="identity-info">
          <h2>{{ apodo }}</h2>
          <p>{{ email }}</p>
          <span class="member-label">
            <IconoAplicacion name="users" :size="14" />
            {{ store.groups.length }}
            {{ store.groups.length === 1 ? 'equipo' : 'equipos' }}
          </span>
        </div>
      </section>

      <section
        id="personalizar"
        class="panel-juego personalization"
        :aria-busy="characters.estaGuardando"
        :style="{
          '--profile-cover': characters.theme.dark,
          '--profile-accent': characters.theme.color,
          '--theme-bg': `url('${obtenerFondoTema(characters.theme.id)}')`,
        }"
      >


        <div class="titulo-seccion">
          <h2>Personalizar</h2>
        </div>

        <div class="personalization-grid">
          <div class="character-preview">
            <span class="preview-caption">
              Así se verá tu avatar en los grupos
            </span>
            <PersonajeAventura :character="characters.current" :size="140" />
            <strong>{{ apodo }}</strong>
          </div>

          <div class="character-picker">
            <h3>Avatar</h3>
            <div class="character-options">
              <button
                v-for="c in PERSONAJES"
                :key="c.id"
                class="character-option"
                :class="{ chosen: characters.current.id === c.id }"
                :style="{ '--option-color': c.color }"
                :aria-label="`Elegir ${c.name}`"
                :aria-pressed="characters.current.id === c.id"
                :disabled="characters.estaGuardando"
                @click="characters.select(c.id)"
              >
                <div class="option-icon-wrap">
                  <IconoPersonaje :character="c" :size="62" />
                </div>
                <strong>{{ c.name }}</strong>
                <span v-if="characters.current.id === c.id">
                  <IconoAplicacion name="check" :size="12" />
                  Elegido
                </span>
                <span v-else>Elegir</span>
              </button>
            </div>
          </div>



          <div class="theme-picker">
            <h3>
              Tema
              <span class="active-theme-name">{{ characters.theme.name }}</span>
            </h3>
            <div class="theme-options">
              <button
                v-for="t in TEMAS_PERSONAJE"
                :key="t.id"
                :style="{
                  '--swatch': t.color,
                  '--swatch-dark': t.dark,
                  '--swatch-bg': `url('${obtenerFondoTema(t.id)}')`,
                }"
                :class="{ chosen: characters.theme.id === t.id }"
                :aria-label="`Tema ${t.name}`"
                :aria-pressed="characters.theme.id === t.id"
                :disabled="characters.estaGuardando"
                @click="characters.selectTheme(t.id)"
              >
                <span class="theme-swatch">
                  <IconoAplicacion
                    v-if="characters.theme.id === t.id"
                    name="check"
                    :size="18"
                  />
                </span>
                <strong>{{ t.name }}</strong>
              </button>
            </div>
          </div>
        </div>

        <p v-if="characters.estaGuardando" class="game-muted" role="status">
          Guardando en tu cuenta…
        </p>
        <p v-else-if="characters.error" role="status" class="game-muted">
          {{ characters.error }}
        </p>
        <p v-else-if="characters.seGuardo" class="character-saved" role="status">
          <IconoAplicacion name="check" :size="13" />
          Guardado en tu cuenta
        </p>
      </section>

      <TarjetasGrupo />
      <ConfiguracionCuenta v-if="configuracionVisible" @close="configuracionVisible = false" />
    </div>
  </div>
</template>
<style scoped src="@/assets/styles/components/VistaPerfil.css"></style>
