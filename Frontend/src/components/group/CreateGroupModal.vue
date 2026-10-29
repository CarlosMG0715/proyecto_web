<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon, { type IconName } from '@/components/ui/AppIcon.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import { useCreateGroupModal } from '@/composables/useCreateGroupModal'
import { useCharacterStore } from '@/stores/characters'
import { GROUP_COLORS, useGroupsStore } from '@/stores/groups'
import { useSessionStore } from '@/stores/session'
import { groupService } from '@/services/groupService'
import type { Group } from '@/types/group'

interface CategoryOption {
  label: string
  icon: IconName
  defaultHabit: string
}

const CATEGORIES: CategoryOption[] = [
  { label: 'Programación', icon: 'code', defaultHabit: 'Avanzar en programación' },
  { label: 'Ejercicio', icon: 'activity', defaultHabit: 'Entrenamiento diario' },
  { label: 'Lectura', icon: 'globe', defaultHabit: 'Lectura diaria' },
  { label: 'Estudio', icon: 'monitor', defaultHabit: 'Sesión de estudio' },
  { label: 'Salud', icon: 'heart', defaultHabit: 'Hábito de bienestar' },
  { label: 'Otro', icon: 'target', defaultHabit: 'Meta del equipo' },
]

const router = useRouter()
const session = useSessionStore()
const characters = useCharacterStore()
const groupsStore = useGroupsStore()
const { isOpen, activeTab, close } = useCreateGroupModal()

const mode = ref<'create' | 'join'>('create')
const name = ref('')
const category = ref('Programación')
const selectedColor = ref(GROUP_COLORS[0] ?? '#8b5cf6')
const codeSuffix = ref('')
const copied = ref(false)
const error = ref<string | null>(null)
const createdGroup = ref<Group | null>(null)
const joinSuccess = ref('')
const isSubmitting = ref(false)

// Estado para "Unirse a un grupo"
const joinCode = ref('')

watch(joinCode, (value) => {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // Conserva los códigos numéricos antiguos; los códigos nuevos llevan guion tras el prefijo.
  const formatted = /^\d{5,8}$/.test(compact)
    ? compact
    : compact.length > 4
      ? `${compact.slice(0, 4)}-${compact.slice(4, 8)}`
      : compact
  if (formatted !== value) joinCode.value = formatted
})

const currentCategory = computed(
  () => CATEGORIES.find((c) => c.label === category.value) ?? CATEGORIES[0]!,
)

function normalizeInvitePrefix(groupName: string): string {
  const clean = groupName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
  return (clean.slice(0, 4) || 'KORD').padEnd(4, 'X')
}

function generateUniqueSuffix(prefix: string): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const randomSuffix = (): string => {
    const bytes = new Uint8Array(4)
    window.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join('')
  }
  let suffix = randomSuffix()
  for (let attempt = 0; attempt < 40; attempt++) {
    if (!groupsStore.isInviteCodeTaken(`${prefix}-${suffix}`)) return suffix
    suffix = randomSuffix()
  }
  return suffix
}

const codePrefix = computed(() => normalizeInvitePrefix(name.value))
const previewInviteCode = computed(() => `${codePrefix.value}-${codeSuffix.value || 'QELE'}`)

function regenerateCode(): void {
  codeSuffix.value = generateUniqueSuffix(codePrefix.value)
  copied.value = false
}

watch(name, () => {
  if (groupsStore.isInviteCodeTaken(previewInviteCode.value)) regenerateCode()
})

async function copyInviteCode(textToCopy: string): Promise<void> {
  const target = textToCopy
  try {
    await navigator.clipboard.writeText(target)
  } catch {
    /* fallback */
  }
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

const canSubmitCreate = computed(() => name.value.trim().length >= 3)

watch(isOpen, (open) => {
  if (open) {
    mode.value = activeTab.value
    name.value = ''
    codeSuffix.value = generateUniqueSuffix('KORD')
    category.value = 'Programación'
    selectedColor.value =
      GROUP_COLORS[groupsStore.groups.length % GROUP_COLORS.length] ?? '#8b5cf6'
    copied.value = false
    error.value = null
    joinSuccess.value = ''
    isSubmitting.value = false
    createdGroup.value = null
    joinCode.value = ''
  }
})

watch(activeTab, (tab) => {
  if (isOpen.value) {
    mode.value = tab
    error.value = null
  }
})

async function handleCreate(): Promise<void> {
  if (!canSubmitCreate.value) {
    error.value = 'El nombre del grupo debe tener al menos 3 caracteres.'
    return
  }
  error.value = null
  isSubmitting.value = true
  try {
    const persisted = await groupService.create({
      name: name.value.trim(),
      category: category.value,
      color: selectedColor.value,
      inviteCode: previewInviteCode.value,
      initialHabit: { name: currentCategory.value.defaultHabit, icon: '🎯' },
    })
    const group = groupsStore.createGroup(
      { name: name.value, category: category.value, habit: currentCategory.value.defaultHabit, color: selectedColor.value },
      session.currentUser?.name ?? 'Usuario',
      { id: persisted.id, inviteCode: persisted.inviteCode },
    )
    await groupsStore.refreshRemoteGroups()
    createdGroup.value = groupsStore.groupById(persisted.id) ?? group
  } catch (cause) {
    error.value = (cause as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'No pudimos crear el grupo. Verifica que la base de datos esté conectada.'
  } finally {
    isSubmitting.value = false
  }
}

async function goToCreatedGroup(): Promise<void> {
  if (!createdGroup.value) return
  const targetId = createdGroup.value.id
  close()
  await router.push({ name: 'grupo', params: { groupId: targetId } })
}

async function handleJoin(): Promise<void> {
  error.value = null
  joinSuccess.value = ''
  isSubmitting.value = true
  const res = await groupsStore.requestGroupJoin(joinCode.value)
  isSubmitting.value = false
  if (!res.ok) {
    error.value = res.message
    return
  }
  joinSuccess.value = `Solicitud enviada a “${res.groupName}”. Cuando el admin la acepte, aparecerá en tus grupos.`
}
</script>

<template>
  <Transition name="modal-pop">
    <div v-if="isOpen" class="overlay" @click.self="close" @keydown.esc="close">
      <!-- PASO DE ÉXITO: EQUIPO CREADO CON CÓDIGO ÚNICO -->
      <section
        v-if="createdGroup"
        class="guild-modal success-modal"
        :style="{ '--team-color': createdGroup.color }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="created-title"
      >
        <button type="button" class="close-btn" aria-label="Cerrar" @click="close">
          <AppIcon name="x" :size="18" />
        </button>

        <div class="success-badge">
          <AppIcon name="shield" :size="36" />
        </div>

        <span class="kicker">¡GRUPO CREADO CON ÉXITO!</span>
        <h2 id="created-title">{{ createdGroup.name }}</h2>
        <p class="subtitle">
          Este es el código único oficial de tu grupo. Quedó guardado para que tus amigos puedan unirse.
        </p>

        <div class="code-showcase">
          <div class="code-showcase-top">
            <span class="ticket-tag">
              <i class="status-dot"></i>CÓDIGO DE INVITACIÓN
            </span>
          </div>
          <strong class="showcase-number">{{ createdGroup.inviteCode }}</strong>
          <button
            type="button"
            class="copy-big-btn"
            @click="copyInviteCode(createdGroup.inviteCode)"
          >
            <AppIcon :name="copied ? 'check' : 'copy'" :size="17" />
            {{ copied ? '¡Código copiado al portapapeles!' : 'Copiar código de invitación' }}
          </button>
        </div>

        <footer class="modal-foot">
          <button type="button" class="game-btn primary full" @click="goToCreatedGroup">
            <AppIcon name="flame" :size="18" />
            Entrar al grupo ahora
            <AppIcon name="arrow-right" :size="16" />
          </button>
        </footer>
      </section>

      <!-- VENTANA PRINCIPAL: CREAR GRUPO O UNIRSE A UN GRUPO -->
      <section
        v-else
        class="guild-modal"
        :style="{ '--team-color': selectedColor }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header class="modal-head">
          <div>
            <span class="kicker">EQUIPOS KORDIA</span>
            <h2 id="modal-title">
              {{ mode === 'create' ? 'Crear nuevo grupo' : 'Unirme a un grupo' }}
            </h2>
          </div>
          <button type="button" class="close-btn" title="Cerrar" @click="close">
            <AppIcon name="x" :size="18" />
          </button>
        </header>

        <!-- Pestañas intercambiables -->
        <div class="mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'create'"
            :class="{ active: mode === 'create' }"
            @click="mode = 'create'; error = null"
          >
            <AppIcon name="plus" :size="16" />
            Crear grupo
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'join'"
            :class="{ active: mode === 'join' }"
            @click="mode = 'join'; error = null"
          >
            <AppIcon name="link" :size="16" />
            Unirme a un grupo
          </button>
        </div>

        <!-- MODO 1: CREAR GRUPO (SIMPLE Y CON CÓDIGO ÚNICO DESTACADO) -->
        <form v-if="mode === 'create'" class="modal-body" @submit.prevent="handleCreate">
          <!-- Vista previa del grupo -->
          <div class="banner-preview">
            <span class="banner-emblem">
              <AppIcon :name="currentCategory.icon" :size="26" />
            </span>
            <div class="banner-info">
              <small>{{ category.toUpperCase() }}</small>
              <strong>{{ name.trim() || 'Nombre de tu grupo' }}</strong>
            </div>
            <div class="banner-leader" title="Tu personaje">
              <CharacterIcon :character="characters.current" :size="48" />
            </div>
          </div>

          <label class="field">
            <span>Nombre del grupo</span>
            <input
              v-model="name"
              type="text"
              maxlength="40"
              placeholder="Ej: Madrugadores, Club de Código..."
              autofocus
            />
          </label>

          <!-- Categoría y Color -->
          <div class="field">
            <div class="field-header">
              <span>Categoría y color</span>
              <div class="color-swatches" aria-label="Color del grupo">
                <button
                  v-for="color in GROUP_COLORS"
                  :key="color"
                  type="button"
                  class="color-dot"
                  :class="{ active: selectedColor === color }"
                  :style="{ '--dot': color }"
                  :aria-label="`Elegir color ${color}`"
                  @click="selectedColor = color"
                />
              </div>
            </div>
            <div class="chips">
              <button
                v-for="c in CATEGORIES"
                :key="c.label"
                type="button"
                class="chip"
                :class="{ selected: category === c.label }"
                @click="category = c.label"
              >
                <AppIcon :name="c.icon" :size="15" />
                {{ c.label }}
              </button>
            </div>
          </div>

          <!-- Vista previa del mismo código que se envía al servidor al crear el grupo. -->
          <div class="code-showcase">
            <div class="code-showcase-top">
              <span class="ticket-tag">
                <i class="status-dot"></i>CÓDIGO DE INVITACIÓN
              </span>
            </div>

            <div class="code-showcase-main">
              <strong class="showcase-number">{{ previewInviteCode }}</strong>
              <div class="ticket-actions">
                <button type="button" class="ticket-action" title="Generar otro código" @click="regenerateCode">
                  Otro código
                </button>
              </div>
            </div>
            <small class="code-hint">
              Si ya existe, te daremos otro al crear el grupo. Guárdalo para invitar a tu equipo.
            </small>
          </div>

          <p v-if="error" class="error" role="alert">{{ error }}</p>

          <footer class="modal-foot">
            <button type="button" class="game-btn ghost" @click="close">Cancelar</button>
            <button type="submit" class="game-btn primary" :disabled="!canSubmitCreate || isSubmitting">
              <AppIcon name="plus" :size="16" />
              {{ isSubmitting ? 'Creando…' : 'Crear grupo' }}
            </button>
          </footer>
        </form>

        <!-- MODO 2: UNIRSE A UN GRUPO (GRANDE Y LLAMATIVO) -->
        <form v-else class="modal-body join-body" @submit.prevent="handleJoin">
          <div class="join-showcase">
            <div class="join-badge-icon">
              <AppIcon name="users" :size="32" />
            </div>
            <h3>Únete a un equipo con su código</h3>
            <p>Escribe el código de invitación único que te compartió el creador del grupo.</p>

            <div class="join-input-wrap">
              <input
                v-model="joinCode"
                type="text"
                maxlength="9"
                class="big-code-input"
                placeholder="KORD-FHJ4"
                autofocus
              />
            </div>

          </div>

          <p v-if="joinSuccess" class="join-success" role="status">{{ joinSuccess }}</p>

          <p v-if="error" class="error" role="alert">{{ error }}</p>

          <footer class="modal-foot">
            <button type="button" class="game-btn ghost" @click="close">Cancelar</button>
            <button type="submit" class="game-btn primary join-submit" :disabled="joinCode.trim().length < 4 || isSubmitting">
              <AppIcon :name="joinSuccess ? 'check' : 'users'" :size="17" />
              {{ isSubmitting ? 'Enviando…' : joinSuccess ? 'Enviar otra solicitud' : 'Pedir acceso' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(8, 5, 14, 0.82);
  backdrop-filter: blur(7px);
}

.guild-modal {
  --team-color: #8b5cf6;
  width: min(590px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 30px;
  border-radius: 22px;
  background: #211c2d;
  color: #f3edf9;
  border: 2px solid color-mix(in srgb, var(--team-color) 60%, #433554);
  border-bottom: 6px solid #100b18;
  box-shadow: 0 32px 70px rgba(0, 0, 0, 0.75);
  position: relative;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.kicker {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: #cbb2ec;
  margin-bottom: 5px;
}

.modal-head h2 {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.close-btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1px solid #574269;
  border-bottom: 3px solid #150e20;
  background: #2d233a;
  color: #d6c3ea;
  cursor: pointer;
}

.close-btn:hover {
  background: #3b2e4c;
  color: #fff;
}

/* Pestañas Crear / Unirse */
.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 6px;
  background: #16111f;
  border: 1px solid #3f314e;
  border-radius: 14px;
}

.mode-tabs button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: #b5a5c8;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-tabs button.active {
  background: linear-gradient(135deg, #3c2b52, #2d213d);
  color: #ffffff;
  border-color: #8b68b5;
  box-shadow: 0 4px 0 #120c1b;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Vista previa del estandarte */
.banner-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 15px;
  background: linear-gradient(
    125deg,
    color-mix(in srgb, var(--team-color) 26%, #2b2138),
    #1a1524
  );
  border: 1px solid color-mix(in srgb, var(--team-color) 55%, #473759);
  border-bottom: 4px solid #120d1a;
}

.banner-emblem {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--team-color) 28%, #1d1628);
  border: 1px solid var(--team-color);
  border-bottom: 3px solid #120c1a;
  color: var(--team-color);
  transform: rotate(-4deg);
  flex-shrink: 0;
}

.banner-info {
  flex: 1;
  min-width: 0;
}

.banner-info small {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #d2bceb;
}

.banner-info strong {
  display: block;
  font-size: 20px;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-leader {
  flex-shrink: 0;
}

/* Campos */
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #dfd0f2;
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.color-swatches {
  display: flex;
  align-items: center;
  gap: 7px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--dot);
  border: 2px solid rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: transform 0.15s;
}

.color-dot.active {
  transform: scale(1.22);
  border-color: #fff;
  box-shadow: 0 0 0 2px #211c2d, 0 0 10px var(--dot);
}

.field input {
  padding: 13px 15px;
  border-radius: 12px;
  border: 1px solid #5a446c;
  border-bottom: 3px solid #120c1a;
  background: #15111f;
  color: #f5effc;
  font-size: 15px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.15s;
}

.field input:focus {
  border-color: var(--team-color);
}

/* Chips de categoría */
.chips {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.chip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #4a395a;
  border-bottom: 3px solid #130d1c;
  background: #292136;
  font-size: 12px;
  font-weight: 700;
  color: #d2c2e6;
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover {
  border-color: var(--team-color);
}

.chip.selected {
  background: color-mix(in srgb, var(--team-color) 28%, #292036);
  border-color: var(--team-color);
  color: #fff;
}

/* CAJA DESTACADA DEL CÓDIGO DE INVITACIÓN ÚNICO */
.code-showcase {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 16px;
  background: linear-gradient(145deg, #171222, #120e1b);
  border: 2px solid color-mix(in srgb, var(--team-color) 75%, #6d528c);
  box-shadow:
    inset 0 0 24px rgba(0, 0, 0, 0.55),
    0 6px 20px rgba(0, 0, 0, 0.35);
}

.code-showcase-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ticket-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #c2e5a0;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b9d89c;
  box-shadow: 0 0 8px #b9d89c;
}

.unique-pill {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 3px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--team-color) 30%, #241b33);
  border: 1px solid var(--team-color);
  color: #f6efff;
}

.code-showcase-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.showcase-number {
  font-family: monospace;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: #ffffff;
  text-shadow: 0 2px 12px color-mix(in srgb, var(--team-color) 65%, transparent);
}

.code-hint {
  font-size: 11px;
  color: #b7a6cb;
}

.ticket-actions {
  display: flex;
  gap: 8px;
}

.ticket-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid #5d4770;
  border-bottom: 3px solid #130d1c;
  background: #2c2239;
  color: #e4d4f7;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.ticket-action:hover {
  background: #382b48;
}

.ticket-action.copy {
  background: color-mix(in srgb, var(--team-color) 35%, #2c2239);
  border-color: var(--team-color);
  color: #fff;
}

.copy-big-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px 16px;
  margin-top: 4px;
  border-radius: 10px;
  border: 1px solid var(--team-color);
  border-bottom: 3px solid #120c1b;
  background: color-mix(in srgb, var(--team-color) 28%, #261d34);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

/* MODO UNIRSE A UN GRUPO (GRANDE Y LLAMATIVO) */
.join-showcase {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 26px 22px;
  border-radius: 18px;
  background: linear-gradient(145deg, #2b213b, #191424);
  border: 2px solid #7c5bb0;
  border-bottom: 5px solid #110c19;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.join-badge-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #9f7aea, #6d489c);
  border: 2px solid #e2ccff;
  border-bottom: 4px solid #3c2559;
  color: #fff;
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.45);
}

.join-showcase h3 {
  margin: 4px 0 0;
  font-size: 22px;
  letter-spacing: -0.03em;
}

.join-showcase p {
  margin: 0;
  font-size: 13px;
  color: #c5b4d8;
  max-width: 400px;
  line-height: 1.5;
}

.join-input-wrap {
  width: 100%;
  max-width: 380px;
  margin-top: 6px;
}

.big-code-input {
  width: 100%;
  padding: 16px 18px;
  border-radius: 14px;
  border: 2px solid #9c78d4;
  border-bottom: 4px solid #120c1c;
  background: #130e1c;
  color: #ffffff;
  font-family: monospace;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: center;
  outline: none;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.55), 0 0 20px rgba(159, 122, 234, 0.2);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.big-code-input:focus {
  border-color: #d6bcfa;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.55), 0 0 25px rgba(198, 165, 243, 0.45);
}

.big-code-input::placeholder {
  color: #534368;
}

.matched-group {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  margin-top: 6px;
  border-radius: 12px;
  background: #233327;
  border: 1px solid #6fa166;
  text-align: left;
}

.matched-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #b5d68c;
  color: #20311d;
  flex-shrink: 0;
}

.matched-group small {
  display: block;
  font-size: 9px;
  letter-spacing: 0.12em;
  color: #c2e5a0;
  font-weight: 800;
}

.matched-group strong {
  display: block;
  font-size: 16px;
  margin: 2px 0;
}

.matched-group span {
  font-size: 11px;
  color: #d2e7c3;
}

.quick-codes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-codes small {
  font-size: 11px;
  color: #b4a2c8;
}

.quick-code-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.code-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 9px;
  background: #181322;
  border: 1px solid #4b395d;
  color: #dfd0f2;
  font-size: 11px;
  cursor: pointer;
}

.code-chip:hover {
  border-color: #c6a5f3;
  background: #241c31;
}

.code-chip strong {
  font-family: monospace;
  font-size: 12px;
  color: #d7bcf8;
}

/* Vista de éxito */
.success-modal {
  text-align: center;
  align-items: center;
}

.success-modal .close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
}

.success-badge {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--team-color) 28%, #2a2038);
  border: 2px solid var(--team-color);
  border-bottom: 4px solid #120c1a;
  color: var(--team-color);
}

.subtitle {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #c6b5da;
  max-width: 420px;
}

.success-modal .code-showcase {
  width: 100%;
}

.error {
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(244, 63, 94, 0.14);
  border: 1px solid rgba(244, 63, 94, 0.4);
  font-size: 12px;
  color: #fda4af;
}

.join-success {
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(134, 197, 125, 0.14);
  border: 1px solid rgba(134, 197, 125, 0.45);
  color: #c6edb8;
  font-size: 13px;
  line-height: 1.5;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  margin-top: 4px;
}

.game-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 22px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.15s, filter 0.15s;
}

.game-btn.ghost {
  background: #2c2238;
  border: 1px solid #59446b;
  border-bottom: 3px solid #140d1d;
  color: #d8c6ec;
}

.game-btn.primary {
  background: #c6a5f3;
  border: 1px solid #e3c8ff;
  border-bottom: 4px solid #755196;
  color: #241734;
}

.game-btn.join-submit {
  padding: 13px 28px;
}

.game-btn.primary:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.game-btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.game-btn.full {
  width: 100%;
}

.modal-pop-enter-active,
.modal-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

@media (max-width: 560px) {
  .guild-modal {
    padding: 20px 16px;
  }
  .chips {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .showcase-number {
    font-size: 24px;
  }
  .big-code-input {
    font-size: 22px;
  }
}
</style>
