<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Grupo, HabitoGrupo } from '@/types/grupo'
import { usarAlmacenSesion } from '@/stores/sesion'
import { servicioGrupos } from '@/services/servicioGrupos'
import { mensajeError } from '@/services/errores'
import DialogoAplicacion from '@/components/ui/DialogoAplicacion.vue'
const props = defineProps<{ group: Grupo }>()
const emit = defineEmits<{ changed: [] }>()
const session = usarAlmacenSesion()
const me = computed(() =>
  props.group.members.find((m) => m.id === session.usuarioActual?.id),
)
const editing = ref(false),
  idHabito = ref<string>()
const name = ref('')
const description = ref('')
const diasMeta = ref(30)
const error = ref('')
const busy = ref(false)
function edit(habit?: HabitoGrupo) {
  idHabito.value = habit?.id
  name.value = habit?.name ?? ''
  description.value = habit?.description ?? ''
  diasMeta.value = habit?.diasMeta ?? 30
  error.value = ''
  editing.value = true
}
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await action()
    editing.value = false
    emit('changed')
  } catch (cause) {
    error.value = mensajeError(cause)
  } finally {
    busy.value = false
  }
}
function check(habit: HabitoGrupo, event: Event) {
  const completed = (event.target as HTMLInputElement).checked
  void run(() => servicioGrupos.marcarHabito(props.group.id, habit.id, completed))
}
function save() {
  return run(() =>
    servicioGrupos.guardarHabito(
      props.group.id,
      {
        name: name.value,
        description: description.value,
        diasMeta: diasMeta.value,
      },
      idHabito.value,
    ),
  )
}
function remove(habit: HabitoGrupo) {
  if (confirm(`¿Quitar el hábito «${habit.name}»?`))
    void run(() => servicioGrupos.eliminarHabito(props.group.id, habit.id))
}
</script>
<template>
  <section class="panel-juego habits">
    <header>
      <h2>Hábitos del grupo</h2>
      <button v-if="me?.role === 'ADMIN'" class="boton-juego" @click="edit()">
        + Hábito
      </button>
    </header>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="!group.habits.length" class="game-muted">
      El administrador puede agregar la primera meta.
    </p>
    <article v-for="habit in group.habits" :key="habit.id">
      <label>
        <input
          type="checkbox"
          :checked="habit.completadoPor.includes(session.usuarioActual?.id ?? '')"
          :disabled="busy || !!me?.caidoEn"
          @change="check(habit, $event)"
        />
        <span>
          <strong>{{ habit.name }}</strong>
          <small>{{ habit.description }}</small>
          <small>
            Meta: {{ habit.diasMeta }} días ·
            {{ habit.completadoPor.length }}/{{ group.members.length }} checks hoy
          </small>
        </span>
      </label>
      <div v-if="me?.role === 'ADMIN'" class="actions">
        <button :disabled="busy" @click="edit(habit)">Editar</button>
        <button :disabled="busy" @click="remove(habit)">Quitar</button>
      </div>
    </article>
  </section>
  <DialogoAplicacion
    v-if="editing"
    :title="idHabito ? 'Editar hábito' : 'Nuevo hábito'"
    @close="editing = false"
  >
    <form @submit.prevent="save">
      <label>
        Nombre
        <input v-model="name" maxlength="80" required />
      </label>
      <label>
        Descripción
        <textarea v-model="description" maxlength="300" />
      </label>
      <label>
        Meta en días
        <input
          v-model.number="diasMeta"
          type="number"
          min="1"
          max="365"
          required
        />
      </label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button class="boton-juego" :disabled="busy">Guardar hábito</button>
    </form>
  </DialogoAplicacion>
</template>
<style scoped>
.habits {
  padding: 0;
  overflow: hidden;
}
.habits header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 22px;
  background:
    linear-gradient(#1f172d77, #1f172dbb),
    var(--group-window-banner) center/cover;
}
.habits h2 {
  font-size: 18px;
  margin: 0;
}
.habits > p {
  padding: 18px;
}
.habits article {
  padding: 18px 22px;
  border-top: 1px solid #49364e;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.habits label {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.habits input {
  accent-color: var(--group-accent);
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
.habits label span {
  display: grid;
  gap: 7px;
}
.habits small {
  color: #bfb0cd;
  font-size: 11px;
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.actions button {
  background: #33253f;
  border: 1px solid #674a77;
  border-radius: 8px;
  color: #e8d9f4;
  padding: 6px;
  cursor: pointer;
}
@media (max-width: 600px) {
  .habits article {
    flex-wrap: wrap;
  }
}
</style>
