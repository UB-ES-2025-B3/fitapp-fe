// src/stores/session.js
import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: null,
    profileComplete: false,
    displayName: null,
    avatarUrl: null,
  }),
  actions: {
    hydrate() {
      try {
        const raw = localStorage.getItem('session');
        if (raw) Object.assign(this, JSON.parse(raw));
      } catch {}
    },
    setSession(payload) {
      this.token = payload?.session?.token || null;
      this.profileComplete = !!payload?.user?.profileComplete;
      this.displayName = payload?.user?.displayName || null;
      this.avatarUrl = payload?.user?.avatarUrl || null;
      localStorage.setItem('session', JSON.stringify(this.$state));
    },
    clear() {
      this.$reset();
      localStorage.removeItem('session');
    },
  },
});