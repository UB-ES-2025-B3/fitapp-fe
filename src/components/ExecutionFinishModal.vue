<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-card">
      <header class="modal-header">
        <h2>Finalizar Ruta</h2>
        <button class="close-btn" @click="$emit('cancel')">&times;</button>
      </header>
      
      <div class="modal-body">
        
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Duración</span>
            <span class="value">{{ formattedTime }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Distancia</span>
            <span class="value">{{ distanceKm.toFixed(2) }} km</span>
          </div>
          <div class="summary-item">
            <span class="label">Calorías</span>
            <span class="value">Se calcularán al guardar</span>
          </div>
        </div>
        
        <form @submit.prevent="onSave">
          <div class="form-group">
            <label for="activityType">Tipo de Actividad <span class="required">*</span></label>
            <select id="activityType" v-model="activityType" required>
              <option value="" disabled>Selecciona una...</option>
              <option value="WALKING_SLOW">Caminata (Lenta)</option>
              <option value="WALKING_MODERATE">Caminata (Moderada)</option>
              <option value="WALKING_INTENSE">Caminata (Intensa)</option>
              <option value="RUNNING_SLOW">Carrera (Lenta)</option>
              <option value="RUNNING_MODERATE">Carrera (Moderada)</option>
              <option value="RUNNING_INTENSE">Carrera (Intensa)</option>
              <option value="CYCLING_SLOW">Ciclismo (Lento)</option>
              <option value="CYCLING_MODERATE">Ciclismo (Moderado)</option>
              <option value="CYCLING_INTENSE">Ciclismo (Intenso)</option>
            </select>
            <small v-if="error" class="error-msg">{{ error }}</small>
          </div>

          <div class="form-group">
            <label for="notes">Notas (Opcional)</label>
            <textarea id="notes" v-model="notes" rows="3" placeholder="¿Cómo te sentiste?"></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isFinishing">
              <span v-if="isFinishing">Guardando...</span>
              <span v-else>Guardar y Finalizar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  distanceKm: { type: Number, required: true },
  durationSec: { type: Number, required: true },
  isFinishing: { type: Boolean, default: false }
})

const emit = defineEmits(['cancel', 'save'])

// Campos del formulario
// El DTO pide activityType y notes
const activityType = ref('')
const notes = ref('')
const error = ref('')

/** Formatea segundos a HH:MM:SS */
const formattedTime = computed(() => {
  const h = String(Math.floor(props.durationSec / 3600)).padStart(2, '0')
  const m = String(Math.floor((props.durationSec % 3600) / 60)).padStart(2, '0')
  const s = String(props.durationSec % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
})

const onSave = () => {
  error.value = ''
  // [Issue: Validaciones]
  if (!activityType.value) {
    error.value = 'El tipo de actividad es obligatorio.'
    return
  }
  if (props.durationSec <= 0) {
    error.value = 'La duración debe ser mayor a 0 segundos.'
    return
  }
  
  emit('save', {
    activityType: activityType.value,
    notes: notes.value
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-card {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 460px;
  margin: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h2 {
  margin: 0;
  font-size: 20px;
}
.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
}
.modal-body {
  padding: 24px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: center;
}
.summary-item .label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}
.summary-item .value {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #111;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
}
.required { color: #e74c3c; }
.error-msg {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 6px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.btn {
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.btn-primary { background: #000; color: white; }
.btn-secondary { background: #eee; color: #333; }
.btn:disabled { opacity: 0.6; }
</style>