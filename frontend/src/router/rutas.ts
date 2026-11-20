import { createRouter, createWebHistory } from 'vue-router'
import { usarAlmacenSesion } from '@/stores/sesion'
import { recuperarSesion } from '@/services/servicioAcceso'
import VistaBienvenida from '@/views/VistaBienvenida.vue'
import VistaAcceso from '@/views/VistaAcceso.vue'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: VistaBienvenida,
    },
    {
      path: '/login',
      name: 'login',
      component: VistaAcceso,
      meta: { guestOnly: true },
    },
    {
      path: '/groups',
      redirect: '/app/perfil',
    },
    {
      path: '/app',
      component: () => import('@/layouts/MarcoPrincipal.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: { name: 'perfil' },
        },
        {
          path: 'inicio',
          name: 'inicio',
          redirect: { name: 'perfil' },
        },
        {
          path: 'grupo/:idGrupo',
          name: 'grupo',
          component: () => import('@/views/app/VistaGrupo.vue'),
        },
        {
          path: 'perfil',
          name: 'perfil',
          component: () => import('@/views/app/VistaPerfil.vue'),
        },
        {
          path: 'solicitudes',
          redirect: { name: 'perfil' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const session = usarAlmacenSesion()

  // Una sola vez por carga de la app: recupera la sesión desde la cookie
  await recuperarSesion()

  if (to.meta.requiresAuth && !session.estaAutenticado) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && session.estaAutenticado) {
    return { name: 'perfil' }
  }
})
