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

    <div v-if="showPointsModal" class="points-modal-overlay">
      <div class="points-modal-card">
        
        <div class="minimal-icon">{{ earnedPoints > 0 ? '🏆' : '🏁' }}</div>
        
        <h3 v-if="earnedPoints > 0">¡Objetivo conseguido!</h3>
        <h3 v-else>Ruta finalizada</h3>
        
        <p v-if="isBonus" class="bonus-text">Has superado tu meta diaria</p>
        <p v-else-if="earnedPoints > 0" class="subtext">Gran esfuerzo, sigue así.</p>
        <p v-else class="subtext">Buen entreno, ¡a por la próxima!</p>

        <div class="minimal-score">
          <span class="score-value">{{ earnedPoints }}</span>
          <span class="score-label">PTS</span>
        </div>

        <button class="btn btn-primary" @click="closePointsModalAndRedirect">
          Volver a Inicio
        </button>
      </div>
    </div>

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
import { getProfile } from '@/services/authService'

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

// Variables de estado para el modal
const showPointsModal = ref(false)
const earnedPoints = ref(0)
const isBonus = ref(false)

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
    // Aplicar la misma lógica 'Z' al pauseTime
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
  } catch {
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
  } catch {
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
  } catch {
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

// FUNCIÓN HANDLE FINISH (Simplificada)
const handleFinish = async (payload) => {
  if (!payload.activityType) {
    error.value = "Debes seleccionar un tipo de actividad."
    return
  }

  isFinishing.value = true
  error.value = ''
  
  try {
    // 1. LLAMADA AL BACKEND
    // La respuesta ya trae todo calculado: { points: 150, calories: 450.5, ... }
    const result = await finishExecution(execution.value.id, payload)
    
    // 2. LEER DATOS DEL BACKEND
    const backendPoints = result.points !== undefined ? Number(result.points) : 0
    const caloriesBurned = Number(result.calories) || 0 

    // 3. (OPCIONAL) LEER PERFIL SOLO PARA UX (Mostrar etiqueta "¡Objetivo Superado!")
    // Esto es solo visual, no afecta a los puntos guardados
    try {
      const userProfile = await getProfile()
      const dailyGoalKcal = Number(userProfile.goalKcalDaily) || 0
      
      // Si hay objetivo y las calorías de esta ruta lo superan (o ayudan mucho)
      if (dailyGoalKcal > 0 && caloriesBurned >= dailyGoalKcal) {
        isBonus.value = true
      } else {
        isBonus.value = false
      }
    } catch (e) {
      console.warn("No se pudo cargar perfil para comparar objetivo", e)
    }

    // 4. MOSTRAR MODAL
    earnedPoints.value = backendPoints
    showFinishModal.value = false
    showPointsModal.value = true

  } catch (err) {
    console.error(err)
    error.value = 'Error al finalizar la ejecución.'
  } finally {
    isFinishing.value = false
  }
}

// Función para cerrar el modal de puntos y salir
const closePointsModalAndRedirect = () => {
  showPointsModal.value = false
  session.clearActiveExecution()
  router.push('/') 
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

/* --- CONTROLES --- */
.controls-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
  width: 100%;
}

.btn {
  width: 100%;
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

/* Pausa */
.btn-pause {
  background: #fff5e6;
  color: #d35400;
  border: 2px solid #f39c12;
}
.btn-pause:hover:not(:disabled) {
  background: #fdebd0;
}

/* Reanudar */
.btn-resume {
  background: #2ecc71;
  color: white;
}
.btn-resume:hover:not(:disabled) {
  background: #27ae60;
}

/* Finalizar */
.btn-finish {
  background: #e74c3c;
  color: white;
}
.btn-finish:hover:not(:disabled) {
  background: #c0392b;
}

/* --- MODAL DE PUNTOS (GAMIFICACIÓN) --- */
.points-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.85); /* Fondo blanco translúcido */
  backdrop-filter: blur(8px); /* Efecto cristal */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.points-modal-card {
  background: #ffffff;
  padding: 48px 32px;
  border-radius: 32px;
  text-align: center;
  max-width: 340px;
  width: 90%;
  box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0,0,0,0.03);
  animation: floatUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes floatUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Icono Minimalista */
.minimal-icon {
  font-size: 64px;
  margin-bottom: 16px;
  line-height: 1;
  animation: popIcon 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s backwards;
}

@keyframes popIcon {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Tipografía */
.points-modal-card h3 {
  margin: 0 0 8px 0;
  font-size: 22px;
  color: #111;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.subtext {
  margin: 0 0 32px 0;
  color: #888;
  font-size: 15px;
  font-weight: 400;
}

.bonus-text {
  margin: 0 0 32px 0;
  color: #d97706;
  font-size: 14px;
  font-weight: 600;
  background: #fffbeb;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 99px;
}

/* Score Minimalista */
.minimal-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
}

.score-value {
  font-size: 80px;
  font-weight: 800;
  line-height: 0.9;
  color: #000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif;
  letter-spacing: -3px;
}

.score-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #999;
  text-transform: uppercase;
  margin-top: 8px;
}

/* Botón del Modal */
.btn-primary {
  background: #000;
  color: #fff;
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 16px;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease, background 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.btn-primary:hover {
  background: #222;
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: scale(0.98);
}
</style>