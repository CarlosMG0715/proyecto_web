import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { usarAlmacenSesion } from './sesion'
import { api } from '@/services/clienteHttp'
import { mensajeError } from '@/services/errores'

export const PERSONAJES = [
  {
    id: 'sprout',
    name: 'Brote',
    color: '#a88ad9',
    dark: '#49365e',
    body: '#d9b36a',
    x: 0,
    y: 0,
  },
  {
    id: 'fox',
    name: 'Chispa',
    color: '#eaa057',
    dark: '#68402d',
    body: '#f1a15c',
    x: 50,
    y: 0,
  },
  {
    id: 'music',
    name: 'Lima',
    color: '#a9bf66',
    dark: '#3d5236',
    body: '#c4d77c',
    x: 100,
    y: 0,
  },
  {
    id: 'pilot',
    name: 'Aviador',
    color: '#e28e9d',
    dark: '#603849',
    body: '#a6a1d5',
    x: 0,
    y: 100,
  },
  {
    id: 'royal',
    name: 'Violeta',
    color: '#b28ce8',
    dark: '#493163',
    body: '#bd9bea',
    x: 50,
    y: 100,
  },
  {
    id: 'cap',
    name: 'Explorador',
    color: '#7ec6ae',
    dark: '#2c544a',
    body: '#efb66a',
    x: 100,
    y: 100,
  },
] as const

export type Personaje = (typeof PERSONAJES)[number]

export const TEMAS_PERSONAJE = [
  {
    id: 'sprout',
    name: 'Lavanda',
    color: '#b9a2f1',
    dark: '#393654',
    sky: '#d9d2f2',
    mountain: '#aaa5ce',
    grass: '#a0b38d',
  },
  {
    id: 'fox',
    name: 'Atardecer',
    color: '#f39b50',
    dark: '#63402e',
    sky: '#f3d5b6',
    mountain: '#c78a69',
    grass: '#b0a66e',
  },
  {
    id: 'music',
    name: 'Bosque',
    color: '#9fbd62',
    dark: '#3c5134',
    sky: '#c4ddb9',
    mountain: '#85a77b',
    grass: '#86a65f',
  },
  {
    id: 'pilot',
    name: 'Glaciar',
    color: '#77c4df',
    dark: '#304e68',
    sky: '#c6e9f4',
    mountain: '#8bbdcc',
    grass: '#a3c9bf',
  },
  {
    id: 'royal',
    name: 'Anochecer',
    color: '#8d5bc4',
    dark: '#281b3d',
    sky: '#65517e',
    mountain: '#635276',
    grass: '#596b64',
  },
  {
    id: 'cap',
    name: 'Laguna',
    color: '#65c7ac',
    dark: '#2c544a',
    sky: '#b5e3d4',
    mountain: '#82afa0',
    grass: '#82b596',
  },
  {
    id: 'red',
    name: 'Volcán',
    color: '#f07167',
    dark: '#612f3b',
    sky: '#f4c5b8',
    mountain: '#bd7771',
    grass: '#a69872',
  },
  {
    id: 'pink',
    name: 'Fresa',
    color: '#f17eae',
    dark: '#63344f',
    sky: '#f8d0e2',
    mountain: '#c984a4',
    grass: '#a8ad7e',
  },
] as const

// PostgreSQL es la fuente de verdad; no se mantienen copias de perfiles en localStorage.
export const usarAlmacenPersonajes = defineStore('characters', () => {
  const session = usarAlmacenSesion()
  const error = ref('')
  const estaGuardando = ref(false)
  const seGuardo = ref(false)
  const current = computed(
    () =>
      PERSONAJES.find((c) => c.id === session.usuarioActual?.idPersonaje) ??
      PERSONAJES[0],
  )
  const theme = computed(
    () =>
      TEMAS_PERSONAJE.find((t) => t.id === session.usuarioActual?.idTema) ??
      TEMAS_PERSONAJE[0],
  )
  async function save(patch: { idPersonaje?: string; idTema?: string }) {
    if (estaGuardando.value || !session.usuarioActual) return
    const idUsuario = session.usuarioActual.id
    estaGuardando.value = true
    error.value = ''
    seGuardo.value = false
    try {
      const { data } = await api.patch<{
        idPersonaje: string
        idTema: string
      }>('/profile/preferences', patch)
      if (session.usuarioActual?.id === idUsuario) {
        session.guardarUsuario({ ...session.usuarioActual, ...data })
        seGuardo.value = true
      }
    } catch (cause) {
      error.value = mensajeError(cause)
    } finally {
      estaGuardando.value = false
    }
  }
  const select = (idPersonaje: string) => save({ idPersonaje })
  const selectTheme = (idTema: string) => save({ idTema })
  watch(
    () => session.usuarioActual?.id,
    () => {
      error.value = ''
      seGuardo.value = false
    },
  )
  return {
    current,
    theme,
    select,
    selectTheme,
    error,
    estaGuardando,
    seGuardo,
  }
})
