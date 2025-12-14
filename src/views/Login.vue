<template>
  <div class="register-container">
    <div v-if="isSuccess" class="dialog-overlay">
      <p>¡Inicio de sesión correcto!</p>
    </div>
    <div class="register-card">
      <div class="card-header">
        <h1>Iniciar Sesión</h1>
        <p class="subtitle">Bienvenido de nuevo</p>

        <!-- Logo de la aplicación -->
        <img
          src="../../public/logo_secundario.webp"
          alt="Logo de la aplicación"
          class="app-logo"
        />
      </div>

      <form @submit.prevent="handleSubmit" class="register-form">
        <!-- Email -->
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            placeholder="tuemail@ejemplo.com"
            @blur="validateEmail"
            :class="{ 'input-error': errors.email }"
          />
          <span v-if="errors.email" class="error-message">
            {{ errors.email }}
          </span>
        </div>

        <!-- Password -->
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="formData.password"
            type="password"
            placeholder="Tu contraseña"
            @blur="validatePassword"
            :class="{ 'input-error': errors.password }"
          />
          <span v-if="errors.password" class="error-message">
            {{ errors.password }}
          </span>
        </div>

        <!-- Error general -->
        <div v-if="submitError" class="error-box">
          {{ submitError }}
        </div>

        <!-- Botón submit -->
        <button
          type="submit"
          class="submit-btn"
          :disabled="!isFormValid || isLoading"
        >
          <span v-if="isLoading">Ingresando...</span>
          <span v-else>Iniciar sesión</span>
        </button>
      </form>

      <!-- Link a registro -->
      <div class="login-link">
        ¿No tienes cuenta?
        <router-link to="/register" class="link-bold">Crear una cuenta</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from "vue-router";
import { loginUser } from '@/services/authService.js' // Ajusta la ruta según tu estructura
import { useSessionStore } from "@/stores/session.js";
const session = useSessionStore();
const router = useRouter();

// Form state
const formData = ref({
  email: '',
  password: ''
})

const errors = ref({
  email: '',
  password: ''
})

const isLoading = ref(false)
const submitError = ref('')

// Validaciones
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!formData.value.email) {
    errors.value.email = 'El email es obligatorio'
    return false
  }

  if (!emailRegex.test(formData.value.email)) {
    errors.value.email = 'Email no válido'
    return false
  }

  errors.value.email = ''
  return true
}

const validatePassword = () => {
  if (!formData.value.password) {
    errors.value.password = 'La contraseña es obligatoria'
    return false
  }

  if (formData.value.password.length < 8) {
    errors.value.password = 'Debe tener al menos 8 caracteres'
    return false
  }

  errors.value.password = ''
  return true
}

const isFormValid = computed(() => {
  return (
    formData.value.email &&
    formData.value.password &&
    !errors.value.email &&
    !errors.value.password
  )
})

const isSuccess = ref(false);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const mostrarYOcultarDialog = async () => {

    isSuccess.value = true;
    await delay(1000);
    isSuccess.value = false;
};

// handleSubmit:
// 1) validar campos
// 2) llamar loginUser -> obtener token (y, si viene, flag profileExists/profileComplete)
// 3) persistir token + profileExists en el store y redirigir según ese valor
const handleSubmit = async () => {
  const emailValid = validateEmail()
  const passwordValid = validatePassword()
  if (!emailValid || !passwordValid) return

  isLoading.value = true
  submitError.value = ''

  try {
    // Simular llamada a API
    const response = await loginUser({
      email: formData.value.email,
      password: formData.value.password
    });

    // Normalizar nombre del campo que indica perfil completo
    const profileComplete = response.profileExists ?? response.profileComplete ?? false
    const token = response.token ?? response.accessToken ?? null

    if (!token) {
      throw new Error('Respuesta inválida del servidor: falta token')
    }

    await mostrarYOcultarDialog()

    // Guardar token y estado de perfil en el store (y localStorage via action)
    session.setSession(token, profileComplete)

    // Redirigir según estado del perfil
    if (profileComplete) {
      await router.push({ name: 'home' })
    } else {
      await router.push({ name: 'OnboardingProfile' })
    }

  } catch (error) {
    // Error en el submit
    console.error("Error al iniciar sesión:", error);
    submitError.value = error.response?.data?.message || "Credenciales incorrectas.";
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Estilos reutilizados */
.register-container {
  min-height: calc(100vh - 70px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  padding: 40px 20px;
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

.register-card {
  background: #ffffff;
  padding: 48px 40px;
  border-radius: 16px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  width: 100%;
  max-width: 440px;
}

.card-header {
  margin-bottom: 32px;
  text-align: center;
}

h1 {
  margin: 0 0 8px 0;
  color: #000000;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.8px;
}

.subtitle {
  color: #666666;
  font-size: 16px;
  margin: 0;
  font-weight: 400;
}

/* 🖼️ Logo */
.app-logo {
  width: 200px;
  height: 200px;
  /*margin: 20px auto 0; */
  margin-top : 20px;
  margin-bottom : 20px;
  margin-left : auto;
  margin-right : auto;

  display: block;
  opacity: 0.9;
  transition: opacity 0.2s ease;
}



.app-logo:hover {
  opacity: 1;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-weight: 600;
  color: #000000;
  font-size: 14px;
  letter-spacing: -0.2px;
}

input[type="email"],
input[type="password"] {
  padding: 14px 16px;
  border: 1.5px solid #e5e5e5;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s ease;
  background: #ffffff;
  color: #000000;
  font-family: inherit;
}

input[type="email"]:focus,
input[type="password"]:focus {
  outline: none;
  border-color: #000000;
  background: #fafafa;
}

.input-error {
  border-color: #dc2626 !important;
  background: #fef2f2 !important;
}

.error-message {
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
}

.error-box {
  background: #fef2f2;
  color: #dc2626;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid #fecaca;
  font-size: 14px;
  font-weight: 500;
}

.submit-btn {
  padding: 16px;
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.submit-btn:hover:not(:disabled) {
  background: #333333;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.submit-btn:disabled {
  background: #e5e5e5;
  color: #999999;
  cursor: not-allowed;
}

.login-link {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  color: #666666;
  font-size: 14px;
}

.link-bold {
  color: #000000;
  text-decoration: none;
  font-weight: 600;
  margin-left: 4px;
  transition: opacity 0.2s;
}

.link-bold:hover {
  opacity: 0.7;
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 480px) {
  .register-card {
    padding: 32px 24px;
  }

  h1 {
    font-size: 28px;
  }

  .app-logo {
    width: 80px;
  }
}
</style>
