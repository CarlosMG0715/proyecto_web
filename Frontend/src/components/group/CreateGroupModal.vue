<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import CharacterIcon from '@/components/ui/CharacterIcon.vue'
import { useCreateGroupModal } from '@/composables/useCreateGroupModal'
import { useCharacterStore } from '@/stores/characters'
import { useGroupsStore } from '@/stores/groups'
import { GROUP_CATEGORIES } from '@/constants/groupCategories'
import { GROUP_BANNER_THEMES, JOIN_GROUP_BANNER_URL, getGroupBannerTheme } from '@/constants/groupBanners'
import { useSessionStore } from '@/stores/session'
import { groupService } from '@/services/groupService'
import type { Group } from '@/types/group'

const router = useRouter()
const session = useSessionStore()
const characters = useCharacterStore()
const groupsStore = useGroupsStore()
const { isOpen, activeTab, close, replaceArchivedGroupId } = useCreateGroupModal()

const mode = ref<'create' | 'join'>('create')
const name = ref('')
const description = ref('')
const goal = ref<30 | 90 | 120>(30)
const habitStep = ref(false)
const habitName = ref('')
const habitDescription = ref('')
const habitIcons = ['target', 'flame', 'globe', 'heart', 'activity', 'moon', 'code', 'monitor', 'shield', 'trophy', 'flag', 'message'] as const
const habitIcon = ref<(typeof habitIcons)[number]>('target')
const category = ref('Programación')
const selectedColor = ref(GROUP_BANNER_THEMES[0]!.color)
const codeSuffix = ref('')
const copied = ref(false)
const error = ref<string | null>(null)
const createdGroup = ref<Group | null>(null)
const joinSuccess = ref('')
const isSubmitting = ref(false)

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
  () => GROUP_CATEGORIES.find((c) => c.label === category.value) ?? GROUP_CATEGORIES[0]!,
)

const selectedBannerTheme = computed(() => getGroupBannerTheme(selectedColor.value))
const createdBannerTheme = computed(() => getGroupBannerTheme(createdGroup.value?.color))

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
    description.value = ''
    goal.value = 30
    habitStep.value = false
    habitName.value = ''
    habitDescription.value = ''
    habitIcon.value = 'target'
    codeSuffix.value = generateUniqueSuffix('KORD')
    category.value = 'Programación'
    selectedColor.value =
      GROUP_BANNER_THEMES[groupsStore.groups.length % GROUP_BANNER_THEMES.length]?.color ?? '#ec4899'
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
  if (!habitStep.value) {
    habitStep.value = true
    return
  }
  if (!habitName.value.trim() || isSubmitting.value) return
  isSubmitting.value = true
  const replacing = replaceArchivedGroupId.value
  try {
    const persisted = await groupService.create({
      replaceArchivedGroupId: replacing,
      name: name.value.trim(),
      category: category.value,
      color: selectedColor.value,
      inviteCode: previewInviteCode.value,
      description: description.value.trim(),
      targetDays: goal.value,
      initialHabit: { name: habitName.value.trim(), icon: habitIcon.value, description: habitDescription.value.trim() },
    })
    const group = groupsStore.createGroup(
      { name: name.value, category: category.value, habit: habitName.value.trim(), color: selectedColor.value },
      session.currentUser?.name ?? 'Usuario',
      { id: persisted.id, inviteCode: persisted.inviteCode, replacedGroupId: replacing },
    )
    if (replacing) {
      close()
      await router.push({ name: 'grupo', params: { groupId: persisted.id } })
      await groupsStore.refreshRemoteGroups()
      return
    }
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
      <section
        v-if="createdGroup"
        class="guild-modal success-modal"
        :style="{
          '--team-color': createdGroup.color,
          '--banner-img': `url(&quot;${createdBannerTheme.bannerUrl}&quot;)`,
          '--banner-filter': createdBannerTheme.filter ?? 'none',
        }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="created-title"
      >
        <button type="button" class="close-btn" aria-label="Cerrar" @click="close">
          <AppIcon name="x" :size="18" />
        </button>

        <div class="banner-preview success-banner">
          <span class="banner-preview-art" aria-hidden="true"></span>
          <span class="banner-preview-shade" aria-hidden="true"></span>
          <span class="banner-emblem">
            <AppIcon name="shield" :size="26" />
          </span>
          <div class="banner-info">
            <small>¡GRUPO CREADO CON ÉXITO!</small>
            <strong id="created-title">{{ createdGroup.name }}</strong>
          </div>
          <div class="banner-leader" title="Tu personaje">
            <CharacterIcon :character="characters.current" :size="48" />
          </div>
        </div>

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

      <section v-else-if="habitStep" class="guild-modal create-flow" role="dialog" aria-modal="true" aria-labelledby="first-habit-title"
        :style="{ '--team-color': selectedColor, '--habit-banner': 'url(' + JOIN_GROUP_BANNER_URL + ')' }">
        <header class="first-habit-banner">
          <div class="create-steps" aria-label="Paso 2 de 2">
            <span aria-hidden="true">1/2</span>
            <span class="current" aria-current="step">2/2</span>
          </div>
          <h2 id="first-habit-title">¡Crea el hábito de tu grupo!</h2>
        </header>
        <form class="modal-body" @submit.prevent="handleCreate">
          <label class="field"><span>Nombre del hábito</span><input v-model="habitName" maxlength="80" required placeholder="Ej. Leer 20 minutos" /></label>
          <label class="field"><span>Descripción del hábito (opcional)</span><textarea v-model="habitDescription" maxlength="300" rows="3" /></label>
          <div class="field"><span>Insignia</span>
            <div class="habit-picker" role="group" aria-label="Insignia del hábito">
              <button v-for="icon in habitIcons" :key="icon" type="button" :aria-label="icon" :aria-pressed="habitIcon === icon" @click="habitIcon = icon"><AppIcon :name="icon" :size="21" /></button>
            </div>
          </div>
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <footer class="modal-foot">
            <button type="button" class="game-btn ghost" :disabled="isSubmitting" @click="habitStep = false; error = null">Volver</button>
            <button type="submit" class="game-btn primary" :disabled="!habitName.trim() || isSubmitting">
              {{ isSubmitting ? 'Creando…' : 'Crear grupo' }}
              <AppIcon v-if="!isSubmitting" name="arrow-right" :size="16" />
            </button>
          </footer>
        </form>
      </section>

      <section
        v-else
        class="guild-modal"
        :class="{ 'create-flow': mode === 'create' }"
        :style="{
          '--team-color': selectedColor,
          '--banner-img': `url(&quot;${selectedBannerTheme.bannerUrl}&quot;)`,
          '--banner-filter': selectedBannerTheme.filter ?? 'none',
        }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header class="modal-head">
          <div>
            <div v-if="mode === 'create'" class="create-steps" aria-label="Paso 1 de 2">
              <span class="current" aria-current="step">1/2</span>
              <span aria-hidden="true">2/2</span>
            </div>
            <span class="kicker">EQUIPOS KORDIA</span>
            <h2 id="modal-title">
              {{ mode === 'create' ? 'Crear nuevo grupo' : 'Unirme a un grupo' }}
            </h2>
          </div>
          <button type="button" class="close-btn" title="Cerrar" @click="close">
            <AppIcon name="x" :size="18" />
          </button>
        </header>

        <div v-if="!replaceArchivedGroupId" class="mode-tabs" role="tablist">
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

        <form v-if="mode === 'create'" class="modal-body" @submit.prevent="handleCreate">
          <div class="banner-preview">
            <span class="banner-preview-art" aria-hidden="true"></span>
            <span class="banner-preview-shade" aria-hidden="true"></span>
            <span class="banner-emblem">
              <AppIcon :name="currentCategory.icon" :size="26" />
            </span>
            <div class="banner-info">
              <small>{{ category.toUpperCase() }} · {{ selectedBannerTheme.name.toUpperCase() }}</small>
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

          <label class="field"><span>Descripción del grupo (opcional)</span><textarea v-model="description" maxlength="200" rows="3" /></label>
          <fieldset class="group-goal">
            <legend>Meta del grupo</legend>
            <label v-for="days in ([30, 90, 120] as const)" :key="days">
              <input v-model="goal" type="radio" name="group-goal" :value="days" />
              <span class="goal-flag"><AppIcon name="flag" :size="19" /></span>
              <span class="goal-duration"><strong>{{ days }}</strong> días</span>
              <small>{{ days === 30 ? 'Primer camino' : days === 90 ? 'Travesía' : 'Expedición' }}</small>
            </label>
          </fieldset>

          <div class="field">
            <div class="field-header">
              <span>Banner y tema del grupo</span>
              <small class="theme-picked-label">{{ selectedBannerTheme.name }}</small>
            </div>
            <div class="banner-theme-grid" role="radiogroup" aria-label="Banner del grupo">
              <button
                v-for="theme in GROUP_BANNER_THEMES"
                :key="theme.id"
                type="button"
                class="banner-swatch-card"
                :class="{ active: selectedColor.toLowerCase() === theme.color.toLowerCase() }"
                :style="{
                  '--swatch-img': `url(&quot;${theme.bannerUrl}&quot;)`,
                  '--swatch-filter': theme.filter ?? 'none',
                  '--swatch-color': theme.color,
                }"
                :aria-label="`Elegir tema ${theme.name}`"
                :aria-pressed="selectedColor.toLowerCase() === theme.color.toLowerCase()"
                @click="selectedColor = theme.color"
              >
                <span class="swatch-art" aria-hidden="true"></span>
                <span class="swatch-overlay" aria-hidden="true"></span>
                <span class="swatch-label">
                  <span class="swatch-dot"></span>
                  <strong>{{ theme.name }}</strong>
                </span>
              </button>
            </div>
          </div>

          <div class="field">
            <span>Categoría</span>
            <div class="chips">
              <button
                v-for="c in GROUP_CATEGORIES"
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
              Continuar
              <AppIcon name="arrow-right" :size="16" />
            </button>
          </footer>
        </form>

        <form v-else class="modal-body join-body" @submit.prevent="handleJoin">
          <div class="join-showcase">
            <div
              class="join-banner-hero"
              :style="{ '--join-banner': `url(&quot;${JOIN_GROUP_BANNER_URL}&quot;)` }"
            >
              <span class="join-banner-art" aria-hidden="true"></span>
              <span class="join-banner-shade" aria-hidden="true"></span>
              <div class="join-banner-copy">
                <span class="join-banner-kicker">
                  <AppIcon name="users" :size="12" />
                  AVENTURA EN EQUIPO
                </span>
                <h3>¡Únete a un grupo!</h3>
                <p>Comparte metas y rachas con tus amigos.</p>
              </div>
            </div>

            <div class="join-showcase-body">
              <label class="join-code-label" for="join-code-input">
                Escribe el código de invitación único que te compartió el creador del grupo
              </label>

              <div class="join-input-wrap">
                <input
                  id="join-code-input"
                  v-model="joinCode"
                  type="text"
                  maxlength="9"
                  class="big-code-input"
                  placeholder="KORD-FHJ4"
                  autofocus
                />
              </div>
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
  width: min(720px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px;
  border-radius: 24px;
  background: #211c2d;
  color: #f3edf9;
  border: 0;
  border-bottom: 6px solid #100b18;
  box-shadow: 0 32px 70px rgba(0, 0, 0, 0.78);
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
  gap: 16px;
}

.banner-preview {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 138px;
  padding: 24px 26px;
  border-radius: 20px;
  border: 0;
  border-bottom: 5px solid #120d1a;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
}

.banner-preview-art {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image: var(--banner-img);
  background-size: cover;
  background-position: center;
  filter: var(--banner-filter, none);
  transition: transform 0.35s ease, filter 0.25s ease;
}

.banner-preview-shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    90deg,
    rgba(17, 11, 28, 0.74) 0%,
    rgba(17, 11, 28, 0.38) 52%,
    rgba(17, 11, 28, 0.1) 100%
  );
}

.banner-emblem {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--team-color) 48%, rgba(20, 14, 32, 0.9));
  border: 0;
  border-bottom: 4px solid #120c1a;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5);
  transform: rotate(-4deg);
  flex-shrink: 0;
}

.banner-info {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.banner-info small {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(15, 10, 24, 0.62);
  backdrop-filter: blur(4px);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.13em;
  color: #f3e8ff;
}

.banner-info strong {
  display: block;
  font-size: 21px;
  margin-top: 5px;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-leader {
  flex-shrink: 0;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
}

.success-banner {
  width: 100%;
  margin-top: 10px;
}

.theme-picked-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--team-color);
}

.banner-theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.banner-swatch-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  height: 54px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.14);
  border-bottom: 4px solid #110b19;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.banner-swatch-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.45);
}

.banner-swatch-card.active {
  transform: translateY(-2px);
  border-color: #ffffff;
  box-shadow:
    0 0 0 2px var(--swatch-color),
    0 8px 18px rgba(0, 0, 0, 0.5);
}

.swatch-art {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image: var(--swatch-img);
  background-size: cover;
  background-position: center;
  filter: var(--swatch-filter, none);
  transition: transform 0.25s ease;
}

.banner-swatch-card:hover .swatch-art {
  transform: scale(1.07);
}

.swatch-overlay {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(180deg, rgba(14, 9, 22, 0.12) 0%, rgba(14, 9, 22, 0.78) 100%);
}

.swatch-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.swatch-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--swatch-color);
  border: 1.5px solid #fff;
  flex-shrink: 0;
}

.swatch-label strong {
  font-size: 11px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

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

.join-showcase {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: center;
  gap: 0;
  padding: 0;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(145deg, #251c35, #171222);
  border: 0;
  border-bottom: 5px solid #0f0a17;
  box-shadow: 0 16px 36px rgba(7, 4, 15, 0.6);
}

.join-banner-hero {
  position: relative;
  width: 100%;
  aspect-ratio: 1024 / 341;
  min-height: 235px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 24px 36px 24px 52%;
  overflow: hidden;
  border-bottom: 0;
}

.join-banner-art {
  position: absolute;
  inset: 0;
  background-image: var(--join-banner);
  background-size: cover;
  background-position: left center;
  z-index: 0;
}

.join-banner-shade {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 73% 48%,
    rgba(20, 12, 36, 0.35) 0%,
    rgba(16, 10, 28, 0.1) 55%,
    transparent 100%
  );
  z-index: 0;
}

.join-banner-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 6px;
  max-width: 270px;
}

.join-banner-kicker {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(168, 121, 245, 0.25);
  border: 0;
  color: #f3e4ff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  backdrop-filter: blur(4px);
}

.join-banner-copy h3 {
  margin: 2px 0 0;
  font-size: 27px;
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: #ffffff;
  text-shadow: 0 2px 12px rgba(8, 4, 18, 0.9);
}

.join-banner-copy p {
  margin: 0;
  font-size: 13px;
  color: #e4d4f7;
  line-height: 1.4;
  text-shadow: 0 1px 6px rgba(8, 4, 18, 0.9);
}

.join-showcase-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 22px 24px;
}

.join-code-label {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #d7c7ea;
  max-width: 420px;
  line-height: 1.45;
}

.join-input-wrap {
  width: 100%;
  max-width: 380px;
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

.success-modal {
  text-align: center;
  align-items: center;
}

.success-modal .close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 3;
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
  .banner-theme-grid,
  .chips {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .showcase-number {
    font-size: 24px;
  }
  .big-code-input {
    font-size: 22px;
  }
  .join-banner-hero {
    padding: 14px 16px 14px 48%;
    min-height: 148px;
  }
  .join-banner-copy h3 {
    font-size: 18px;
  }
  .join-banner-copy p {
    font-size: 11px;
  }
}
.guild-modal.create-flow { width: min(660px, 100%); }
.create-steps { display: flex; gap: 7px; margin-bottom: 8px; }
.create-steps span { display: grid; place-items: center; width: 31px; height: 31px; border-radius: 50%; background: #221a2deb; color: #ded2e7; font-size: .7rem; font-weight: 800; }
.create-steps .current { background: color-mix(in srgb, var(--team-color) 50%, #fff0ca); color: #251a2d; }
.first-habit-banner { min-height: 148px; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 20px; border-radius: 17px; background: linear-gradient(transparent, #151021df), var(--habit-banner) center / cover; }
.first-habit-banner h2 { margin: 0; font-size: clamp(1.5rem, 4vw, 2.4rem); }
.create-flow textarea { width: 100%; padding: 12px; border: 0; border-radius: 10px; background: #191522; color: inherit; font: inherit; resize: vertical; }
.group-goal { margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; border: 0; padding: 0; min-width: 0; }
.group-goal legend { margin-bottom: 8px; font-weight: 700; }
.habit-picker button { padding: 10px; border: 0; border-radius: 10px; background: color-mix(in srgb, var(--team-color) 20%, #251e30); color: inherit; }
.group-goal label { position: relative; display: grid; justify-items: center; align-content: center; gap: 5px; min-height: 116px; padding: 10px 4px; border-radius: 14px; text-align: center; background: color-mix(in srgb, var(--team-color) 16%, #282135); cursor: pointer; }
.group-goal input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.group-goal label:has(input:focus-visible) { outline: 2px solid var(--team-color); outline-offset: 3px; }
.group-goal label:has(input:checked) { background: color-mix(in srgb, var(--team-color) 38%, #f6dfac); color: #261c30; }
.goal-flag { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: color-mix(in srgb, var(--team-color) 33%, transparent); }
.goal-duration { font-size: .78rem; }
.goal-duration strong { font-size: 1.65rem; line-height: 1; }
.group-goal small { font-size: .69rem; }
.habit-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.habit-picker button[aria-pressed="true"] { background: color-mix(in srgb, var(--team-color) 34%, #ffe3a0); color: #24192a; }
</style>
