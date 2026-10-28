<script setup lang="ts">
// modal para crear grupos; valida lo minimo en el navegador y deja la regla final a la api.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useCreateGroupModal } from '@/composables/useCreateGroupModal'
import { useGroupsStore } from '@/stores/groups'

const CATEGORIES = ['Programación', 'Ejercicio', 'Lectura', 'Estudio', 'Salud', 'Otro']

const router = useRouter()
const groupsStore = useGroupsStore()
const { isOpen, close } = useCreateGroupModal()

const name = ref('')
const category = ref('Programación')
const error = ref<string | null>(null)
const isSubmitting = ref(false)

const canSubmit = computed(() => name.value.trim().length >= 3)

watch(isOpen, (open) => {
  if (open) {
    name.value = ''
    category.value = 'Programación'
    error.value = null
  }
})

async function submit(): Promise<void> {
  // evita peticiones invalidas, espera al servidor y navega con el id que realmente se creo.
  if (!canSubmit.value) {
    error.value = 'El nombre debe tener al menos 3 caracteres.'
    return
  }
  isSubmitting.value = true
  error.value = null
  try {
    const id = await groupsStore.createGroup({ name: name.value.trim(), category: category.value })
    close()
    await router.push({ name: 'grupo', params: { groupId: id } })
  } catch {
    error.value = groupsStore.error ?? 'No se pudo crear el grupo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <!-- la transicion y el overlay controlan la aparicion del formulario sobre la pagina. -->
  <Transition name="fade">
    <div v-if="isOpen" class="overlay" @click.self="close">
      <form class="modal" @submit.prevent="submit">
        <header class="modal-head">
          <div>
            <h2>Crear grupo</h2>
            <p>Arma un equipo y comprométanse a un hábito diario.</p>
          </div>
          <button type="button" class="icon-btn" title="Cerrar" @click="close">
            <AppIcon name="x" :size="18" />
          </button>
        </header>

        <label class="field">
          <span>Nombre del grupo</span>
          <input v-model="name" type="text" maxlength="60" placeholder="Ej: Madrugadores" autofocus />
        </label>

        <div class="field">
          <span>Categoría</span>
          <div class="chips">
            <button
              v-for="c in CATEGORIES"
              :key="c"
              type="button"
              class="chip"
              :class="{ selected: category === c }"
              @click="category = c"
            >
              {{ c }}
            </button>
          </div>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <footer class="modal-foot">
          <button type="button" class="btn ghost" @click="close">Cancelar</button>
          <button type="submit" class="btn primary" :disabled="!canSubmit || isSubmitting">{{ isSubmitting ? 'Creando...' : 'Crear grupo' }}</button>
        </footer>
      </form>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(5, 4, 10, 0.7);
  backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-strong);
  background: var(--surface);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.7);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.modal-head h2 {
  margin: 0;
  font-size: 1.15rem;
}

.modal-head p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--muted);
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
}

.icon-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-soft);
}

.field input {
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--bg);
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
}

.field input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  padding: 0.4rem 0.75rem;
  border-radius: 99px;
  border: 1px solid var(--border-strong);
  background: transparent;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-soft);
}

.chip.selected {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: #c4b5fd;
}

.error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--danger);
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  padding: 0.6rem 1.1rem;
  border-radius: var(--radius-sm);
  font-size: 0.86rem;
  font-weight: 600;
  border: 1px solid transparent;
}

.btn.ghost {
  background: transparent;
  border-color: var(--border-strong);
  color: var(--text-soft);
}

.btn.primary {
  background: var(--primary-strong);
  color: #fff;
}

.btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
