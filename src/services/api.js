import axios from "axios";


// Instancia central de Axios.
// Usa VITE_API_URL si existe (por ejemplo, https://api.midominio.com)
// y si no, cae al prefijo '/api/v1'
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});


// ─────────────────────────────────────────────────────────────
// Interceptor de REQUEST:
// Adjunta el token JWT (si existe) a cada petición como Authorization: Bearer.
// Esto permite que los endpoints protegidos del backend validen al usuario.
// ─────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// ─────────────────────────────────────────────────────────────
// Helper para configurar el interceptor de RESPONSE de forma
// dependiente de tu store (Pinia) y del router (vue-router).
// Úsar desde main.js tras crear el app, para que el guard 401
// pueda limpiar sesión y redirigir de forma centralizada.
// Ejemplo de uso:
//
//   import { setupInterceptors } from '@/services/api'
//   import { useSessionStore } from '@/stores/session'
//
//   const store = useSessionStore()
//   setupInterceptors({ store, router })
//
// ─────────────────────────────────────────────────────────────
export function setupInterceptors({ store, router } = {}) {
  api.interceptors.response.use(
    res => res,
    err => {
      const status = err.response?.status

      // Si el backend devuelve 401 (token inválido/expirado),
      // limpia el estado local y reenvía al login.
      if (status === 401) {
        // 1) Limpieza del estado en esta pestaña
        try { 
          if (store && typeof store.clearSession === 'function') {
            store.clearSession()
          }
        }catch {
          // Silenciar errores de cleanup
        }
        // 2) Limpieza en localStorage para notificar a otras pestañas
        // (lanzará el evento 'storage' en otras tabs si están abiertas)
        localStorage.removeItem('token')
        localStorage.removeItem('profileExists')

        // 3) Redirección a login si tenemos router
        try { if (router) router.push({ name: 'login' }) } catch {
          // Ignorar error: la sesión ya puede estar limpia
        }
      }

      // Propaga el error para que cada pantalla pueda mostrar su mensaje
      return Promise.reject(err)
    }
  )
}

export default api;
