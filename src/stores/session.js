// src/stores/session.js
import { defineStore } from 'pinia';

import { getMyExecutions } from '@/services/executionService.js';

// Store de sesión: mantiene el token y si el perfil existe.
// Ambos valores se persisten/leen en localStorage para sobrevivir a recargas.
export const useSessionStore = defineStore("session", {
  state: () => ({
    // Intentar restaurar token desde localStorage al iniciar la app
    token: localStorage.getItem("token") || null,
    // Mantener el flag de perfil para no forzar onboarding tras reload
    profileExists: localStorage.getItem("profileExists") === "true" || false,

    /** Almacena la ejecución (IN_PROGRESS o PAUSED) si existe */
    activeExecution: null,
    /** Flag para evitar múltiples llamadas a fetchActiveExecution */
    isCheckingExecution: false,
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

    /**
     * [Cubre issue "Única ejecución activa"]
     * Busca en el backend si hay una ejecución 'IN_PROGRESS' o 'PAUSED'.
     * Usamos GET /api/v1/executions y filtramos,
     * ya que la API no provee un endpoint específico /active.
     */
    async fetchActiveExecution() {
      if (!this.token || this.isCheckingExecution) return;

      this.isCheckingExecution = true;
      try {
        const allExecutions = await getMyExecutions();
        //
        const running = allExecutions.find(
          (exec) => exec.status === 'IN_PROGRESS' || exec.status === 'PAUSED'
        );
        this.activeExecution = running || null;
      } catch (e) {
        console.error('Error fetching active execution', e);
        this.activeExecution = null;
      } finally {
        this.isCheckingExecution = false;
      }
    },

    /**
     * Limpia la ejecución activa del store (ej: al finalizarla).
     */
    clearActiveExecution() {
      this.activeExecution = null;
    }

  },
});