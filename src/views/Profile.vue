<template>
  <div class="profile-page">
    <div class="profile-grid">
      <section class="card profile-card">
        <header class="card-header">
          <h2>Mi Perfil</h2>
          <p class="muted">Edita tu información personal</p>
        </header>

        <form @submit.prevent="saveProfile" class="form" novalidate>
          <div class="row">
            <label class="field">
              <span>Nombre</span>
              <input v-model="form.firstName" type="text" placeholder="Nombre" />
              <small v-if="errors.firstName" class="error">{{ errors.firstName }}</small>
            </label>

            <label class="field">
              <span>Apellido</span>
              <input v-model="form.lastName" type="text" placeholder="Apellido" />
              <small v-if="errors.lastName" class="error">{{ errors.lastName }}</small>
            </label>
          </div>

          <div class="row">
            <label class="field">
              <span>Fecha de nacimiento</span>
              <input v-model="form.birthDate" type="date" />
              <small v-if="errors.birthDate" class="error">{{ errors.birthDate }}</small>
            </label>

            <label class="field">
              <span>Género</span>
              <select v-model="form.gender">
                <option value="" disabled>Selecciona uno...</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
              </select>
              <small v-if="errors.gender" class="error">{{ errors.gender }}</small>
            </label>
          </div>

          <label class="field">
            <span>Zona Horaria (detectada)</span>
            <input v-model="form.timezone" type="text" readonly disabled />
            <small v-if="errors.timezone" class="error">{{ errors.timezone }}</small>
          </label>


          <div class="row">
            <label class="field">
              <span>Altura (cm)</span>
              <input v-model.number="form.heightCm" type="number" min="50" max="250" step="0.1" />
              <small v-if="errors.heightCm" class="error">{{ errors.heightCm }}</small>
            </label>

            <label class="field">
              <span>Peso (kg)</span>
              <input v-model.number="form.weightKg" type="number" min="30" max="300" step="0.1" />
              <small v-if="errors.weightKg" class="error">{{ errors.weightKg }}</small>
            </label>
          </div>

          <label class="field">
            <span>Objetivo Kcal Diarias</span>
            <input id="goalKcal" v-model.number="form.goalKcalDaily" type="number" min="0" step="1" placeholder="Ej. 2000" />
            <small v-if="errors.goalKcalDaily" class="error">{{ errors.goalKcalDaily }}</small>
          </label>

          <div class="actions">
            <button type="submit" class="btn" :disabled="saving">
              <span v-if="saving">Guardando...</span>
              <span v-else>Guardar cambios</span>
            </button>

            <button type="button" class="btn ghost" @click="resetToLoaded" :disabled="saving">
              Cancelar
            </button>
          </div>
        </form>
      </section>

      <section class="card points-card">
        <header class="card-header">
          <h2>Mis Puntos</h2>
          <p class="muted">Total acumulado</p>
        </header>

        <div class="card-body">
          <template v-if="pointsLoading">
            <div class="kpi-skel">Cargando puntos...</div>
          </template>

          <template v-else-if="pointsError">
            <div class="points-error">Error: {{ pointsError }}</div>
          </template>

          <template v-else>
            <KpiCard icon="⭐" :value="points === null ? 0 : points" title="Mis Puntos" subtitle="Total acumulado" color="#F59E0B" />
          </template>
        </div>
      </section>

      <section class="card password-card">
        <header class="card-header">
          <h2>Cambiar contraseña</h2>
          <p class="muted">Actualiza tu contraseña de acceso</p>
        </header>

        <form @submit.prevent="changePassword" class="form" novalidate>
          <label class="field">
            <span>Contraseña actual</span>
            <input v-model="pwd.current" type="password" />
            <small v-if="pwdErrors.current" class="error">{{ pwdErrors.current }}</small>
          </label>

          <label class="field">
            <span>Nueva contraseña</span>
            <input v-model="pwd.new" type="password" />
            <small v-if="pwdErrors.new" class="error">{{ pwdErrors.new }}</small>
          </label>

          <label class="field">
            <span>Confirmar nueva</span>
            <input v-model="pwd.confirm" type="password" />
            <small v-if="pwdErrors.confirm" class="error">{{ pwdErrors.confirm }}</small>
          </label>

          <small v-if="pwdErrors.server" class="error">{{ pwdErrors.server }}</small>

          <div class="actions">
            <button type="submit" class="btn" :disabled="changingPwd">
              <span v-if="changingPwd">Procesando...</span>
              <span v-else>Cambiar contraseña</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick} from "vue";
import { useSessionStore } from "@/stores/session.js";
import { getProfile, updateProfile, updatePassword } from "@/services/authService.js";
import KpiCard from '@/components/KpiCard.vue'
import { useRouter, useRoute } from "vue-router";

const route = useRoute()

let session
try {
  session = useSessionStore()
} catch {
  // En entornos de test sin Pinia activo, mock ligero para evitar excepciones
  session = { token: null, profileExists: false, setSession: () => {}, clearSession: () => {} }
}

let _router
try {
  _router = useRouter()
} catch {
  // Router puede no estar registrado en tests unitarios; fallback mínimo
  _router = { push: () => {} }
}

// Zona horaria local por defecto (fallback cuando la API no devuelva timezone)
const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''

// UI states
const loading = ref(false);
const saving = ref(false);
const changingPwd = ref(false);
// --- Estados para la tarjeta Mis Puntos ---
// Almacena el valor de puntos del usuario
const points = ref(null)
// Flag de carga: por defecto true para mostrar el skeleton al montar
const pointsLoading = ref(true)
// Mensaje de error si falla la carga de puntos
const pointsError = ref(null)

// Guardar datos leídos del servidor para poder resetear el formulario
const loaded = ref(null);

// Form model (mapea la shape de la API: firstName,lastName,birthDate,heightCm,weightKg,goalKcalDaily)
const form = ref({
  firstName: "",
  lastName: "",
  birthDate: "", // yyyy-mm-dd
  gender: "",
  timezone: "",
  heightCm: null,
  weightKg: null,
  // Nuevo campo: objetivo de calorías diarias (puede ser null si no está definido)
  goalKcalDaily: null,
});

const errors = ref({
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: "",
  timezone: "",
  heightCm: "",
  weightKg: "",
  goalKcalDaily: ""
});

// Campos UI para cambiar contraseña (solo UI, sin API aún)
const pwd = ref({
  current: "",
  new: "",
  confirm: "",
});

const pwdErrors = ref({
  current: "",
  new: "",
  confirm: "",
  server: ""
});


// Carga inicial del perfil:
//  - llama GET /profiles/me
//  - si 200: setea datos y marca profileExists = true en el store
//  - si 404: marca profileExists = false (no existe perfil aún)
//  - otros errores se loguean
const loadProfile = async () => {
  loading.value = true;
  pointsLoading.value = true
  try {
    const data = await getProfile();
    loaded.value = {
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      birthDate: data.birthDate ?? "",
      gender: data.gender ? data.gender.toLowerCase() : "",
      timezone: data.timeZone ?? data.timezone ?? localTimezone,
      heightCm: data.heightCm ?? null,
      weightKg: data.weightKg ?? null,
      goalKcalDaily: data.goalKcalDaily ?? data.goalKcal ?? data.goal ?? null,
    };
    Object.assign(form.value, { ...loaded.value });

    // Extraer puntos (campo flexible según backend)
    const resolvedPoints = data.points ?? data.pointsTotal ?? data.totalPoints ?? data.total_points ?? 0
    points.value = typeof resolvedPoints === 'number' ? resolvedPoints : Number(resolvedPoints) || 0
    pointsError.value = null

    // Backend devolvió perfil -> persistir flag en el store
    session.setSession(session.token, true);
  } catch (err) {
    const status = err.response?.status ?? err.status;
    if (status === 404) {
      // No hay perfil: marcar en el store para que los guards redirijan a onboarding
      session.setSession(session.token, false);
      loaded.value = null;
      // Si no hay perfil, mostrar 0 puntos por defecto
      points.value = 0
      pointsError.value = null
    } else {
      console.error("Error cargando perfil", err);
      points.value = null
      pointsError.value = err.response?.data?.message || err.message || 'Error cargando puntos'
    }
  } finally {
    loading.value = false;
    pointsLoading.value = false
  }
};

onMounted(async () => {
  await loadProfile();
  if (route.query.focus === 'goal') {
    await nextTick()
    const el = document.getElementById('goalKcal')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.focus()
    }
  }
});

// Validación local del formulario antes de enviar PUT
const validateProfile = () => {
  let ok = true;
  errors.value = {
    firstName: "", lastName: "", birthDate: "",
    gender: "", timezone: "",
    heightCm: "", weightKg: "",
  };

  if (!form.value.firstName || !form.value.firstName.trim()) {
    errors.value.firstName = "El nombre es obligatorio.";
    ok = false;
  }
  if (!form.value.lastName || !form.value.lastName.trim()) {
    errors.value.lastName = "El apellido es obligatorio.";
    ok = false;
  }
  // Añadir validación de Género y Zona Horaria -->
  if (!form.value.gender) {
    errors.value.gender = 'El género es obligatorio.'
    ok = false
  }
  if (!form.value.timezone) {
    errors.value.timezone = 'La zona horaria es obligatoria.'
    ok = false
  }

  if (!form.value.birthDate) {
    errors.value.birthDate = "La fecha de nacimiento es obligatoria.";
    ok = false;
  } else {
    // Comprobar edad mínima (10 años)
    const birth = new Date(form.value.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (isNaN(age) || age < 10) {
      errors.value.birthDate = "Debes tener al menos 10 años.";
      ok = false;
    }
  }

  if (form.value.heightCm == null || form.value.heightCm < 50 || form.value.heightCm > 250) {
    errors.value.heightCm = "Altura entre 50 y 250 cm.";
    ok = false;
  }

  if (form.value.weightKg == null || form.value.weightKg < 30 || form.value.weightKg > 300) {
    errors.value.weightKg = "Peso entre 30 y 300 kg.";
    ok = false;
  }

  // goalKcalDaily: puede ser 0 o null; si viene, debe ser >= 0
  if (form.value.goalKcalDaily != null && form.value.goalKcalDaily !== '') {
    const v = Number(form.value.goalKcalDaily)
    if (isNaN(v) || v < 0) {
      errors.value.goalKcalDaily = 'Objetivo de Kcal debe ser >= 0.'
      ok = false
    }
  }

  return ok;
};

// Guardar cambios del perfil:
//  - validar localmente
//  - llamar PUT /profiles/me (updateProfile)
//  - persistir profileExists = true en el store
//  - actualizar el modelo local con la respuesta si viene
const saveProfile = async () => {
  if (!validateProfile()) return;
  saving.value = true;
  try {
    const payload = {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      birthDate: form.value.birthDate,
      gender: form.value.gender.toUpperCase(),
      timeZone: form.value.timezone,
      heightCm: Number(form.value.heightCm),
        weightKg: Number(form.value.weightKg),
        goalKcalDaily: form.value.goalKcalDaily == null || form.value.goalKcalDaily === '' ? null : Number(form.value.goalKcalDaily),
    };

    const saved = await updateProfile(payload);

    // Asegurar que el store refleje que el perfil existe
    session.setSession(session.token, true);

    // Actualizar modelo con la respuesta del backend (si aplica)
    loaded.value = {
      firstName: saved.firstName ?? payload.firstName,
      lastName: saved.lastName ?? payload.lastName,
      birthDate: saved.birthDate ?? payload.birthDate,
      gender: saved.gender ? saved.gender.toLowerCase() : payload.gender.toLowerCase(),
      timeZone: saved.timeZone ?? payload.timeZone,
      heightCm: saved.heightCm ?? payload.heightCm,
      weightKg: saved.weightKg ?? payload.weightKg,
      goalKcalDaily: saved.goalKcalDaily ?? payload.goalKcalDaily ?? null,
    };
    Object.assign(form.value, { ...loaded.value });

    alert("Perfil guardado correctamente.");
  } catch (err) {
    console.error("Error guardando perfil", err);
    alert(err.response?.data?.message || err.message || "Error al guardar perfil.");
  } finally {
    saving.value = false;
  }
};

// Resetear formulario a los valores cargados del servidor
const resetToLoaded = () => {
  if (loaded.value) Object.assign(form.value, { ...loaded.value });
  errors.value = {
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "",
    timezone: "",
    heightCm: "",
    weightKg: "",
    goalKcalDaily: "",
  };
};

// Validación de la UI de cambio de contraseña (solo diseño por ahora)
const validatePwd = () => {
  pwdErrors.value = { current: "", new: "", confirm: "" };
  let ok = true;
  if (!pwd.value.current) {
    pwdErrors.value.current = "Contraseña actual requerida.";
    ok = false;
  }
  if (!pwd.value.new || pwd.value.new.length < 8) {
    pwdErrors.value.new = "Mínimo 8 caracteres.";
    ok = false;
  }
  if (pwd.value.new !== pwd.value.confirm) {
    pwdErrors.value.confirm = "Las contraseñas no coinciden.";
    ok = false;
  }
  return ok;
};

// Cambio de contraseña: no hay API aún, se simula el flujo UI
const changePassword = async () => {
  if (!validatePwd()) return; // Validar contraseñas antes de enviar
  changingPwd.value = true;
  pwdErrors.value.server = ""; // Limpiar error anterior

  try {
    // Enviar solicitud al backend
    await updatePassword(
      pwd.value.current,
      pwd.value.new,
      pwd.value.confirm
    );

    // Limpiar campos y mostrar mensaje de éxito
    pwd.value.current = "";
    pwd.value.new = "";
    pwd.value.confirm = "";
    pwdErrors.value = { current: "", new: "", confirm: "", server: "" };
    alert("Contraseña cambiada exitosamente.");
  } catch (err) {
    // Manejar errores del backend y mostrarlos en el DOM
    const errorMessage = err.response?.data?.message || err.message || "Error al cambiar la contraseña.";
    pwdErrors.value.server = errorMessage;
    console.error("Error al cambiar la contraseña:", err);
  } finally {
    changingPwd.value = false;
  }
};
</script>

<style scoped>
.profile-page {
  padding: 28px 20px;
  min-height: calc(100vh - 70px);
  display: flex;
  justify-content: center;
  background: #fafafa;
}
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  width: 100%;
  max-width: 1100px;
}
.card {
  background: #fff;
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 8px 30px rgba(12, 12, 12, 0.06);
  border: 1px solid #eee;
}
.card-header h2 { margin: 0; font-size: 20px; }
.muted { margin: 6px 0 0; color: #666; font-size: 13px; }
.form { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.row { display: flex; gap: 12px; }
.row .field { flex: 1; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field span { font-weight: 600; color: #111; font-size: 14px; }

/* Añadido 'select' a la regla */
.field input, .field select {
  padding: 12px 14px;
  border: 1.5px solid #e6e6e6;
  border-radius: 10px;
  font-size: 15px;
  background: #fff;
  font-family: inherit;
}

/* Styles para tarjeta de puntos */
.points-card .card-body { margin-top: 12px; }
.kpi-skel {
  height: 76px;
  background: linear-gradient(90deg,#f3f4f6,#efefef,#f3f4f6);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}
.points-error {
  color: #b91c1c;
  background: #fff7f7;
  border: 1px solid #fee2e2;
  padding: 10px;
  border-radius: 8px;
}
.field input:focus, .field select:focus {
  outline: none;
  border-color: #000;
  background: #fbfbfb;
}

/* Añadido estilo para input deshabilitado */
.field input:disabled {
  background: #f4f4f4;
  color: #777;
  cursor: not-allowed;
}

.error { color: #c53030; font-size: 13px; margin-top: 4px; }
.actions { display: flex; gap: 10px; margin-top: 6px; }
.btn {
  padding: 12px 16px;
  border-radius: 10px;
  background: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  font-weight: 700;
  transition: 1s;
}
.btn:hover{
  background: #333;
  transform: translateY(-1px);
}
.btn.ghost {
  background: transparent;
  color: #333;
  border: 1px solid #e6e6e6;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.password-card {
  grid-column: 2; /* Fuerza a ocupar la segunda columna */
}

@media (max-width: 920px) {
  .profile-grid { grid-template-columns: 1fr; }
  .password-card { grid-column: auto; } /* Reset en móvil */
}

@media (max-width: 920px) {
  .profile-grid { grid-template-columns: 1fr; }
  /* Añadida regla responsive para apilar filas */
  .row { flex-direction: column; }
}
</style>
