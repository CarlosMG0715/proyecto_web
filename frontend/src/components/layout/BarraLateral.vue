<script setup lang="ts">
/**
 * Menú lateral: marca, navegación principal, lista de grupos con sus banners temáticos,
 * botón "Crear grupo" y la tarjeta de tu cuenta con el botón de cerrar sesión.
 */
import { computed, ref } from 'vue'
import SolicitudesGrupo from '@/components/notifications/SolicitudesGrupo.vue'
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

const NAV_ITEMS: NavItem[] = [
  { name: 'perfil', label: 'Perfil', icon: 'user' },
]

const route = useRoute()
const solicitudesVisibles = ref(false)
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
      <button type="button" class="nav-link solicitudes-boton" :class="{ active: solicitudesVisibles }" :aria-expanded="solicitudesVisibles" @click="solicitudesVisibles = !solicitudesVisibles">
        <IconoAplicacion name="users" :size="17" /><span>Solicitudes</span>
      </button>
    </nav>
    <Teleport to="body">
      <template v-if="solicitudesVisibles">
        <button class="fondo-solicitudes" aria-label="Cerrar solicitudes" @click="solicitudesVisibles = false" />
        <section class="desplegable-solicitudes" aria-label="Solicitudes de ingreso" @keydown.esc="solicitudesVisibles = false">
          <button class="cerrar-solicitudes" aria-label="Cerrar solicitudes" @click="solicitudesVisibles = false">×</button>
          <SolicitudesGrupo />
        </section>
      </template>
    </Teleport>

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
.solicitudes-boton { width:100%; border:0; background:transparent; color:var(--text-soft); font-family:inherit; text-align:left; cursor:pointer; }
.solicitudes-boton:hover { background:var(--surface); color:var(--text); }
.solicitudes-boton.active { background:var(--primary-soft); color:#c4b5fd; }
.fondo-solicitudes { position:fixed; inset:0; border:0; background:transparent; z-index:100; }
.desplegable-solicitudes { position:fixed; left:280px; top:110px; width:min(380px,calc(100vw - 32px)); max-height:calc(100dvh - 140px); overflow:auto; z-index:101; background:#211a2c; border-radius:22px; box-shadow:0 18px 65px #0008; }
.cerrar-solicitudes { position:absolute; right:14px; top:12px; border:0; background:#392b48; color:white; border-radius:10px; width:30px; height:30px; font-size:22px; cursor:pointer; }
@media(max-width:700px) { .desplegable-solicitudes { left:16px; top:70px; max-height:calc(100dvh - 160px); } }
</style>
