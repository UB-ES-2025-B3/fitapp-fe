<template>
  <div class="profile-container">
    <div class="profile-card">
      <h2 class="title">{{ mode === 'create' ? 'Crear perfil' : 'Datos de perfil' }}</h2>
      <p class="subtitle" v-if="mode === 'create'">Completa tu información para personalizar la app</p>

      <form @submit.prevent="handleSubmit" novalidate>
        <div class="form-group">
          <label for="firstName">Nombre</label>
          <input id="firstName" v-model="form.firstName" type="text" placeholder="Pedro" />
          <span v-if="errors.firstName" class="error">{{ errors.firstName }}</span>
        </div>

        <div class="form-group">
          <label for="lastName">Apellido</label>
          <input id="lastName" v-model="form.lastName" type="text" placeholder="González" />
          <span v-if="errors.lastName" class="error">{{ errors.lastName }}</span>
        </div>

        <div class="form-group">
          <label for="birthDate">Fecha de nacimiento</label>
          <input id="birthDate" v-model="form.birthDate" type="date" />
          <span v-if="errors.birthDate" class="error">{{ errors.birthDate }}</span>
        </div>

        <div class="form-group">
          <label for="gender">Género</label>
          <select id="gender" v-model="form.gender">
            <option value="" disabled>Selecciona uno...</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
          </select>
          <span v-if="errors.gender" class="error">{{ errors.gender }}</span>
        </div>

        <div class="form-group">
          <label for="timezone">Zona Horaria (detectada)</label>
          <input id="timezone" v-model="form.timezone" type="text" readonly disabled />
          <span v-if="errors.timezone" class="error">{{ errors.timezone }}</span>
        </div>

        <div class="form-group">
          <label for="height">Altura (cm)</label>
          <input id="height" v-model.number="form.heightCm" type="number" min="50" max="250" step="0.1" />
          <span v-if="errors.heightCm" class="error">{{ errors.heightCm }}</span>
        </div>

        <div class="form-group">
          <label for="weight">Peso (kg)</label>
          <input id="weight" v-model.number="form.weightKg" type="number" min="30" max="300" step="0.1" />
          <span v-if="errors.weightKg" class="error">{{ errors.weightKg }}</span>
        </div>

        <button class="submit-btn" :disabled="isSaving">
          <span v-if="isSaving">{{ mode === 'create' ? 'Creando...' : 'Guardando...' }}</span>
          <span v-else>{{ mode === 'create' ? 'Crear perfil' : 'Guardar perfil' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { createProfile, updateProfile } from '@/services/authService.js'


// - initial: datos iniciales del perfil (cuando editamos o precargamos)
// - mode: 'create' para crear o 'edit' para actualizar
const props = defineProps({
  initial: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'edit' } // "create" | "edit"
})

// Emit para notificar al padre que se guardó correctamente
const emit = defineEmits(['onSave'])

// Estado reactivo del formulario
const form = ref({
  firstName: '',
  lastName: '',
  birthDate: '', // yyyy-mm-dd
  gender: '', 
  timezone: '', 
  heightCm: null,
  weightKg: null
})

// Mensajes de error por campo
const errors = ref({
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: '', 
  timezone: '',
  heightCm: '',
  weightKg: ''
})

// Flag de guardado (para deshabilitar botón y mostrar loading)
const isSaving = ref(false)

// Rellena el formulario a partir del objeto fuente (props.initial)
// Acepta alias comunes por compatibilidad (name/height/weight)
const fillFromInitial = (src) => {
  form.value.firstName = src.firstName ?? src.name ?? ''
  form.value.lastName = src.lastName ?? ''
  form.value.birthDate = src.birthDate ?? ''
  form.value.gender = src.gender ?? '' 
  form.value.timezone = src.timeZone ?? src.timezone ?? ''
  form.value.heightCm = src.heightCm ?? src.height ?? null
  form.value.weightKg = src.weightKg ?? src.weight ?? null
}

// Función para autodetectar Zona Horaria 
const autoFillTimezone = () => {
  if (!form.value.timezone) { // Solo si no tiene ya un valor
    try {
      form.value.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      console.warn("No se pudo detectar la zona horaria.", e);
      form.value.timezone = "UTC"; // Fallback
    }
  }
}

// Al montar, si llegan datos iniciales, pre-rellenamos el formulario
onMounted(() => {
  if (props.initial && Object.keys(props.initial).length) {
    fillFromInitial(props.initial)
  }

  autoFillTimezone();
})

// Si cambian las props.initial desde fuera, sincronizamos el formulario
watch(() => props.initial, (v) => {
  if (v) {
    fillFromInitial(v)
    autoFillTimezone(); 
  }
})

// Validación de campos del formulario
const validate = () => {
  let ok = true
  // Reset de errores antes de validar
  errors.value = { 
    firstName: '', lastName: '', birthDate: '', 
    gender: '', timezone: '', heightCm: '', weightKg: '' 
  }

  // Nombre requerido
  if (!form.value.firstName || !form.value.firstName.trim()) {
    errors.value.firstName = 'El nombre es obligatorio.'
    ok = false
  } else if (form.value.firstName.length > 100) {
    errors.value.firstName = 'El nombre es muy largo.'
    ok = false
  }

  // Apellido requerido
  if (!form.value.lastName || !form.value.lastName.trim()) {
    errors.value.lastName = 'El apellido es obligatorio.'
    ok = false
  } else if (form.value.lastName.length > 100) {
    errors.value.lastName = 'El apellido es muy largo.'
    ok = false
  }

  // Fecha de nacimiento: requerida, válida y mayor de 10 años
  if (!form.value.birthDate) {
    errors.value.birthDate = 'La fecha de nacimiento es obligatoria.'
    ok = false
  } else {
    const birth = new Date(form.value.birthDate)
    if (isNaN(birth.getTime())) {
      errors.value.birthDate = 'Fecha no válida.'
      ok = false
    } else {
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
      if (age < 10) {
        errors.value.birthDate = 'Debes tener al menos 10 años.'
        ok = false
      }
    }
  }

  //  Añadir validación de Género y Zona Horaria -->
  if (!form.value.gender) {
    errors.value.gender = 'El género es obligatorio.'
    ok = false
  }

  if (!form.value.timezone) {
    errors.value.timezone = 'La zona horaria es obligatoria.'
    ok = false
  }

  // Rango de altura permitido
  if (form.value.heightCm == null || form.value.heightCm < 50 || form.value.heightCm > 250) {
    errors.value.heightCm = 'Altura entre 50 y 250 cm.'
    ok = false
  }

  // Rango de peso permitido
  if (form.value.weightKg == null || form.value.weightKg < 30 || form.value.weightKg > 300) {
    errors.value.weightKg = 'Peso entre 30 y 300 kg.'
    ok = false
  }

  return ok
}

// Handler de envío: valida, decide create vs edit, llama al servicio y emite resultado
const handleSubmit = async () => {
  if (!validate()) return
  isSaving.value = true
  try {

    // Normaliza tipos numéricos antes de enviar al backend
    const payload = {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      birthDate: form.value.birthDate,
      gender: form.value.gender.toUpperCase(),
      timeZone: form.value.timezone,
      heightCm: Number(form.value.heightCm),
      weightKg: Number(form.value.weightKg)
    }

    // Llama al endpoint adecuado según el modo
    let saved
    if (props.mode === 'create') {
      saved = await createProfile(payload)
    } else {
      saved = await updateProfile(payload)
    }

    // Feedback básico y notificar al padre con los datos guardados
    alert('Perfil guardado correctamente.')
    emit('onSave', saved)
  } catch (err) {
    console.error('ProfileForm error', err)
    alert(err.response?.data?.message || err.message || 'Error al guardar perfil')
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.profile-container {
  min-height: calc(100vh - 70px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  padding: 24px;
}
.profile-card {
  background: #fff;
  padding: 28px;
  border-radius: 12px;
  border: 1px solid #eaeaea;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.04);
}
.title { font-size: 22px; margin-bottom: 6px; font-weight: 700; }
.subtitle { color: #666; margin-bottom: 16px; }

.form-group { display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
label { font-weight:600; color:#111; }

/* Añadido 'select' a la regla */
input, select { 
  padding:10px 12px; 
  border:1.5px solid #e6e6e6; 
  border-radius:8px; 
  font-size:14px; 
  font-family: inherit; /* Asegura que el select use la misma fuente */
  background: #fff; /* Asegura fondo blanco para select en iOS */
}
input:focus, select:focus { 
  outline:none; 
  border-color:#000; 
  background:#fbfbfb; 
}

/* Añadido estilo para input deshabilitado */
input:disabled {
  background: #f4f4f4;
  color: #777;
  cursor: not-allowed;
}

.error { color:#c53030; font-size:13px; margin-top:6px; }

.submit-btn {
  width:100%;
  padding:12px;
  border-radius:10px;
  border:none;
  background:#000;
  color:#fff;
  font-weight:700;
  cursor:pointer;
}
.submit-btn:disabled { opacity:0.7; cursor:not-allowed; }
</style>
