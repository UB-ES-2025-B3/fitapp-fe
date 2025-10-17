// src/stores/session.js
import { defineStore } from 'pinia';

export const useSessionStore = defineStore("session", {
  state: () => ({
    token: localStorage.getItem("token") || null,
    profileExists: false,
  }),
  actions: {
    setSession(token, profileExists) {
      this.token = token;
      this.profileExists = profileExists;
      localStorage.setItem("token", token);
    },
    clearSession() {
      this.token = null;
      this.profileExists = false;
      localStorage.removeItem("token");
    },
  },
});