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
          <span v-if="isSubmitting">...</span>
          <span v-else>Pausar</span>
        </button>
        <button
          v-if="isPaused"
          class="btn btn-resume"
          @click="handleResume"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">...</span>
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
      @cancel="closeFinishModal"
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
const route = ref(null) // Detalles de la ruta (distancia, nombre)
const isLoading = ref(true) // Cargando la ruta, no la ejecución
const error = ref('')
const isSubmitting = ref(false) // Para Pausar/Reanudar
const isFinishing = ref(false) // Para el modal de Finalizar
const showFinishModal = ref(false)

// Estado del Cronómetro
const elapsedTime = ref(0) // Tiempo transcurrido en SEGUNDOS
const timerInterval = ref(null)

// --- LÓGICA DEL CRONÓMETRO ---

/** Formatea segundos a HH:MM:SS */
const formattedTime = computed(() => {
  const h = String(Math.floor(elapsedTime.value / 3600)).padStart(2, '0')
  const m = String(Math.floor((elapsedTime.value % 3600) / 60)).padStart(2, '0')
  const s = String(elapsedTime.value % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
})

/**
 * Detiene el intervalo del cronómetro.
 */
const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

/**
 * Inicia el intervalo del cronómetro.
 * Llama a updateTimer() inmediatamente y luego cada segundo.
 */
const startTimer = () => {
  stopTimer() // Asegurarse de que no haya duplicados
  updateTimer() // Actualizar inmediatamente
  timerInterval.value = setInterval(updateTimer, 1000)
}

/**
 * Función principal del cronómetro.
 * Calcula el tiempo transcurrido basándose en el estado de la ejecución.
 * [Cubre: "Mantener estado y contador tras recarga"]
 */
const updateTimer = () => {
  if (!execution.value) return

  const now = new Date()
  const startTime = new Date(execution.value.startTime)
  const totalPausedSec = execution.value.totalPausedTimeSec || 0
  let diffSec = 0
  
  //
  if (execution.value.status === 'IN_PROGRESS') {
    // Si está en progreso, el tiempo es (AHORA - INICIO - PAUSAS_ACUMULADAS)
    const diffMs = now - startTime - (totalPausedSec * 1000)
    diffSec = Math.floor(diffMs / 1000)

  } else if (execution.value.status === 'PAUSED') {
    // Si está pausado, el tiempo se congela en (PAUSE_TIME - INICIO - PAUSAS_ACUMULADAS)
    // Nota: 'pauseTime' es la *última* vez que se pausó
    const pauseTime = new Date(execution.value.pauseTime)
    const diffMs = pauseTime - startTime - (totalPausedSec * 1000)
    diffSec = Math.floor(diffMs / 1000)
    stopTimer() // Asegurarse de que el intervalo esté detenido
  }
  
  elapsedTime.value = Math.max(0, diffSec)
}

// --- CICLO DE VIDA Y WATCHERS ---

onMounted(async () => {
  // Guard clause: si no hay ejecución, no deberíamos estar aquí.
  if (!execution.value) {
    router.push('/home')
    return
  }
  
  isLoading.value = true
  try {
    // Cargar los detalles de la ruta (distancia, nombre)
    route.value = await getRoute(execution.value.routeId)
    // Sincronizar el cronómetro
    initializeTimer()
  } catch (err) {
    error.value = 'No se pudieron cargar los datos de la ruta.'
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  // Limpiar el intervalo al salir del componente
  stopTimer()
})

/**
 * Observa cambios en el estado de ejecución (ej: de PAUSED a IN_PROGRESS)
 * y reacciona iniciando o deteniendo el cronómetro.
 */
watch(isPaused, (paused) => {
  initializeTimer()
})

/** Sincroniza el estado del timer con el estado de la ejecución */
const initializeTimer = () => {
  if (isPaused.value) {
    stopTimer()
  } else {
    startTimer()
  }
  // Actualizar el valor una vez
  updateTimer()
}


// --- MANEJADORES DE ACCIONES ---

/** [Issue: Pausar ejecución] */
const handlePause = async () => {
  isSubmitting.value = true
  error.value = ''
  try {
    // Llama a POST /api/v1/executions/pause/{id}
    const updatedExecution = await pauseExecution(execution.value.id)
    // Actualiza el store de Pinia, lo que activará el 'watch'
    session.activeExecution = updatedExecution
  } catch (err) {
    error.value = 'Error al pausar la ejecución.'
  } finally {
    isSubmitting.value = false
  }
}

/** [Issue: Reanudar ejecución] */
const handleResume = async () => {
  isSubmitting.value = true
  error.value = ''
  try {
    // Llama a POST /api/v1/executions/resume/{id}
    const updatedExecution = await resumeExecution(execution.value.id)
    // Actualiza el store de Pinia, lo que activará el 'watch'
    session.activeExecution = updatedExecution
  } catch (err) {
    error.value = 'Error al reanudar la ejecución.'
  } finally {
    isSubmitting.value = false
  }
}

/** [Issue: Finalizar ejecución] - Abre el modal */
const openFinishModal = () => {
  // Pausar la ejecución ANTES de mostrar el modal
  if (!isPaused.value) {
    handlePause()
  }
  showFinishModal.value = true
}

const closeFinishModal = () => {
  showFinishModal.value = false
}

/** [Issue: Finalizar ejecución] - Guarda el resumen */
const handleFinish = async (payload) => {
  // Payload es { activityType, notes }
  if (!payload.activityType) {
    error.value = "Debes seleccionar un tipo de actividad."
    return
  }

  isFinishing.value = true
  error.value = ''
  
  try {
    // Llama a POST /api/v1/executions/finish/{id}
    const finishedExecution = await finishExecution(execution.value.id, payload)
    
    // Éxito: Limpiar el store y redirigir
    session.clearActiveExecution()
    // voltar a Inicio
    router.push('/home') 

  } catch (err) {
    error.value = 'Error al finalizar la ejecución.'
    isFinishing.value = false // Mantener el modal abierto
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
.controls-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.btn {
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
.btn-pause {
  background: #fff;
  color: #c0392b;
  border: 2px solid #f1c40f;
}
.btn-pause:hover:not(:disabled) { background: #fdf5e0; }

.btn-resume {
  background: #2ecc71;
  color: white;
  border: 2px solid #2ecc71;
}
.btn-resume:hover:not(:disabled) { background: #28b463; }

.btn-finish {
  grid-column: 1 / -1; /* Ocupa todo el ancho */
  background: #e74c3c;
  color: white;
  border: 2px solid #e74c3c;
}
.btn-finish:hover:not(:disabled) { background: #c0392b; }
</style>