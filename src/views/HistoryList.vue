<template>
  <div class="history-container">
    <div class="page-container">
      <section class="card">
        <header class="card-header">
          <div>
            <h1>Historial de Ejecuciones</h1>
            <p class="muted">Todas tus actividades completadas</p>
          </div>
        </header>

        <div class="card-body">
          <!-- Estado de carga: muestra skeleton mientras se obtienen los datos -->
          <div v-if="loading" class="center">
            <div class="skeleton skeleton-table"></div>
            <div class="skeleton skeleton-table"></div>
            <div class="skeleton skeleton-table"></div>
          </div>

          <!-- Estado de error: se muestra si falla la petición a la API -->
          <div v-else-if="error" class="error-box">
            <span class="error-icon">⚠️</span>
            <p>{{ error }}</p>
            <button @click="loadHistory" class="btn-retry">Intentar de nuevo</button>
          </div>

          <!-- Estado vacío: cuando no hay historial -->
          <div v-else-if="executions.length === 0" class="empty-state">
            <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start">
              <p>No hay actividades registradas aún.</p>
              <p class="muted" style="font-size:14px">Completa una ruta para verla aquí.</p>
              <router-link class="btn" :to="{ name: 'RoutesList' }">Ver mis rutas</router-link>
            </div>
          </div>

          <!-- Lista de ejecuciones: tabla simple -->
          <div v-else class="history-table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ruta</th>
                  <th>Distancia</th>
                  <th>Tiempo</th>
                  <th>Calorías</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="execution in sortedExecutions" :key="execution.date" class="execution-row">
                  <td>{{ formatDate(execution.date) }}</td>
                  <td>{{ execution.routeName }}</td>
                  <td>{{ execution.distanceKm ? Number(execution.distanceKm).toFixed(2) : '-' }} km</td>
                  <td>{{ formatDuration(execution.durationSeconds) }}</td>
                  <td>{{ execution.calories }}</td>
                  <td>{{ execution.points }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getExecutionHistory } from '@/services/executionService.js'

// --- Estado reactivo ---
// Flag de carga mientras se obtienen los datos
const loading = ref(true)
// Mensaje de error si la petición falla
const error = ref(null)
// Array de ejecuciones pasadas
const executions = ref([])

/**
 * Función principal para cargar el historial de ejecuciones.
 * Si la petición falla, guarda el error; si tiene éxito, ordena por fecha descendente.
 */
const loadHistory = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await getExecutionHistory()
    // Asigna los datos obtenidos (asume que ya vienen ordenados, pero lo hacemos en el computed por seguridad)
    executions.value = (Array.isArray(data) ? data : []).map(item => ({
      routeName: item.routeName,
      distanceKm: item.distanceKm ?? 0,
      durationSeconds: item.durationSec ?? 0,
      calories: item.calories ?? 0,
      points: item.points ?? 0,
      date: item.endTime ?? item.startedAt ?? null
    }))

  } catch (err) {
    console.error("Error cargando historial:", err)
    error.value = err.response?.data?.message || err.message || "No se pudo cargar el historial."
  } finally {
    loading.value = false
  }
}

/**
 * Computed que ordena las ejecuciones por fecha descendente (más recientes primero).
 */
const sortedExecutions = computed(() => {
  return [...executions.value].sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    return dateB - dateA
  })
})

/**
 * Formatea una fecha ISO8601 al formato legible en español (DD/MM/YYYY HH:MM).
 * @param {string} isoDate - Fecha en formato ISO8601
 * @returns {string} - Fecha formateada
 */
const formatDate = (isoDate) => {
  if (!isoDate) return '-'
  const date = new Date(isoDate)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Formatea una duración en segundos al formato HH:MM:SS.
 * @param {number} totalSeconds - Duración total en segundos
 * @returns {string} - Duración formateada (ej: "01:23:45")
 */
const formatDuration = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) return '-'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (num) => String(num).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// Hook de ciclo de vida: carga el historial al montar el componente
onMounted(() => {
  loadHistory()
})
</script>

<style scoped>
.history-container {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 70px);
  padding: 20px;
  background: #fafafa;
}

.page-container {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.card-header h1 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #111827;
}

.card-header .muted {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.card-body {
  padding: 24px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.center {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  flex-direction: column;
  min-height: 300px;
  color: #6b7280;
}

.error-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
}

.error-icon {
  font-size: 24px;
}

.error-box p {
  margin: 0;
  font-size: 14px;
}

.btn-retry {
  align-self: flex-start;
  padding: 8px 16px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-retry:hover {
  background: #b91c1c;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 40px 20px;
  text-align: center;
}

.empty-state p {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
}

.empty-state .muted {
  color: #9ca3af;
}

.history-table-wrapper {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.history-table thead {
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
}

.history-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
}

.history-table tbody tr {
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.2s;
}

.history-table tbody tr:hover {
  background: #f9fafb;
}

.history-table td {
  padding: 12px 16px;
  color: #111827;
}

.date-cell {
  font-weight: 500;
}

.route-cell {
  color: #0066cc;
}

.distance-cell,
.time-cell {
  text-align: right;
  color: #6b7280;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-table {
  height: 40px;
  margin-bottom: 12px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.btn {
  display: inline-block;
  padding: 8px 16px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s;
}

.btn:hover {
  background: #0052a3;
}

/* Responsive */
@media (max-width: 720px) {
  .history-container {
    padding: 12px;
  }

  .card-header {
    padding: 16px;
  }

  .card-header h1 {
    font-size: 20px;
  }

  .card-body {
    padding: 16px;
  }

  .history-table {
    font-size: 12px;
  }

  .history-table th,
  .history-table td {
    padding: 8px;
  }
}
</style>
