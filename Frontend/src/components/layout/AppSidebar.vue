<script setup lang="ts">
/**
 * Menú lateral: marca, navegación principal, lista de grupos, botón "Crear grupo"
 * y la tarjeta de tu cuenta con el botón de cerrar sesión.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon, { type IconName } from '@/components/ui/AppIcon.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import { useCharacterStore } from '@/stores/characters'
import { useCreateGroupModal } from '@/composables/useCreateGroupModal'
import { logout } from '@/services/authService'
import { useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import kordiaLogo from '@/assets/kordia_logo.png'
import JoinRequestInbox from '@/components/group/JoinRequestInbox.vue'

interface NavItem {
  name: string
  label: string
  icon: IconName
}

const NAV_ITEMS: NavItem[] = [
  { name: 'inicio', label: 'Inicio', icon: 'home' },
  { name: 'calendario', label: 'Calendario', icon: 'calendar' },
  { name: 'perfil', label: 'Perfil', icon: 'user' },
  { name: 'configuracion', label: 'Configuración', icon: 'settings' },
]

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const characters = useCharacterStore()
const groupsStore = useGroupsStore()
const createModal = useCreateGroupModal()

const userName = computed(() => session.currentUser?.name ?? 'Usuario')
const userEmail = computed(() => session.currentUser?.email ?? '')
const activeGroupId = computed(() => (route.name === 'grupo' ? String(route.params.groupId) : null))

function groupInitials(name: string): string {
  return name
    .split(' ')
    .filter((p) => p.length > 0)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}

function myPending(groupId: string): boolean {
  const group = groupsStore.groupById(groupId)
  return Boolean(group?.members.some((m) => m.isCurrentUser && !m.checkedInToday))
}

async function handleLogout(): Promise<void> {
  await logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <aside class="sidebar">
    <!-- Marca -->
    <RouterLink :to="{ name: 'inicio' }" class="brand">
      <img :src="kordiaLogo" alt="Kordia Logo" class="brand-logo-img" />
      <span class="brand-text">
        <strong>Kordia</strong>
        <small>Hábitos en equipo</small>
      </span>
    </RouterLink>

    <!-- Navegación principal -->
    <nav class="nav">
      <span class="section-label">Menú</span>
      <template v-for="item in NAV_ITEMS" :key="item.name">
        <RouterLink
          :to="{ name: item.name }"
          class="nav-link"
          :class="{ active: route.name === item.name }"
        >
          <AppIcon :name="item.icon" :size="17" />
          <span>{{ item.label }}</span>
        </RouterLink>
        <JoinRequestInbox v-if="item.name === 'perfil'" />
      </template>
    </nav>

    <!-- Grupos -->
    <div class="groups">
      <div class="section-row">
        <span class="section-label">Tus grupos</span>
        <span class="count">{{ groupsStore.groups.length }}</span>
      </div>

      <div class="group-list">
        <RouterLink
          v-for="group in groupsStore.groups"
          :key="group.id"
          :to="{ name: 'grupo', params: { groupId: group.id } }"
          class="group-link"
          :class="{ active: activeGroupId === group.id }"
        >
          <span class="group-badge" :style="{ background: group.color }">
            {{ groupInitials(group.name) }}
          </span>
          <span class="group-info">
            <span class="group-name">{{ group.name }}</span>
            <span class="group-meta">{{ group.members.length }} miembros</span>
          </span>
          <span v-if="myPending(group.id)" class="pending-dot" title="Tienes el check-in pendiente"></span>
          <span v-else class="group-streak">
            <AppIcon name="flame" :size="13" />{{ group.streak }}
          </span>
        </RouterLink>
      </div>

      <button type="button" class="create-btn" @click="createModal.open">
        <AppIcon name="plus" :size="16" :stroke-width="2.5" />
        Crear grupo
      </button>
      <button type="button" class="join-btn" @click="createModal.openJoin">
        <AppIcon name="link" :size="15" :stroke-width="2.3" />
        Unirme a un grupo
      </button>
    </div>

    <!-- Tu cuenta -->
    <div class="account">
      <RouterLink :to="{ name: 'perfil' }" class="account-link">
        <CharacterIcon :character="characters.current" :size="34" />
        <span class="account-info">
          <span class="account-name">{{ userName }}</span>
          <span class="account-email">{{ userEmail }}</span>
        </span>
      </RouterLink>
      <button type="button" class="logout-btn" title="Cerrar sesión" @click="handleLogout">
        <AppIcon name="logout" :size="17" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.25rem 0.9rem 1rem;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}

/* Marca */
.brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0 0.4rem;
}

.brand-logo-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.45));
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-text strong {
  font-size: 0.92rem;
  font-weight: 700;
}

.brand-text small {
  font-size: 0.72rem;
  color: var(--muted);
}

/* Secciones */
.section-label {
  display: block;
  padding: 0 0.6rem;
  margin-bottom: 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 0.6rem;
}

.count {
  font-size: 0.7rem;
  color: var(--muted);
  background: var(--surface-2);
  padding: 0.05rem 0.45rem;
  border-radius: 99px;
  margin-bottom: 0.35rem;
}

/* Navegación */
.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.6rem;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-soft);
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover {
  background: var(--surface);
  color: var(--text);
}

.nav-link.active {
  background: var(--primary-soft);
  color: #c4b5fd;
}

/* Grupos */
.groups {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.6rem;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}

.group-link:hover {
  background: var(--surface);
}

.group-link.active {
  background: var(--surface-2);
  box-shadow: inset 2px 0 0 var(--primary);
}

.group-badge {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.group-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.25;
}

.group-name {
  font-size: 0.86rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-meta {
  font-size: 0.72rem;
  color: var(--muted);
}

.group-streak {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--flame);
}

.pending-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--warning);
  box-shadow: 0 0 0 3px var(--warning-soft);
}

.create-btn {
  margin-top: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.7rem;
  border: none;
  border-radius: var(--radius);
  font-size: 0.88rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #9f7aea, var(--primary-strong));
  box-shadow: 0 6px 20px -6px rgba(124, 58, 237, 0.7);
  transition: transform 0.15s, box-shadow 0.15s;
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -6px rgba(124, 58, 237, 0.85);
}

.join-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.65rem;
  border: 1px dashed rgba(167, 139, 250, 0.45);
  border-radius: var(--radius);
  font-size: 0.84rem;
  font-weight: 700;
  color: #ddd6fe;
  background: rgba(139, 92, 246, 0.1);
  transition: transform 0.15s, border-color 0.15s, background 0.15s;
}

.join-btn:hover {
  transform: translateY(-1px);
  border-color: #a78bfa;
  background: rgba(139, 92, 246, 0.2);
  color: #fff;
}

/* Cuenta */
.account {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.account-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  flex: 1;
}

.account-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.account-name {
  font-size: 0.84rem;
  font-weight: 600;
}

.account-email {
  font-size: 0.7rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
}

.logout-btn:hover {
  background: rgba(244, 63, 94, 0.12);
  color: var(--danger);
}
@media(max-width:700px){.sidebar{position:fixed;top:auto;bottom:0;left:0;right:0;height:68px;width:100%;z-index:100;padding:5px 10px;background:#1d1628;border-right:0;border-top:1px solid #604674;overflow:visible;display:block}.brand,.groups,.account,.nav>.section-label{display:none}.nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.nav-link{display:flex;flex-direction:column;justify-content:center;gap:4px;padding:8px 3px;font-size:9px;min-height:55px}.nav-link.active{background:color-mix(in srgb,var(--theme-accent) 22%,#2a2034);color:color-mix(in srgb,var(--theme-accent),white 38%)}}
</style>
