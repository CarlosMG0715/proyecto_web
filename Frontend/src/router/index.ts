import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { bootstrap } from '@/services/authService'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'

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
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/groups',
      redirect: '/app/inicio',
    },
    {
      path: '/app',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: { name: 'inicio' },
        },
        {
          path: 'inicio',
          name: 'inicio',
          component: () => import('@/views/app/InicioView.vue'),
        },
        {
          path: 'grupo/:groupId',
          name: 'grupo',
          component: () => import('@/views/app/GrupoView.vue'),
        },
        {
          path: 'calendario',
          name: 'calendario',
          component: () => import('@/views/app/CalendarioView.vue'),
        },
        {
          path: 'perfil',
          name: 'perfil',
          component: () => import('@/views/app/PerfilView.vue'),
        },
        {
          path: 'configuracion',
          name: 'configuracion',
          component: () => import('@/views/app/ConfiguracionView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const session = useSessionStore()

  // Una sola vez por carga de la app: recupera la sesión desde la cookie
  await bootstrap()

  if (to.meta.requiresAuth && !session.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && session.isAuthenticated) {
    return { name: 'inicio' }
  }
})