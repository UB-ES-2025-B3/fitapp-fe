// main.js — punto de arranque de la app Vue
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useSessionStore } from '@/stores/session.js'
import api, { setupInterceptors } from '@/services/api.js'
import { getProfile } from '@/services/authService.js'


// 1) Crear app y registrar plugins
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 2) Crear instancia del store (Pinia ya debe estar instalado)
const session = useSessionStore()

// 3) Configurar interceptores Axios (manejo global de 401, etc.)
//    Pasamos el store y el router para poder limpiar sesión y redirigir.
setupInterceptors({ store: session, router })

// 4) Proceso de "boot": rehidratar/verificar estado del perfil.
//    Objetivo: si hay token pero NO tenemos todavía el flag 'profileExists'
//    en localStorage (user recarga o abre nueva pestaña), preguntamos al backend.
//
//    - Si GET /profiles/me devuelve OK -> perfil existe.
//    - Si devuelve 404 -> aún no tiene perfil (forzará onboarding).
//    - Cualquier otro error: dejamos profileExists = true si no es 404 (según tu política),
//      así no bloqueamos al usuario por un error temporal.
async function boot() {
  if (session.token && localStorage.getItem('profileExists') == null) {
    try {
      await getProfile()
      session.setSession(session.token, true)
    } catch (err) {
      const status = err.response?.status ?? err.status
      session.setSession(session.token, status !== 404)
    }
  }
  app.mount('#app')
}
boot()

// 5) Sincronización de logout entre pestañas del navegador.
//    Si en otra pestaña se elimina el 'token' del localStorage,
//    aquí recibimos el evento 'storage' y hacemos logout local + redirect.
window.addEventListener('storage', (e) => {
  if (e.key === 'token' && !e.newValue) {
    // Se ha borrado el token en otra pestaña
    try { session.clearSession() } catch (e) {}
    
    // Evitar redirección redundante si ya estamos en /login
    if (router.currentRoute.value.name !== 'login') {
      router.push({ name: 'login' })
    }
  }
})