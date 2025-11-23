<template>
  <main>
    <div class="page-container">
      <section class="card">
        <header class="card-header">
          <h1>Editar ruta</h1>
          <p class="muted">Editar una ruta existente: ajusta nombre, inicio/fin y guarda.</p>
        </header>

        <div class="card-body">
          <form @submit.prevent="onSubmit" novalidate>
            <div class="form-row">
              <label>Nombre de la ruta <span class="required">*</span></label>
              <input v-model="name" type="text" maxlength="100" placeholder="Nombre (1-100)" />
            </div>

            <div class="form-row">
              <label>Mapa (clic para marcar Inicio / Fin)</label>

              <div class="map-controls">
                <div class="mode">
                  <label>
                    <input type="radio" value="start" v-model="mode" /> Inicio
                  </label>
                  <label>
                    <input type="radio" value="end" v-model="mode" /> Fin
                  </label>
                  <label>
                    <input type="radio" value="checkpoint" v-model="mode" disabled="true" /> Parada
                  </label>
                  <button type="button" class="btn ghost small" @click="clearPoints">Limpiar puntos</button>
                </div>
              </div>

              <div ref="mapContainer" class="map-area" role="img" aria-label="Mapa interactivo para seleccionar inicio y fin"></div>

              <div class="coords">
                <div>Inicio: <strong v-if="startLatLng">{{ startLatLng.lat.toFixed(5) }}, {{ startLatLng.lng.toFixed(5) }}</strong><span v-else> — no seleccionado</span></div>
                <div>Fin: <strong v-if="endLatLng">{{ endLatLng.lat.toFixed(5) }}, {{ endLatLng.lng.toFixed(5) }}</strong><span v-else> — no seleccionado</span></div>
              </div>
            </div>

            <div class="form-row checkpoints-section">
              <div class="section-title">
                <label>Checkpoints</label>
                <span class="badge" v-if="checkpoints.length > 0">{{ checkpoints.length }}</span>
              </div>

              <div v-if="checkpoints.length > 0" class="checkpoints-list">
                <div v-for="(cp, index) in checkpoints"
                :key="index"
                class="checkpoint-row"
                :class="{ selected: selectedCheckpointIndex === index }"
                @click="selectCheckpoint(index)">
                  <div class="cp-number">{{ index + 1 }}</div>

                  <input
                    ref="checkpointInputs"
                    type="text"
                    v-model="cp.name"
                    placeholder="Nombre de la parada" required
                    class="cp-input"
                  />

                  <div class="cp-status" :title="cp.lat ? 'Ubicación marcada' : 'Falta ubicación'">
                    <span v-if="cp.lat">📍</span>
                    <span v-else class="missing-geo">⚠️</span>
                  </div>

                  <button type="button" class="btn-icon danger" @click.stop="removeCheckpoint(index)" title="Quitar parada">
                    &times;
                  </button>
                </div>
              </div>

              <button type="button" class="btn dashed" @click="addManualCheckpoint">
                + Añadir parada manualmente
              </button>
            </div>

            <div class="form-row">
              <label>Distancia estimada</label>
              <input type="text" :value="formattedDistance" readonly />
            </div>

            <div class="form-row actions-row">
              <button class="btn" :disabled="saving"> <span v-if="saving">Guardando...</span><span v-else>Guardar cambios</span></button>
              <router-link class="btn ghost" :to="{ name: 'RoutesList' }">Cancelar</router-link>
            </div>

            <div v-if="error" class="error-box">{{ error }}</div>
            <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
          </form>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getRoute, updateRoute } from '@/services/routesService'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

defineOptions({ name: 'RoutesEdit' })

const name = ref('')
const mode = ref('start')
const startLatLng = ref(null)
const endLatLng = ref(null)
const saving = ref(false)
const error = ref('')
const mapContainer = ref(null)

const serverDistanceMeters = ref(null)

const router = useRouter()
const route = useRoute()
const toastMessage = ref('')
const toastVisible = ref(false)

let map = null
let startMarker = null
let endMarker = null

const checkpoints = ref([])
const checkpointInputs = ref([])
const selectedCheckpointIndex = ref(null)

let checkpointMarkers = []

function showToast(msg, ms = 1800) {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, ms)
}

function initMap() {
  if (!mapContainer.value) return

  if (import.meta?.env?.MODE === 'test') {
    console.warn('[RoutesEdit] skipping map init in test mode')
    return
  }

  const token = mapboxgl.accessToken || import.meta?.env?.VITE_MAPBOX_ACCESS_TOKEN || import.meta?.env?.VITE_MAPBOX_TOKEN || ''
  mapboxgl.accessToken = mapboxgl.accessToken || token
  if (!mapboxgl.accessToken) {
    console.error('[RoutesEdit] Mapbox token missing at initMap — map will not be created')
    return
  }

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [2.1734, 41.3851],
    zoom: 12
  })

  map.addControl(new mapboxgl.NavigationControl())
  map.on('click', onMapClick)
  map.on('load', () => {
    if (startLatLng.value) updateStartMarker()
    if (endLatLng.value) updateEndMarker()
    drawCheckpoints()
    updateRouteLine()
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

function onMapClick(e) {
  const { lng, lat } = e.lngLat
  if (mode.value === 'start') {
    startLatLng.value = { lat, lng }
    updateStartMarker()
  } else if (mode.value === 'end') {
    endLatLng.value = { lat, lng }
    updateEndMarker()
  } else if (mode.value === 'checkpoint') {
    if (selectedCheckpointIndex.value !== null) {
      checkpoints.value[selectedCheckpointIndex.value].lat = lat
      checkpoints.value[selectedCheckpointIndex.value].lng = lng
    } else {
      addCheckpointFromMap(lat, lng)
      selectedCheckpointIndex.value = checkpoints.value.length - 1
    }
    drawCheckpoints()
  }
  serverDistanceMeters.value = null
  updateRouteLine()
}

function addCheckpointFromMap(lat, lng) {
  checkpoints.value.push({ name: '', lat, lng })
  drawCheckpoints()
}

async function addManualCheckpoint() {
  mode.value = 'checkpoint'
  checkpoints.value.push({ name: '', lat: null, lng: null })
  selectedCheckpointIndex.value = checkpoints.value.length - 1
  await focusLastCheckpointInput()
  scrollToMap()
}

function selectCheckpoint(index) {
  selectedCheckpointIndex.value = index
  mode.value = 'checkpoint'
}

function removeCheckpoint(index) {
  checkpoints.value.splice(index, 1)
  if (selectedCheckpointIndex.value === index) {
    selectedCheckpointIndex.value = null
  } else if (selectedCheckpointIndex.value > index) {
    selectedCheckpointIndex.value--
  }
  drawCheckpoints()
  updateRouteLine()
  if (checkpoints.value.length === 0) {
    mode.value = 'start'
  }
}

async function focusLastCheckpointInput() {
  await nextTick()
  const inputs = checkpointInputs.value
  if (inputs?.length) inputs[inputs.length - 1].focus()
}

function scrollToMap(padding = 165) {
  if (!mapContainer.value) return
  const rect = mapContainer.value.getBoundingClientRect()
  window.scrollTo({ top: rect.top + window.scrollY - padding, behavior: 'smooth' })
}

watch(mode, (m) => {
  if (m !== 'checkpoint') selectedCheckpointIndex.value = null
})

function drawCheckpoints() {
  if (!map) return
  checkpointMarkers.forEach(marker => marker.remove())
  checkpointMarkers = []
  checkpoints.value.forEach((cp, index) => {
    if (cp.lat && cp.lng) {
      const el = document.createElement('div')
      el.className = 'custom-marker-mapbox checkpoint-marker-mapbox'
      el.innerHTML = `<div class="marker-pin-mapbox checkpoint-pin-mapbox">${index + 1}</div>`
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([cp.lng, cp.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(`Parada ${index + 1}`))
        .addTo(map)
      checkpointMarkers.push(marker)
    }
  })
}

function updateStartMarker() {
  if (!map || !startLatLng.value) return
  if (startMarker) startMarker.remove()
  const el = document.createElement('div')
  el.className = 'custom-marker-mapbox start-marker-mapbox'
  el.innerHTML = '<div class="marker-pin-mapbox start-pin-mapbox"></div>'
  startMarker = new mapboxgl.Marker({ element: el })
    .setLngLat([startLatLng.value.lng, startLatLng.value.lat])
    .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Inicio'))
    .addTo(map)
}

function updateEndMarker() {
  if (!map || !endLatLng.value) return
  if (endMarker) endMarker.remove()
  const el = document.createElement('div')
  el.className = 'custom-marker-mapbox end-marker-mapbox'
  el.innerHTML = '<div class="marker-pin-mapbox end-pin-mapbox"></div>'
  endMarker = new mapboxgl.Marker({ element: el })
    .setLngLat([endLatLng.value.lng, endLatLng.value.lat])
    .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Fin'))
    .addTo(map)
}

function updateRouteLine() {
  if (!map) return
  if (!map.isStyleLoaded()) {
    map.once('load', () => updateRouteLine())
    return
  }
  if (map.getSource && map.getSource('route')) {
    try {
      map.removeLayer('route')
      map.removeSource('route')
    } catch { /* ignore */ }
  }
  if (!startLatLng.value || !endLatLng.value) return
  const routeCoordinates = [
    [startLatLng.value.lng, startLatLng.value.lat],
    ...checkpoints.value
      .filter(cp => cp.lat != null && cp.lng != null)
      .map(cp => [cp.lng, cp.lat]),
    [endLatLng.value.lng, endLatLng.value.lat]
  ]
  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates
      } }
  })
  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#777', 'line-width': 3, 'line-dasharray': [2, 2] }
  })
  const bounds = new mapboxgl.LngLatBounds()
  routeCoordinates.forEach(coord => bounds.extend(coord))
  map.fitBounds(bounds, { padding: 80 })
}

function clearPoints() {
  startLatLng.value = null
  endLatLng.value = null
  checkpoints.value = []
  selectedCheckpointIndex.value = null
  if (startMarker) { startMarker.remove(); startMarker = null }
  if (endMarker) { endMarker.remove(); endMarker = null }
  checkpointMarkers.forEach(marker => marker.remove())
  checkpointMarkers = []
  if (map && map.getSource('route')) {
    try { map.removeLayer('route'); map.removeSource('route') } catch { /* ignore */ }
  }
}

function haversineMeters(a, b) {
  if (!a || !b) return null
  const R = 6371000
  const toRad = deg => deg * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const aa = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
  return R * c
}

const distanceMeters = computed(() => {
  if (!startLatLng.value || !endLatLng.value) return null
  const points = [
    startLatLng.value,
    ...checkpoints.value
      .filter(cp => cp.lat != null && cp.lng != null)
      .map(cp => ({ lat: cp.lat, lng: cp.lng })),
    endLatLng.value
  ]
  let dist = 0
  for (let i = 0; i < points.length - 1; i++) {
    dist += haversineMeters(points[i], points[i + 1])
  }
  return dist
})

const formattedDistance = computed(() => {
  const meters = serverDistanceMeters.value ?? distanceMeters.value
  if (!meters) return '-'
  const km = meters / 1000
  return `${km.toFixed(2)} km`
})

async function loadRoute() {
  error.value = ''
  try {
    const id = route.params.id
    const data = await getRoute(id)
    name.value = data.name || ''
    const startCoords = parseLatLngString(data.startPoint)
    const endCoords = parseLatLngString(data.endPoint)
    if (startCoords) {
      startLatLng.value = startCoords
    } else if (data.start) {
      startLatLng.value = { lat: data.start.lat, lng: data.start.lng }
    }
    if (endCoords) {
      endLatLng.value = endCoords
    } else if (data.end) {
      endLatLng.value = { lat: data.end.lat, lng: data.end.lng }
    }
    checkpoints.value = (Array.isArray(data.checkpoints) ? data.checkpoints : []).map(cp => {
      const coords = parseLatLngString(cp.point)
      return {
        id: cp.id || cp._id || null,
        name: cp.name || '',
        lat: coords?.lat ?? cp.lat ?? null,
        lng: coords?.lng ?? cp.lng ?? null
      }
    })
    serverDistanceMeters.value = data.distanceMeters ?? (data.distanceKm != null ? Number(data.distanceKm) * 1000 : data.distance ?? null)
    // init map after we set points
    initMap()
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Error cargando la ruta.'
  }
}

async function onSubmit() {
  error.value = ''
  if (!name.value || name.value.trim().length === 0) {
    error.value = 'El nombre es obligatorio.'
    return
  }
  if (!startLatLng.value || !endLatLng.value) {
    error.value = 'Debes marcar Inicio y Fin en el mapa.'
    return
  }
  if (checkpoints.value.some(cp => !cp.name || cp.name.trim().length === 0)) {
    error.value = 'Todas las paradas deben tener un nombre.'
    return
  }
  if (checkpoints.value.some(cp => cp.name?.trim() && (cp.lat == null || cp.lng == null))) {
    error.value = 'Todas las paradas deben tener una ubicación marcada en el mapa.'
    return
  }

  saving.value = true
  try {
    const cps = checkpoints.value
      .filter(cp => cp.lat && cp.lng)
      .map(cp => ({
        name: cp.name.trim(),
        point: `${cp.lat},${cp.lng}`,
      }))
    const id = route.params.id
    const payload = {
      name: name.value.trim(),
      startPoint: `${startLatLng.value.lat},${startLatLng.value.lng}`,
      endPoint: `${endLatLng.value.lat},${endLatLng.value.lng}`,
      start: startLatLng.value,
      end: endLatLng.value,
      distanceKm: Number((distanceMeters.value / 1000).toFixed(2)),
      checkpoints: cps
    }
    const res = await updateRoute(id, payload)
    serverDistanceMeters.value = res.distanceMeters ?? res.distance ?? serverDistanceMeters.value
    showToast('Ruta actualizada correctamente')
    setTimeout(() => { router.push({ name: 'RoutesList' }) }, 900)
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Error actualizando la ruta.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadRoute()
})

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null }
})
</script>

<style scoped>

.page-container { padding: 28px 20px; display:flex; justify-content:center }
.card { width:100%; max-width:760px; background:#fff; border-radius:12px; padding:24px; border:1px solid #eee; box-shadow:0 8px 30px rgba(12,12,12,0.05) }
.card-header h1 { margin:0 0 8px 0; font-size:24px }
.muted { color:#666; margin:0; font-size:14px }
.card-body { margin-top:24px }
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

.form-row input[type="text"] {
  padding: 11px 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 14px;
}

.form-row input[type="text"]:focus {
  outline: none;
  border-color: #000;
}.required { color:#c53030 }
.map-area { border-radius:10px; overflow:hidden; border:1px solid #e6edf2; height:450px; width:100%; position:relative; z-index:1; background:#f0f4f8 }
.coords { display:flex; gap:20px; margin-top:12px; color:#555; font-size:13px }
.actions-row { display:flex; gap:12px; align-items:center; margin-top:24px }
.btn { padding:11px 18px; border-radius:8px; background:#000; color:#fff; border:none; cursor:pointer; text-decoration:none; font-size:14px; font-weight:600 }
.btn.ghost { background:transparent; color:#333; border:1px solid #ddd }
.btn.small {
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 500;
}
.mode {
  display: flex;
  gap: 16px;
  align-items: center;
}

.mode label {
  margin: 0;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.mode input[type="radio"] {
  cursor: pointer;
}

.map-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
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
  background: #f0f4f8; /* Fondo mientras carga */
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

:global(.checkpoint-pin-mapbox) {
  background: #ed8936;
  border: 3px solid #fff;
  box-shadow: 0 3px 10px rgba(237, 137, 54, 0.4);
  color: #fff;
  font-size: 14px;
  text-align: center;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: none !important;
  border-radius: 50% !important;
  width: 30px;
  height: 30px;
  line-height: 30px;
}

.checkpoint-row.selected {
  border-color: #ed8936;
  background: #fff7f0;
}
.checkpoint-row.selected .cp-number {
  background: #ed8936;
}
.error-box { background:#fef2f2; color:#c53030; padding:14px; border-radius:8px; border:1px solid #fecaca; margin-top:16px; font-size:14px }
.toast { position:fixed; right:20px; bottom:20px; background:#2f855a; color:#fff; padding:12px 16px; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.15); font-size:14px; z-index:1000; font-weight:500 }
.checkpoints-section { background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #f1f5f9; }
.section-title { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
.badge { background:#e2e8f0; color:#475569; font-size:11px; font-weight:700; padding:2px 6px; border-radius:99px; }
.checkpoints-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.checkpoint-row { display:flex; align-items:center; gap:10px; background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0; transition:border 0.2s; }
.checkpoint-row:focus-within { border-color:#8b5cf6; }
.checkpoint-row.selected { border-color:#ed8936; background:#fff7f0; }
.cp-number { width:24px; height:24px; background:#000; color:#fff; font-size:12px; font-weight:700; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cp-input { border:none !important; padding:4px 0 !important; font-size:14px !important; background:transparent !important; flex:1; }
.cp-status { font-size:14px; cursor:help; }
.missing-geo { opacity:0.5; filter:grayscale(100%); }
.btn-icon { border:none; background:transparent; cursor:pointer; font-size:18px; line-height:1; }
.btn-icon.danger { color:#c53030; }
</style>
