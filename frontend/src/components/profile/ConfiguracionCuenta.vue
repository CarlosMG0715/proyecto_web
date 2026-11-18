<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DialogoAplicacion from '@/components/ui/DialogoAplicacion.vue'
import { api } from '@/services/clienteHttp'
import { mensajeError } from '@/services/errores'
import { logout } from '@/services/servicioAcceso'
import { usarAlmacenSesion } from '@/stores/sesion'
import type { User } from '@/types/acceso'
const emit = defineEmits<{ close: [] }>()
const session = usarAlmacenSesion()
const router = useRouter()
const name = ref(session.usuarioActual?.name ?? '')
const password = ref('')
const nuevaContrasena = ref('')
const notice = ref('')
const busy = ref(false)
async function save(action: 'name' | 'password' | 'delete' | 'logout') {
  if (busy.value) return
  if (action === 'delete' && !confirm('¿Borrar tu cuenta definitivamente?'))
    return
  busy.value = true
  notice.value = ''
  try {
    if (action === 'name') {
      const { data } = await api.patch<{ user: User }>('/auth/account', {
        action,
        name: name.value,
      })
      session.guardarUsuario(data.user)
    } else if (action === 'password')
      await api.patch('/auth/account', {
        action,
        password: password.value,
        nuevaContrasena: nuevaContrasena.value,
      })
    else {
      if (action === 'delete') {
        await api.delete('/auth/account', {
          data: { password: password.value },
        })
        session.limpiarSesion()
      } else await logout()
      emit('close')
      await router.push('/login')
      return
    }
    notice.value = 'Cambios guardados'
    password.value = ''
    nuevaContrasena.value = ''
  } catch (cause) {
    notice.value = mensajeError(cause)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <DialogoAplicacion title="Mi cuenta" @close="emit('close')">
    <form @submit.prevent="save('name')">
      <label>
        Apodo
        <input v-model="name" required maxlength="80" />
      </label>
      <button class="boton-juego" :disabled="busy">Guardar apodo</button>
    </form>
    <form @submit.prevent="save('password')">
      <label>
        Contraseña actual
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </label>
      <label>
        Nueva contraseña
        <input
          v-model="nuevaContrasena"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
        />
      </label>
      <button class="boton-juego secondary" :disabled="busy">
        Cambiar contraseña
      </button>
    </form>
    <p role="status">{{ notice }}</p>
    <button
      class="boton-juego secondary"
      :disabled="busy"
      @click="save('logout')"
    >
      Cerrar sesión
    </button>
    <button
      class="boton-juego secondary"
      :disabled="busy || !password"
      @click="save('delete')"
    >
      Borrar cuenta
    </button>
    <p class="game-muted">
      Para borrar tu cuenta, escribe tu contraseña actual.
    </p>
  </DialogoAplicacion>
</template>
