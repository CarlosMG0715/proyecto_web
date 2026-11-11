<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { verifyEmail } from '@/services/authService'

const route = useRoute()
const router = useRouter()
const token = computed(() => route.hash.slice(1))
const validLink = computed(() => /^[a-f0-9]{64}$/.test(token.value))
const busy = ref(false)
const verified = ref(false)
const error = ref('')

async function confirmEmail() {
  if (!validLink.value || busy.value || verified.value) return
  busy.value = true
  error.value = ''
  try {
    await verifyEmail(token.value)
    verified.value = true
    await router.replace({ name: 'verify-email' })
  } catch (cause) {
    error.value = (cause as { response?: { data?: { error?: string } } }).response?.data?.error
      ?? (cause instanceof Error ? cause.message : 'No pudimos confirmar tu correo.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="verification-page">
    <section class="verification-card" aria-labelledby="verification-title">
      <h1 id="verification-title">{{ verified ? 'Correo confirmado' : 'Confirma tu correo' }}</h1>
      <p v-if="verified" role="status">Tu cuenta está lista. Ya puedes iniciar sesión.</p>
      <p v-else-if="!validLink">Abre el enlace que recibiste en tu correo. Puedes pedir otro desde el inicio de sesión.</p>
      <p v-else>Confirma tu correo para activar tu cuenta de Kordia.</p>
      <p v-if="error" class="verification-error" role="alert">{{ error }}</p>
      <button v-if="validLink && !verified" type="button" :disabled="busy" @click="confirmEmail">
        {{ busy ? 'Confirmando…' : 'Confirmar correo' }}
      </button>
      <RouterLink :to="{ name: 'login' }">Ir a iniciar sesión</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.verification-page {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 24px;
  background: #151520;
  color: #f2edf7;
}

.verification-card {
  display: grid;
  width: min(100%, 430px);
  gap: 16px;
  padding: 32px;
  border-radius: 18px;
  background: #252034;
}

.verification-card h1, .verification-card p { margin: 0; }
.verification-card p { line-height: 1.5; }
.verification-card button {
  padding: 12px;
  border: 0;
  border-radius: 10px;
  background: #c5a2ef;
  color: #231733;
  font-weight: 800;
}
.verification-card a { color: #d7b8ff; width: fit-content; text-decoration: underline; }
.verification-error { color: #ffb5c3; }
</style>
