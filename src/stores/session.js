// src/stores/session.js
import { defineStore } from 'pinia';

// Store de sesión: mantiene el token y si el perfil existe.
// Ambos valores se persisten/leen en localStorage para sobrevivir a recargas.
export const useSessionStore = defineStore("session", {
  state: () => ({
    // Intentar restaurar token desde localStorage al iniciar la app
    token: localStorage.getItem("token") || null,
    // Mantener el flag de perfil para no forzar onboarding tras reload
    profileExists: localStorage.getItem("profileExists") === "true" || false,
  }),
  actions: {
    // setSession: guardar/actualizar token + flag de perfil
    setSession(token, profileExists) {
      this.token = token;
      this.profileExists = profileExists;
      
      // Persistencia en localStorage (o limpieza si no hay token)
      if (token) localStorage.setItem('token', token)
      else localStorage.removeItem('token')

      localStorage.setItem("profileExists", this.profileExists ? "true" : "false");
    },

    // clearSession: cerrar sesión de forma explícita (logout)
    clearSession() {
      this.token = null;
      this.profileExists = false;

      // Asegurar que no quedan restos en el almacenamiento
      localStorage.removeItem("token");
      localStorage.removeItem("profileExists");
    },
  },
});