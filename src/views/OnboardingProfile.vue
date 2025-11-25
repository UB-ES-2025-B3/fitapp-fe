<template>
  <div class="onboarding-container">
    <div class="onboarding-card">
      <h1 class="title">Completa tu perfil</h1>
      <p class="subtitle">Necesitamos tus datos básicos para personalizar tu experiencia.</p>

      <ProfileForm mode="create" @onSave="handleProfileSaved" />
    </div>
  </div>
</template>

<script setup>
import ProfileForm from '@/components/ProfileForm.vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session.js'

const router = useRouter()
const session = useSessionStore()

const handleProfileSaved = () => {
  // Persistir flag profileExists y redirigir a home
  session.setSession(session.token, true)
  router.push({ name: 'home' })
}
</script>

<style scoped>
.onboarding-container {
  min-height: calc(100vh - 70px);
  display:flex;
  align-items:center;
  justify-content:center;
  background:#fafafa;
  padding:20px;
}
.onboarding-card {
  width:100%;
  max-width:560px;
  background:#fff;
  padding:32px;
  border-radius:12px;
  box-shadow:0 8px 30px rgba(0,0,0,0.06);
  border:1px solid #eee;
  text-align:left;
}
.title { font-size:26px; margin:0 0 8px 0; font-weight:700; }
.subtitle { color:#666; margin-bottom:18px; }
</style>