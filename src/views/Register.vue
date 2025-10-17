<template>
    <div class="register-container">
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


// ESTADO DEL FORMULARIO (datos reactivos)
const formData = ref({
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

// ERRORES DE VALIDACIÓN
const errors = ref({
  email: '',
  password: '',
  confirmPassword: ''
})

// ESTADOS DE LA UI
const isLoading = ref(false)
const submitError = ref('')

// VALIDACIONES INDIVIDUALES
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
 
  if (formData.value.password.length < 6) {
    errors.value.password = 'Mínimo 6 caracteres'
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

// COMPUTED: Validez del formulario completo
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

// SUBMIT DEL FORMULARIO
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
    session.setSession(response.token, response.profileExists);
    console.log(session.token)
    router.push("/OnboardingProfile");

    alert('¡Registro exitoso!')
    console.log('Usuario creado:', response)

    // Opcional: redirigir al login / O MEJOR REDIRIGIR AL PROFILE, PERO YA LO DECIDIRÉ. 
    // router.push('/login')
   
  } catch (error) {
    // ERROR
    console.error('Error al registrar:', error)
    submitError.value = error.response?.data?.message || 'Error al crear la cuenta.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: calc(100vh - 70px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  padding: 40px 20px;
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