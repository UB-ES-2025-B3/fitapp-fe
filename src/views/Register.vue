<template>
    <div class="register-container">
        <div v-if="isSuccess" class="dialog-overlay">
          <p>¡Registro exitoso!</p>
        </div>
        <div class="register-card">
            <div class="card-header">
                <h1>Crear Cuenta</h1>
                <p class="subtitle">Únete a nosotros hoy</p>
            </div>

            <form @submit.prevent="handleSubmit" class="register-form">
                <!-- Email -->
                <div class="form-group">
                    <label for="email">Email</label>
                    <input
                        id="email"
                        v-model="formData.email"
                        type="email"
                        placeholder="ejemplo@email.com"
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
                        placeholder="Mínimo 8 caracteres"
                        @blur="validatePassword"
                        :class="{ 'input-error': errors.password }"
                    />
                    <span v-if="errors.password" class="error-message">
                        {{ errors.password }}
                    </span>
                </div>

                <!-- Confirm Password -->
                <div class="form-group">
                    <label for="confirmPassword">Confirmar Contraseña</label>
                    <input
                        id="confirmPassword"
                        v-model="formData.confirmPassword"
                        type="password"
                        placeholder="Repite tu contraseña"
                        @blur="validateConfirmPassword"
                        :class="{ 'input-error': errors.confirmPassword }"
                    />
                    <span v-if="errors.confirmPassword" class="error-message">
                        {{ errors.confirmPassword }}
                    </span>
                </div>

                <!-- Checkbox términos -->
                <div class="form-group checkbox-group">
                    <label class="checkbox-label">
                        <input
                            v-model="formData.acceptTerms"
                            type="checkbox"
                        />
                        <span>Acepto los <a href="#" class="link">términos y condiciones</a></span>
                    </label>
                </div>

                <!-- Estado de error general -->
                <div v-if="submitError" class="error-box">
                    {{ submitError }}
                </div>

                <!-- Botón submit -->
                <button
                    type="submit"
                    class="submit-btn"
                    :disabled="!isFormValid || isLoading"
                >
                    <span v-if="isLoading">Creando cuenta...</span>
                    <span v-else>Crear cuenta</span>
                </button>
            </form>

            <!-- Link a login -->
            <div class="login-link">
                ¿Ya tienes cuenta?
                <router-link to="/login" class="link-bold">Iniciar sesión</router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from "vue-router";
import { registerUser } from '@/services/authService.js'   // Ajusta la ruta según tu estructura
import { useSessionStore } from "@/stores/session.js";
const session = useSessionStore();
const router = useRouter();


// Estado reactivo del formulario
const formData = ref({
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

// Errores y estados UI
const errors = ref({
  email: '',
  password: '',
  confirmPassword: ''
})

// ESTADOS DE LA UI
const isLoading = ref(false)
const submitError = ref('')
const isSuccess = ref(false)

// Validaciones individuales (breves)
const validateEmail = () => {
  // Comprueba presencia y formato básico
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
  // Comprueba longitud mínima
  if (!formData.value.password) {
    errors.value.password = 'La contraseña es obligatoria'
    return false
  }

  if (formData.value.password.length < 8) {
    errors.value.password = 'Mínimo 8 caracteres'
    return false
  }

  errors.value.password = ''

  // Re-validar confirm si ya tiene valor
  if (formData.value.confirmPassword) {
    validateConfirmPassword()
  }

  return true
}

const validateConfirmPassword = () => {
  // Confirma que coincidan password y confirmPassword
  if (!formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Debes confirmar la contraseña'
    return false
  }

  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Las contraseñas no coinciden'
    return false
  }

  errors.value.confirmPassword = ''
  return true
}

// Computed para permitir botón submit
const isFormValid = computed(() => {
  // Todos los campos deben estar llenos
  const allFieldsFilled =
    formData.value.email &&
    formData.value.password &&
    formData.value.confirmPassword &&
    formData.value.acceptTerms

  // No debe haber errores
  const noErrors =
    !errors.value.email &&
    !errors.value.password &&
    !errors.value.confirmPassword

  // Passwords deben coincidir
  const passwordsMatch =
    formData.value.password === formData.value.confirmPassword

  return allFieldsFilled && noErrors && passwordsMatch
})

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const mostrarYOcultarDialog = async () => {

    isSuccess.value = true;
    await delay(1000);
    isSuccess.value = false;
};

// Manejo del submit:
// 1) validar campos
// 2) llamar registerUser en el backend
// 3) normalizar campo profileExists que pueda venir en la respuesta
// 4) persistir token + profileExists en el store (session.setSession)
// 5) redirigir según profileExists (onboarding o home)
const handleSubmit = async () => {
  // Validar todo antes de enviar
  const emailValid = validateEmail()
  const passwordValid = validatePassword()
  const confirmValid = validateConfirmPassword()

  if (!emailValid || !passwordValid || !confirmValid) {
    return
  }

  // Simular llamada a API
  isLoading.value = true
  submitError.value = ''

  try {

    // Llamada real al backend
    const payload = {
      email: formData.value.email,
      password: formData.value.password,
    }

    const response = await registerUser(payload)

    // Normalizar campo que puede venir como profileExists o profileComplete
    const profileComplete = response.profileExists ?? response.profileComplete ?? false
    const token = response.token ?? response.accessToken ?? null

    if (!token) {
      throw new Error('Respuesta inválida del servidor: falta token')
    }

    await mostrarYOcultarDialog()

    // Guardar token y estado de perfil en el store
    session.setSession(token, profileComplete)

    // Redirigir según el estado del perfil
    // Si esta registrado y no tiene perfil completo, va a onboarding
    // Si tiene perfil completo, va al home/
    if (profileComplete) {
      await router.push({ name: 'home' })
    } else {
      await router.push({ name: 'OnboardingProfile' })
    }

    console.log('Usuario creado:', response)

  } catch (error) {
    // ERROR
    submitError.value = error.response?.data?.message || 'Error al crear la cuenta.'
    console.error('Register error', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.register-container {
  position:relative;
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

input[type="email"]::placeholder,
input[type="password"]::placeholder {
  color: #999999;
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

.checkbox-group {
  margin: 4px 0;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  font-weight: normal;
  font-size: 14px;
  color: #666666;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin-top: 2px;
  accent-color: #000000;
}

.link {
  color: #000000;
  text-decoration: none;
  font-weight: 600;
  border-bottom: 1px solid #000000;
  transition: opacity 0.2s;
}

.link:hover {
  opacity: 0.7;
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
  letter-spacing: -0.2px;
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
  transform: none;
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
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
}
</style>
