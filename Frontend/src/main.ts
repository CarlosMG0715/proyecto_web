// punto de entrada del frontend: conecta vue con el estado global, las rutas y los estilos.
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { setSessionExpiredHandler } from '@/services/api'
import { useSessionStore } from '@/stores/session'
import './assets/styles/styles.css'

const app = createApp(App)

// pinia se instala antes de que las vistas pidan sus stores.
app.use(createPinia())
app.use(router)

// si falla la renovacion de sesion, se limpia el usuario y se vuelve al login.
setSessionExpiredHandler(() => {
  useSessionStore().clearSession()
  void router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
})

app.mount('#app')
