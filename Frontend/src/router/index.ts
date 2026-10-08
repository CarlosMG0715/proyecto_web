import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { api } from '@/services/api'
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
      name: 'groups',
      component: () => import('@/views/GroupsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Navigation Guard Asíncrono para protección de rutas y auto-recuperación de sesión
router.beforeEach(async (to) => {
  const session = useSessionStore()

  // 1. Si no hay token en memoria pero la ruta requiere autenticación,
  // intentamos recuperar la sesión en segundo plano mediante la Cookie segura HttpOnly
  if (to.meta.requiresAuth && !session.accessToken) {
    try {
      const { data } = await api.post<{ accessToken: string }>('/auth/refresh')
      session.setAccessToken(data.accessToken)
      return true
    } catch {
      // Si la cookie expiró o fue revocada, enviamos al login
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  // 2. Si ya está autenticado e intenta ir a Login, enviamos a Grupos
  if (to.meta.guestOnly && session.accessToken) {
    return { name: 'groups' }
  }
})
