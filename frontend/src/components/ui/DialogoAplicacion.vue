<script setup lang="ts">
import { onMounted, ref } from 'vue'
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal())
</script>
<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="kordia-dialog"
      :aria-label="title"
      @close="emit('close')"
    >
      <header>
        <h2>{{ title }}</h2>
        <button type="button" aria-label="Cerrar" @click="dialog?.close()">
          ×
        </button>
      </header>
      <slot />
    </dialog>
  </Teleport>
</template>
<style>
.kordia-dialog {
  background: #211a2d;
  color: #f4edff;
  border: 1px solid #7953a4;
  border-bottom: 4px solid #63438b;
  border-radius: 22px;
  padding: 24px;
  width: min(580px, calc(100vw - 32px));
  max-height: 90dvh;
  overflow: auto;
  box-shadow: 0 24px 90px #0008;
}
.kordia-dialog::backdrop {
  background: #0d0818bb;
  backdrop-filter: blur(5px);
}
.kordia-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.kordia-dialog h2 {
  font-size: 22px;
}
.kordia-dialog header button {
  background: none;
  border: 0;
  color: inherit;
  font-size: 28px;
}
.kordia-dialog form {
  display: grid;
  gap: 12px;
  margin: 16px 0;
}
.kordia-dialog label {
  display: grid;
  gap: 6px;
  font-size: 13px;
}
.kordia-dialog input,
.kordia-dialog textarea {
  width: 100%;
  background: #171120;
  border: 1px solid #685177;
  color: #fff;
  padding: 12px;
  border-radius: 10px;
  font: inherit;
}
.kordia-dialog .boton-juego {
  cursor: pointer;
}
.kordia-dialog p {
  line-height: 1.6;
}
.kordia-dialog button:disabled {
  opacity: 0.55;
  cursor: wait;
}
</style>
