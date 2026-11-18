<script setup lang="ts">
/**
 * Menú lateral: marca, navegación principal, lista de grupos con sus banners temáticos,
 * botón "Crear grupo" y la tarjeta de tu cuenta con el botón de cerrar sesión.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconoAplicacion, { type IconName } from '@/components/ui/IconoAplicacion.vue'
import IconoPersonaje from '@/components/ui/IconoPersonaje.vue'
import { usarAlmacenPersonajes } from '@/stores/personajes'
import { usarModalCrearGrupo } from '@/composables/usarModalCrearGrupo'
import { obtenerTemaBannerGrupo } from '@/constants/bannersGrupos'
import { logout } from '@/services/servicioAcceso'
import { usarAlmacenGrupos } from '@/stores/grupos'
import { usarAlmacenSesion } from '@/stores/sesion'
import kordiaLogo from '@/assets/logo-kordia.png'

interface NavItem {
  name: string
  label: string
  icon: IconName
}

const NAV_ITEMS: NavItem[] = [{ name: 'perfil', label: 'Perfil', icon: 'user' }]

const route = useRoute()
const router = useRouter()
const session = usarAlmacenSesion()
const characters = usarAlmacenPersonajes()
const groupsStore = usarAlmacenGrupos()
const createModal = usarModalCrearGrupo()

const userName = computed(() => session.usuarioActual?.name ?? 'Usuario')
const userEmail = computed(() => session.usuarioActual?.email ?? '')
const activeGroupId = computed(() =>
  route.name === 'grupo' ? String(route.params.idGrupo) : null,
)

function myPending(idGrupo: string): boolean {
  const group = groupsStore.grupoPorId(idGrupo)
  return Boolean(
    group?.members.some(
      (m) =>
        m.id === session.usuarioActual?.id &&
        m.completadosHoy < group.habits.length,
    ),
  )
}

function estilosBanner(color?: string): Record<string, string> {
  const theme = obtenerTemaBannerGrupo(color)
  return {
    '--group-banner': `url("${theme.urlBanner}")`,
    '--group-banner-filter': theme.filter ?? 'none',
    '--group-accent': theme.color,
  }
}

async function handleLogout(): Promise<void> {
  await logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <aside class="sidebar">
    <RouterLink :to="{ name: 'perfil' }" class="brand">
      <img :src="kordiaLogo" alt="Kordia Logo" class="brand-logo-img" />
      <span class="brand-text">
        <strong>Kordia</strong>
        <small>Hábitos en equipo</small>
      </span>
    </RouterLink>

    <nav class="nav">
      <span class="section-label">Menú</span>
      <template v-for="item in NAV_ITEMS" :key="item.name">
        <RouterLink
          :to="{ name: item.name }"
          class="nav-link"
          :class="{ active: route.name === item.name }"
        >
          <IconoAplicacion :name="item.icon" :size="17" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <div class="groups">
      <div class="section-row">
        <span class="section-label">Tus grupos</span>
        <span class="count">{{ groupsStore.groups.length }}</span>
      </div>

      <div class="group-list">
        <RouterLink
          v-for="group in groupsStore.groups"
          :key="group.id"
          :to="{ name: 'grupo', params: { idGrupo: group.id } }"
          class="group-link"
          :class="{ active: activeGroupId === group.id, caido: group.members.length > 0 && group.members.every((miembro) => miembro.caidoEn) }"
          :style="estilosBanner(group.color)"
        >
          <div class="group-banner-card">
            <span class="group-banner-art" aria-hidden="true"></span>
            <span class="group-banner-shade" aria-hidden="true"></span>
            <span class="group-info">
              <span class="group-name">{{ group.name }}</span>
              <span class="group-meta">
                <IconoAplicacion name="users" :size="11" />
                {{
                  `${group.members.length} ${group.members.length === 1 ? 'miembro' : 'miembros'}`
                }}
              </span>
            </span>
          </div>

          <span class="group-side-stat">
            <span
              v-if="myPending(group.id)"
              class="pending-dot"
              title="Tienes hábitos pendientes"
            ></span>
            <span class="group-streak">
              <IconoAplicacion name="flame" :size="13" />
              {{ group.streak }}
            </span>
          </span>
        </RouterLink>
      </div>

      <button type="button" class="create-btn" @click="createModal.open">
        <IconoAplicacion name="plus" :size="16" :stroke-width="2.5" />
        Crear grupo
      </button>
      <button type="button" class="join-btn" @click="createModal.openJoin">
        <IconoAplicacion name="link" :size="15" :stroke-width="2.3" />
        Unirme a un grupo
      </button>
    </div>

    <div class="account">
      <RouterLink :to="{ name: 'perfil' }" class="account-link">
        <IconoPersonaje :character="characters.current" :size="34" />
        <span class="account-info">
          <span class="account-name">{{ userName }}</span>
          <span class="account-email">{{ userEmail }}</span>
        </span>
      </RouterLink>
      <button
        type="button"
        class="logout-btn"
        title="Cerrar sesión"
        @click="handleLogout"
      >
        <IconoAplicacion name="logout" :size="17" />
      </button>
    </div>
  </aside>
</template>

<style scoped src="@/assets/styles/components/BarraLateral.css"></style>

<style scoped>
.group-link.caido { filter: grayscale(1); }
</style>
