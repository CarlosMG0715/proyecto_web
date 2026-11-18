import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './Aplicacion.vue'
import { router } from './router/rutas'
import { alExpirarSesion } from '@/services/clienteHttp'
import { usarAlmacenSesion } from '@/stores/sesion'
import './assets/styles/estilos.css'
import './assets/styles/superficies.css'

const app = createApp(App)

// pinia se instala antes de que las vistas pidan sus stores.
app.use(createPinia())
app.use(router)

// si falla la renovacion de sesion, se limpia el usuario y se vuelve al login.
alExpirarSesion(() => {
  usarAlmacenSesion().limpiarSesion()
  void router.push({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
})

app.mount('#app')
