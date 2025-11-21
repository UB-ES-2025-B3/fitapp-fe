<template>
  <main>
    <div class="page-container">
      <section class="card">
        <header class="card-header">
          <h1>Ver ruta</h1>
          <p class="muted">Detalles de la ruta seleccionada</p>
        </header>

        <div class="card-body">
          <div v-if="loading" class="center">Cargando...</div>
          <div v-else-if="error" class="error-box">{{ error }}</div>
          <div v-else>
            <h2>{{ routeData.name }}</h2>
            <p>Distancia: {{ routeData.distanceKm ? Number(routeData.distanceKm).toFixed(2) + ' km' : '-' }}</p>

            <div class="form-row">
              <label>Mapa de la ruta</label>
              <!-- Reemplazado Canvas con Mapbox GL (solo lectura) -->
              <div ref="mapContainer" class="map-area" role="img" aria-label="Mapa de la ruta (solo lectura)"></div>

              <div class="coords" style="margin-top:8px">
                <div>Inicio: <strong v-if="startLatLng">{{ startLatLng.lat.toFixed(5) }}, {{ startLatLng.lng.toFixed(5) }}</strong><span v-else> — no disponible</span></div>
                <div>Fin: <strong v-if="endLatLng">{{ endLatLng.lat.toFixed(5) }}, {{ endLatLng.lng.toFixed(5) }}</strong><span v-else> — no disponible</span></div>
              </div>
            </div>

            <div v-if="routeData.checkpoints && routeData.checkpoints.length > 0" class="checkpoints-readonly-section">
              <h3>Paradas en ruta</h3>
              <ul class="checkpoints-list">
                <li v-for="(cp, index) in visibleCheckpoints" :key="cp.id || index">
                  <span class="cp-index">{{ index + 1 }}</span>
                  <span class="cp-name">{{ cp.name || `Checkpoint ${index + 1}` }}</span>
                </li>
              </ul>
            </div>

            <div class="actions-row">
              <button
                v-if="!session.activeExecution"
                class="btn btn-primary-start"
                @click="showStartModal = true"
                :disabled="isStarting"
              >
                <span v-if="isStarting">Iniciando...</span>
                <span v-else>Iniciar Ejecución</span>
              </button>

              <router-link
                v-if="session.activeExecution"
                class="btn btn-primary-start"
                :to="{ name: 'ActiveRun' }"
              >
                Ir a ejecución activa
              </router-link>

              <router-link class="btn ghost" :to="{ name: 'RoutesEdit', params: { id: routeData.id } }">Editar</router-link>
              <button class="btn danger" @click="openConfirm(routeData.id)" :disabled="deleting === routeData.id">Borrar</button>
              <router-link class="btn" :to="{ name: 'RoutesList' }">Volver al listado</router-link>
            </div>
          </div>

          <ConfirmModal :visible="showConfirm" :message="confirmMessage" @confirm="onConfirm" @cancel="onCancel" />
          <div v-if="showStartModal" class="start-modal-overlay" @click.self="showStartModal = false">
            <div class="start-modal-card">
              <h3>Iniciar Ruta</h3>
              <p>Selecciona el tipo de actividad para empezar.</p>

              <div class="form-group">
                <label for="activityType">Tipo de Actividad <span class="required">*</span></label>
                <select v-model="selectedActivity" id="activityType">
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
                <small v-if="startError" class="start-error">{{ startError }}</small>
              </div>

              <div class="start-modal-actions">
                <button class="btn ghost" @click="showStartModal = false">Cancelar</button>
                <button class="btn" @click="handleStartExecution" :disabled="!selectedActivity || isStarting">
                  <span v-if="isStarting">...</span>
                  <span v-else>Confirmar e Iniciar</span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { getRoute, deleteRoute } from '@/services/routesService'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useSessionStore } from '@/stores/session.js'
import { getMyExecutions, startExecution, pauseExecution, resumeExecution, finishExecution } from '@/services/executionService'

defineOptions({ name: 'RoutesShow' })

const route = useRoute()
const router = useRouter()
const routeData = ref({})
const loading = ref(true)
const error = ref('')
const deleting = ref(null)
const showConfirm = ref(false)
const confirmTarget = ref(null)
const confirmMessage = ref('¿Borrar esta ruta? Esta acción no tiene deshacer.')
const mapContainer = ref(null)

const startLatLng = ref(null)
const endLatLng = ref(null)

const session = useSessionStore()
const showStartModal = ref(false)
const selectedActivity = ref('') // activityType a enviar
const isStarting = ref(false)
const startError = ref('')

let map = null
let startMarker = null
let endMarker = null
let checkpointMarkers = null

const visibleCheckpoints = computed(() => {
  const list = routeData.value.checkpoints || []
  return list.filter(cp => {
    const coords = parseLatLngString(cp.point)
    return coords !== null
  })
})

function initMap() {
  if (!mapContainer.value) {
    console.error('[RoutesShow] No se encontró mapContainer. El mapa no puede iniciar.')
    return
  }

  // En modo test no inicializamos Mapbox (evitar errores de WebGL en JSDOM)
  if (import.meta?.env?.MODE === 'test') {
    console.warn('[RoutesShow] skipping map init in test mode')
    return
  }

  // ... (tu código del token y 'new mapboxgl.Map' va aquí como antes) ...
  const token = mapboxgl.accessToken || import.meta?.env?.VITE_MAPBOX_ACCESS_TOKEN || import.meta?.env?.VITE_MAPBOX_TOKEN || ''
  mapboxgl.accessToken = mapboxgl.accessToken || token
  if (!mapboxgl.accessToken) {
    console.error('[RoutesShow] Mapbox token missing at initMap — map will not be created')
    return
  }

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [2.1734, 41.3851], // Barcelona
    zoom: 12
  })

  map.addControl(new mapboxgl.NavigationControl())

  // Cuando el mapa esté listo (estilos cargados)...
  map.on('load', () => {
    // ...pintamos los marcadores (los datos ya están cargados)
    loadMarkersOnMap()
  })
}

function loadMarkersOnMap() {
  if (!map) return

  if (startLatLng.value) {
    const { lat, lng } = startLatLng.value
    const el = document.createElement('div')
    el.className = 'custom-marker-mapbox start-marker-mapbox'
    el.innerHTML = '<div class="marker-pin-mapbox start-pin-mapbox"></div>'

    startMarker = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Inicio'))
      .addTo(map)
  }

  if (endLatLng.value) {
    const { lat, lng } = endLatLng.value
    const el = document.createElement('div')
    el.className = 'custom-marker-mapbox end-marker-mapbox'
    el.innerHTML = '<div class="marker-pin-mapbox end-pin-mapbox"></div>'

    endMarker = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Fin'))
      .addTo(map)
  }

  drawCheckpoints()

  updateRouteLine()
}

function updateRouteLine() {
  if (!map || !startLatLng.value || !endLatLng.value) return

  if (map.getSource('route')) {
    map.removeLayer('route')
    map.removeSource('route')
  }

  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [startLatLng.value.lng, startLatLng.value.lat],
          [endLatLng.value.lng, endLatLng.value.lat]
        ]
      }
    }
  })

  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#777',
      'line-width': 3,
      'line-dasharray': [2, 2]
    }
  })

  const bounds = new mapboxgl.LngLatBounds()
  bounds.extend([startLatLng.value.lng, startLatLng.value.lat])
  bounds.extend([endLatLng.value.lng, endLatLng.value.lat])
  map.fitBounds(bounds, { padding: 80 })

  const list = routeData.value.checkpoints || []
  list.forEach(cp => {
    const cpCoords = parseLatLngString(cp.point)
    if (cpCoords) {
      bounds.extend([cpCoords.lng, cpCoords.lat])
    }
  })
  map.fitBounds(bounds, { padding: 80 })
}

  function drawCheckpoints() {
    if (checkpointMarkers && checkpointMarkers.length > 0) {
      // Limpiar marcadores anteriores
      checkpointMarkers.forEach(marker => marker.remove())
    }

    checkpointMarkers = []

    const list = routeData.value.checkpoints || []
    if (!Array.isArray(list) || list.length === 0 || !map) return

    list.forEach((cp, index) => {
      const cpCoords = parseLatLngString(cp.point)
      if (!cpCoords) {
        console.warn(`[RoutesShow] Checkpoint ${index} tiene coordenadas inválidas:`, cp.point)
        return
      }
      const el = document.createElement('div')
      el.className = 'custom-marker-mapbox checkpoint-marker-mapbox'
      el.innerHTML = `<div class="marker-pin-mapbox checkpoint-pin-readonly">${index + 1}</div>`

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([cpCoords.lng, cpCoords.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(cp.name || `Checkpoint ${index + 1}`))
        .addTo(map)

      checkpointMarkers.push(marker)
    })
  }

/**
 * Parsea un string "lat,lng" a un objeto { lat, lng }
 * @param {string} str
 * @returns {Object|null}
 */
function parseLatLngString(str) {
  if (typeof str !== 'string' || !str.includes(',')) {
    return null
  }
  const parts = str.split(',')
  if (parts.length !== 2) return null

  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])

  if (isNaN(lat) || isNaN(lng)) {
    return null
  }
  return { lat, lng }
}


function extractLatLngs(r) {
  if (!r) return { s: null, e: null }

  // --- Punto de inicio (Start) ---
  // 1. Probar r.startPoint (string "lat,lng") que es lo que guarda la API
  let s = parseLatLngString(r.startPoint)

  // 2. Si falla, probar los formatos antiguos (como r.start) por si hay datos viejos
  if (!s) {
    s = r.start ?? r.inicio ?? r.startLatLng ?? (r.startLat && r.startLng ? { lat: r.startLat, lng: r.startLng } : null)
  }

  // --- Punto de fin (End) ---
  // 1. Probar r.endPoint (string "lat,lng")
  let e = parseLatLngString(r.endPoint)

  // 2. Si falla, probar los formatos antiguos
  if (!e) {
    e = r.end ?? r.fin ?? r.endLatLng ?? (r.endLat && r.endLng ? { lat: r.endLat, lng: r.endLng } : null)
  }

  return { s, e }
}

const formatKm = (meters) => {
  if (meters == null) return '-'
  const km = Number(meters) / 1000
  return `${km.toFixed(2)} km`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const id = route.params.id
    const r = await getRoute(id)
    routeData.value = r || {}

    const { s, e } = extractLatLngs(routeData.value)
    startLatLng.value = s || null
    endLatLng.value = e || null


  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Error cargando la ruta.'
  } finally {
    loading.value = false
  }
}

const openConfirm = (id) => {
  confirmTarget.value = id
  showConfirm.value = true
}

const onConfirm = async () => {
  const id = confirmTarget.value
  showConfirm.value = false
  if (!id) return
  deleting.value = id
  try {
    await deleteRoute(id)
    showToast('Ruta borrada correctamente')
    setTimeout(() => { router.push({ name: 'RoutesList' }) }, 900)
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Error borrando ruta'
  } finally {
    deleting.value = null
    confirmTarget.value = null
  }
}

const onCancel = () => {
  showConfirm.value = false
  confirmTarget.value = null
}

const toastMessage = ref('')
const toastVisible = ref(false)

function showToast(msg, ms = 1800) {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, ms)
}

const loadRoute = async () => {
  await load()
}

// Lógica para Iniciar Ejecución
const handleStartExecution = async () => {
  // --- ¡¡AÑADE ESTA LÍNEA AQUÍ!! ---
  console.log('Iniciando ejecución. Actividad seleccionada:', selectedActivity.value);
  // ---------------------------------

  if (!selectedActivity.value) {
    startError.value = 'Debes seleccionar un tipo de actividad.'
    return
  }

  isStarting.value = true
  startError.value = ''

  try {
    const routeId = route.params.id
    // El DTO del backend requiere 'activityType'.
    const payload = {
      activityType: selectedActivity.value,
      notes: null // Las notas se piden al finalizar
    }

    // 1. Llamar a la API
    const executionData = await startExecution(routeId, payload)

    // 2. Guardar en el store de Pinia
    session.activeExecution = executionData

    // 3. Redirigir a la vista de ejecución activa (Paso 3)
    router.push({ name: 'ActiveRun' })

  } catch (err) {
    const apiError = err.response?.data?.message || 'Error al iniciar la ejecución.'

    // Sincronizar por si el error es que ya hay una en curso
    if (apiError.includes("IN_PROGRESS") || apiError.includes("en curso")) {
      startError.value = "Ya tienes otra ejecución en curso."
      session.fetchActiveExecution() // Sincronizar el store
    } else {
      startError.value = apiError
    }
  } finally {
    isStarting.value = false
  }
}

onMounted(() => {
  // 1. Cargar los datos de la ruta
  loadRoute()

  // 2. Sincronizar estado de ejecución (refuerzo)
  if (session.token && !session.isCheckingExecution) {
    session.fetchActiveExecution()
  }
})

watch(loading, (isLoading) => {
  // Si 'loading' acaba de cambiar a 'false' Y no hay error:
  if (isLoading === false && !error.value) {

    // Esperamos a que Vue actualice el DOM (para que exista el div del mapa)
    nextTick(() => {
      // Ahora que el div del mapa existe, lo inicializamos
      initMap()
    })
  }
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.page-container {
  padding: 28px 20px;
  display: flex;
  justify-content: center;
}

.card {
  width: 100%;
  max-width: 760px;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #eee;
  box-shadow: 0 8px 30px rgba(12, 12, 12, 0.05);
}

.card-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.muted {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.card-body {
  margin-top: 24px;
}

.card-body h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #111;
}

.card-body > div > p {
  margin: 0 0 20px 0;
  font-size: 15px;
  color: #555;
}

.center {
  text-align: center;
  padding: 40px;
  color: #666;
}

.form-row {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.form-row label {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

/* Estilos para el contenedor de Mapbox */
.map-area {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e6edf2;
  height: 450px;
  width: 100%;
  position: relative;
  z-index: 1;
}

/* Estilos para marcadores personalizados de Mapbox */
:global(.custom-marker-mapbox) {
  cursor: pointer;
}

:global(.marker-pin-mapbox) {
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  position: relative;
  cursor: pointer;
}

:global(.start-pin-mapbox) {
  background: #2b6cb0;
  border: 3px solid #fff;
  box-shadow: 0 3px 10px rgba(43, 108, 176, 0.5);
}

:global(.end-pin-mapbox) {
  background: #c53030;
  border: 3px solid #fff;
  box-shadow: 0 3px 10px rgba(197, 48, 48, 0.5);
}

:global(.checkpoint-pin-readonly) {
  background: #ed8936;
  border: 3px solid #fff;
  box-shadow: 0 3px 10px rgba(237, 137, 54, 0.4);
  color: #fff;
  font-size: 14px;
  line-height: 24px;
  text-align: center;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkpoints-readonly-section { margin-top: 20px; border-top: 1px solid #eee; padding-top: 16px; }
.checkpoints-readonly-section h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; }
.checkpoints-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 12px; }
.checkpoints-list li { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 6px 12px; border-radius: 20px; border: 1px solid #e2e8f0; }
.cp-index { background: #ed8936; color: #fff; font-size: 10px; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.cp-name { font-size: 14px; font-weight: 500; color: #334155; }

.coords {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  color: #555;
  font-size: 13px;
}

.coords strong {
  color: #000;
  font-weight: 600;
}

.actions-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 24px;
}

.btn {
  padding: 11px 18px;
  border-radius: 8px;
  background: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  display: inline-block;
}

.btn:hover:not(:disabled) {
  background: #333;
  transform: translateY(-1px);
}

.btn:disabled {
  background: #999;
  cursor: not-allowed;
}

.btn.ghost {
  background: transparent;
  color: #333;
  border: 1px solid #ddd;
}

.btn.ghost:hover {
  background: #f5f5f5;
  border-color: #999;
}

.btn.danger {
  background: #c53030;
}

.btn.danger:hover:not(:disabled) {
  background: #9b2c2c;
}

.error-box {
  background: #fef2f2;
  color: #c53030;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid #fecaca;
  margin-top: 16px;
  font-size: 14px;
}

.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  background: #2f855a;
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  z-index: 1000;
  font-weight: 500;
}

/* [NUEVO] Estilo para el botón de Iniciar */
.btn.btn-primary-start {
  background: #2ecc71; /* Verde */
  color: white;
  border-color: #2ecc71;
  order: -1; /* [NUEVO] Pone el botón de iniciar primero */
}
.btn.btn-primary-start:hover:not(:disabled) {
  background: #28b463;
}

/* [NUEVO] Estilos Modal de Inicio (Paso 5) */
.start-modal-overlay {
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
.start-modal-card {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 420px;
  margin: 20px;
  padding: 24px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}
.start-modal-card h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
}
.start-modal-card p {
  margin: 0 0 24px 0;
  color: #666;
  font-size: 15px;
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}
.form-group label {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}
.form-group select {
  padding: 12px 14px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
}
.required { color: #c53030; }
.start-error {
  color: #c53030;
  font-size: 13px;
  margin-top: 8px;
}
.start-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 720px) {
  /* ... (estilos responsive existentes) ... */
  .coords {
    flex-direction: column;
    gap: 8px;
  }
  .actions-row {
    flex-direction: column;
    width: 100%;
  }
  .btn {
    width: 100%;
    text-align: center;
  }
  .map-area {
    height: 350px;
  }

  /* [NUEVO] Ajuste responsive para el botón de iniciar */
  .btn.btn-primary-start {
    order: -1; /* Mantiene el botón de iniciar arriba en móvil */
  }
}
</style>
