<template>
  <div class="run-page-container">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando datos de la ruta...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <h3>Error</h3>
      <p>{{ error }}</p>
      <router-link to="/home" class="btn">Volver a Inicio</router-link>
    </div>

    <div v-else-if="execution && route" class="run-card">
      <header class="run-header">
        <h1>{{ route.name }}</h1>
        <p class="distance">
          Distancia: {{ Number(route.distanceKm).toFixed(2) }} km
        </p>
      </header>

      <div class="timer-section">
        <div class="timer-display" :class="{ 'is-paused': isPaused }">
          {{ formattedTime }}
        </div>
        <div class="timer-status">
          <span v-if="isPaused">PAUSADO</span>
          <span v-else>EN CURSO</span>
        </div>
      </div>

      <div class="controls-section">
        <button
          v-if="!isPaused"
          class="btn btn-pause"
          @click="handlePause"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">Pausando...</span>
          <span v-else>Pausar</span>
        </button>
        
        <button
          v-if="isPaused"
          class="btn btn-resume"
          @click="handleResume"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">Reanudando...</span>
          <span v-else>Reanudar</span>
        </button>
        
        <button
          class="btn btn-finish"
          @click="openFinishModal"
          :disabled="isSubmitting"
        >
          Finalizar
        </button>
      </div>
    </div>

    <ExecutionFinishModal
      v-if="showFinishModal"
      :distanceKm="Number(route.distanceKm)"
      :durationSec="elapsedTime"
      :isFinishing="isFinishing"
      :initialActivityType="execution?.activityType" @cancel="closeFinishModal"
      @save="handleFinish"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useRouter } from 'vue-router'
import { getRoute } from '@/services/routesService'
import { 
  pauseExecution, 
  resumeExecution, 
  finishExecution 
} from '@/services/executionService'
import ExecutionFinishModal from '@/components/ExecutionFinishModal.vue'

const session = useSessionStore()
const router = useRouter()

// Estado de la ejecución (del store)
const execution = computed(() => session.activeExecution)
const isPaused = computed(() => execution.value?.status === 'PAUSED')

// Estado local de la UI
const route = ref(null)
const isLoading = ref(true)
const error = ref('')
const isSubmitting = ref(false)
const isFinishing = ref(false)
const showFinishModal = ref(false)

// Estado del Cronómetro
const elapsedTime = ref(0)
const timerInterval = ref(null)

// --- LÓGICA DEL CRONÓMETRO ---

const formattedTime = computed(() => {
  const h = String(Math.floor(elapsedTime.value / 3600)).padStart(2, '0')
  const m = String(Math.floor((elapsedTime.value % 3600) / 60)).padStart(2, '0')
  const s = String(elapsedTime.value % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
})

const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

const startTimer = () => {
  stopTimer()
  updateTimer()
  timerInterval.value = setInterval(updateTimer, 1000)
}

const updateTimer = () => {
  if (!execution.value) return

  const now = new Date()
  
  // [CAMBIO CLAVE 1] 
  // Añadimos 'Z' para indicar que la hora del servidor viene en UTC.
  // Esto arregla el bug de los 3600s si tu servidor está en la nube/docker.
  // Si tu servidor y tu PC tienen la misma hora local, quita la 'Z'.
  const startTime = new Date(execution.value.startTime + (execution.value.startTime.endsWith('Z') ? '' : 'Z'))
  
  const totalPausedSec = Number(execution.value.totalPausedTimeSec) || 0
  
  let diffSec = 0
  
  if (execution.value.status === 'IN_PROGRESS') {
    const totalMs = now - startTime
    const totalSec = Math.floor(totalMs / 1000)
    diffSec = Math.max(0, totalSec - totalPausedSec)
    
  } else if (execution.value.status === 'PAUSED') {
    // [CAMBIO CLAVE 2] Aplicar la misma lógica 'Z' al pauseTime
    if (execution.value.pauseTime) {
      const pauseTime = new Date(execution.value.pauseTime + (execution.value.pauseTime.endsWith('Z') ? '' : 'Z'))
      const totalMs = pauseTime - startTime
      const totalSec = Math.floor(totalMs / 1000)
      diffSec = Math.max(0, totalSec - totalPausedSec)
    }
  }
  
  elapsedTime.value = diffSec
}

// --- CICLO DE VIDA Y WATCHERS ---

onMounted(async () => {
  if (!execution.value) {
    router.push('/home')
    return
  }
  
  isLoading.value = true
  try {
    route.value = await getRoute(execution.value.routeId)
    initializeTimer()
  } catch (err) {
    error.value = 'No se pudieron cargar los datos de la ruta.'
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  stopTimer()
})

watch(isPaused, () => {
  initializeTimer()
})

const initializeTimer = () => {
  // Si está pausado, detenemos el intervalo y calculamos una última vez el tiempo estático
  if (isPaused.value) {
    stopTimer()
    updateTimer()
  } else {
    startTimer()
  }
}

// --- MANEJADORES DE ACCIONES ---

const handlePause = async () => {
  isSubmitting.value = true
  error.value = ''
  try {
    const updatedExecution = await pauseExecution(execution.value.id)
    session.activeExecution = updatedExecution // Esto disparará el watch(isPaused)
  } catch (err) {
    error.value = 'Error al pausar la ejecución.'
  } finally {
    isSubmitting.value = false
  }
}

const handleResume = async () => {
  isSubmitting.value = true
  error.value = ''
  try {
    const updatedExecution = await resumeExecution(execution.value.id)
    session.activeExecution = updatedExecution // Esto disparará el watch(isPaused)
  } catch (err) {
    error.value = 'Error al reanudar la ejecución.'
  } finally {
    isSubmitting.value = false
  }
}

/* Asegurar consistencia al abrir modal */
const openFinishModal = async () => {
  // 1. Detenemos el timer visual inmediatamente para que el usuario vea el tiempo final
  stopTimer()
  
  // 2. Si la ruta sigue en curso, la pausamos en el backend para que guarde el estado
  if (!isPaused.value) {
    await handlePause()
  }
  
  // 3. Abrimos el modal con el estado pausado y el tiempo congelado
  showFinishModal.value = true
}

const closeFinishModal = () => {
  showFinishModal.value = false
  // Si el usuario cancela y la ruta estaba pausada (siempre lo estará al abrir modal),
  // decide si quieres reanudarla automáticamente o dejarla pausada.
  // Lo estándar es dejarla pausada, pero reiniciar el timer visual si fuera necesario
  // (aquí no hace falta porque está pausada).
}

const handleFinish = async (payload) => {
  if (!payload.activityType) {
    error.value = "Debes seleccionar un tipo de actividad."
    return
  }

  isFinishing.value = true
  error.value = ''
  
  try {
    await finishExecution(execution.value.id, payload)
    router.push('/') 
    session.clearActiveExecution()
  } catch (err) {
    error.value = 'Error al finalizar la ejecución.'
    isFinishing.value = false
  }
}
</script>

<style scoped>
.run-page-container {
  min-height: calc(100vh - 70px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f7f6;
  padding: 20px;
}
.run-card {
  width: 100%;
  max-width: 500px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.07);
  padding: 32px;
  border: 1px solid #e5e5e5;
}
.run-header {
  text-align: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 20px;
}
.run-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}
.run-header .distance {
  font-size: 18px;
  color: #555;
  margin: 4px 0 0;
}
.timer-section {
  padding: 40px 0;
  text-align: center;
}
.timer-display {
  font-size: 64px;
  font-weight: 300;
  font-family: 'Roboto Mono', monospace;
  color: #111;
  letter-spacing: -2px;
  transition: color 0.3s ease;
}
.timer-display.is-paused {
  color: #999;
}
.timer-status {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #666;
}

/* --- CORRECCIÓN DE LAYOUT --- */
.controls-section {
  display: flex;           /* Usamos flex en lugar de grid */
  flex-direction: column;  /* Botones apilados verticalmente */
  gap: 16px;
  margin-top: 16px;
  width: 100%;
}

.btn {
  width: 100%; /* Ocupar todo el ancho */
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* --- CORRECCIÓN DE ESTILOS BOTÓN PAUSA --- */
.btn-pause {
  background: #fff5e6;     /* Fondo amarillo muy suave */
  color: #d35400;          /* Naranja oscuro / Marrón */
  border: 2px solid #f39c12; /* Borde naranja */
}
.btn-pause:hover:not(:disabled) { 
  background: #fdebd0; 
}

.btn-resume {
  background: #2ecc71;
  color: white;
  /* border: none; Eliminamos border doble */
}
.btn-resume:hover:not(:disabled) { background: #27ae60; }

.btn-finish {
  background: #e74c3c;
  color: white;
}
.btn-finish:hover:not(:disabled) { background: #c0392b; }
</style>