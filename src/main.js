// main.js — punto de arranque de la app Vue
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useSessionStore } from '@/stores/session.js'
import { setupInterceptors } from '@/services/api.js'
import { getProfile } from '@/services/authService.js'

console.log('import.meta.env.VITE_MAPBOX_ACCESS_TOKEN =', import.meta.env.VITE_MAPBOX_ACCESS_TOKEN)
import mapboxgl from 'mapbox-gl'

// Set Mapbox token globally at app startup so components don't depend on load order
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''
if (!mapboxgl.accessToken) {
  console.warn('[main] VITE_MAPBOX_ACCESS_TOKEN not set — Mapbox components may fail.\nCreate a .env file and restart the dev server with: npm run dev')
} else {
  console.log('[main] Mapbox token set on mapboxgl')
}
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
    try { session.clearSession() } catch {
      // Ignorar error: la sesión ya puede estar limpia
    }

    // Evitar redirección redundante si ya estamos en /login
    if (router.currentRoute.value.name !== 'login') {
      router.push({ name: 'login' })
    }
  }
})
