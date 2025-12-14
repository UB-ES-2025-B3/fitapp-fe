<template>
  <div class="onboarding-container">
    <div v-if="isSuccess" class="dialog-overlay">
      <p>¡Perfil creado!</p>
    </div>
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
import { ref } from 'vue'

const router = useRouter()
const session = useSessionStore()
const isSuccess = ref(false)

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const mostrarYOcultarDialog = async () => {

    isSuccess.value = true;
    await delay(1000);
    isSuccess.value = false;
};

const handleProfileSaved = async () => {
  // Persistir flag profileExists y redirigir a home
  await mostrarYOcultarDialog()
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

.dialog-overlay {
  position: fixed; /* Fija la posición en la ventana */
  top: 20px;
  left: auto;
  right: auto;
  height: auto;
  z-index: 1000; /* Asegura que esté por encima de otros elementos */
  background: #dbffdc;
  box-shadow: 0 0 10px rgba(36, 228, 3, 0.8);
  color: black;
  font-weight:normal;
  padding: 10px;
  border-radius: 8px;
  max-width: 200px;
  width: 90%;
  text-align: center;
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
