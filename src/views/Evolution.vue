<template>
  <!-- Vista que muestra la evolución de Kcal de los últimos 30 días con estados de carga, error y vacío -->
  <div class="page-container">
    <section class="card">
      <header class="card-header">
        <h1>Evolución</h1>
        <p class="muted">Tu progreso de Kcal en los últimos 30 días</p>
      </header>

      <div class="card-body">
        <!-- Estado de Carga -->
        <div v-if="loading" class="state-container">
          <div class="spinner"></div>
          <p>Calculando estadísticas...</p>
        </div>

        <!-- Estado de Error -->
        <div v-else-if="error" class="error-box">
          {{ error }}
          <button class="btn ghost small" @click="fetchData">Reintentar</button>
        </div>

        <!-- Estado Sin Datos -->
        <div v-else-if="!hasData" class="state-container empty-state">
          <div class="empty-icon">
            <img src="@/assets/icons/graph.svg" class="icon-svg" alt="Gráfico" />
          </div>
          <h3>Sin actividad reciente</h3>
          <p>Aún no tienes actividad registrada en este periodo.</p>
          <router-link :to="{ name: 'RoutesList' }" class="btn primary">
            Empezar una actividad
          </router-link>
        </div>

        <!-- Gráfico -->
        <div v-else class="chart-container">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getStats } from '@/services/statsService'

// Importaciones de Chart.js y Vue-Chartjs
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar } from 'vue-chartjs'

// Registrar componentes de Chart.js necesarios
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Estados reactivos de UI y datos
const loading = ref(true)   // Indica si se está cargando
const error = ref('')       // Mensaje de error si falla la carga
const rawData = ref([])     // Datos crudos devueltos por la API

// Opciones del gráfico (estética y comportamiento; mantener simple y legible)
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false // Ocultamos la leyenda porque solo hay una métrica
    },
    tooltip: {
      callbacks: {
        label: (context) => `${context.raw} Kcal`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: '#f3f4f6'
      }
    },
    x: {
      grid: {
        display: false // Ocultamos rejilla vertical para limpieza
      }
    }
  }
}

// Computed: Normaliza los datos crudos a la estructura que espera Chart.js
// labels: fechas formateadas; datasets[0].data: valores Kcal
const chartData = computed(() => {
  // Extraemos etiquetas (fechas) y valores
  // La API devuelve: [{ date: '2023-10-01', value: 500 }, ...]
  const labels = rawData.value.map(item => formatDate(item.date))
  const data = rawData.value.map(item => item.value)

  return {
    labels,
    datasets: [
      {
        label: 'Kcal Quemadas',
        backgroundColor: '#F59E0B', // Color Naranja (coherente con el KPI de Kcal)
        borderRadius: 4, // Bordes redondeados en las barras
        data
      }
    ]
  }
})

// Determina si hay datos relevantes para mostrar el gráfico (evita gráfico vacío)
const hasData = computed(() => {
  return rawData.value && rawData.value.length > 0 && rawData.value.some(d => d.value > 0)
})

// Formateador de fecha simple (ej: "23 Oct")
function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// Carga de datos desde el servicio:
// - Maneja estados de carga y error
// - Valida/normaliza la estructura recibida
// - Filtra caso no array asignando []
async function fetchData() {
  loading.value = true
  error.value = ''
  try {

    const data = await getStats({ metric: 'kcal', period: '30d' })
    rawData.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error(err)
    error.value = 'No pudimos cargar tu historial de evolución.'
  } finally {
    loading.value = false
  }
}

// Lifecycle: al montar el componente, dispara la primera carga
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
/* Estilos de layout y estados para la vista de evolución (card, spinner, botones, etc.) */

.page-container {
  padding: 28px 20px;
  display: flex;
  justify-content: center;
}

.card {
  width: 100%;
  max-width: 1000px;
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
} /*TODO: seguir mismo estilo de cards en otras vistas...o en esta? idk ya se vera*/

.card-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #111;
}

.muted {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.card-body {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
}

.chart-container {
  position: relative;
  min-height: 500px; /* Altura fija para el canvas del gráfico */
  width: 100%;
}

/* Estados (Loading / Empty) */
.state-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #666;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  width: 64px;  /* Más grande que en KpiCard (44px) */
  height: 64px;
  border-radius: 12px;  /* Bordes más redondeados */
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* Sombra sutil del color */
}

/* SVG blanco dentro del contenedor */
.empty-icon .icon-svg {
  width: 40px;  /* Más grande que en KpiCard (24px) */
  height: 40px;
  padding-bottom: 3%;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #111;
}

.error-box {
  background: #fef2f2;
  color: #c53030;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #fee2e2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn.primary {
  background: #000;
  color: #fff;
}
.btn.primary:hover {
  background: #333;
  transform: translateY(-1px);
}

.btn.ghost {
  background: transparent;
  border: 1px solid #e5e7eb;
  color: #374151;
}
.btn.ghost:hover {
  background: #f9fafb;
}

.btn.small {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
