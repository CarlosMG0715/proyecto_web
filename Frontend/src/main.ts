import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { setSessionExpiredHandler } from '@/services/api'
import { useSessionStore } from '@/stores/session'
import './assets/styles/styles.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Si el refresh falla en medio de una petición, limpia la sesión y manda al login
setSessionExpiredHandler(() => {
  useSessionStore().clearSession()
  void router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
})

app.mount('#app')