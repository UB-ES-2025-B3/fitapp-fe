<template>
  <main>
    <div class="page-container">
      <section class="card">
        <header class="card-header">
          <h1>Crear ruta</h1>
          <p class="muted">Crear una nueva ruta: marca Inicio y Fin en el mapa y guarda.</p>
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

              <!-- Reemplazado Canvas con Mapbox GL -->
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
              <button class="btn" :disabled="saving"> <span v-if="saving">Guardando...</span><span v-else>Guardar ruta</span></button>
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
import { useRouter } from 'vue-router'
import { createRoute } from '@/services/routesService'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

defineOptions({ name: 'RoutesNew' })

const name = ref('')
const mode = ref('start')
const startLatLng = ref(null)
const endLatLng = ref(null)
const saving = ref(false)
const error = ref('')
const mapContainer = ref(null)
const checkpoints = ref([])
const checkpointInputs = ref([])
const selectedCheckpointIndex = ref(null)
const serverDistanceMeters = ref(0);

let map = null
let startMarker = null
let endMarker = null
let checkpointMarkers = []

function initMap() {
  if (!mapContainer.value) return

  // En el entorno de test (vitest/jsdom) no intentamos inicializar Mapbox
  // porque la librería intenta crear un contexto WebGL y falla en JSDOM.
  if (import.meta?.env?.MODE === 'test') {
    console.warn('[RoutesNew] skipping map init in test mode')
    return
  }

  // Prefer any token already set on mapboxgl (main.js). Fall back to env vars.
  const token = mapboxgl.accessToken || import.meta?.env?.VITE_MAPBOX_ACCESS_TOKEN || import.meta?.env?.VITE_MAPBOX_TOKEN || ''
  console.log('[RoutesNew] initMap token (effective) =', token)
  // ensure global lib has the token
  mapboxgl.accessToken = mapboxgl.accessToken || token
  if (!mapboxgl.accessToken) {
    console.error('[RoutesNew] Mapbox token missing at initMap — map will not be created')
    return
  }

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v11', // Estilo válido garantizado
    center: [2.1734, 41.3851], // Barcelona
    zoom: 12
  })

  map.addControl(new mapboxgl.NavigationControl())
  map.on('click', onMapClick)
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
      addCheckpointsFromMap(lat, lng)
      selectedCheckpointIndex.value = checkpoints.value.length - 1
    }
    drawCheckpoints()
  }

  updateRouteLine()
}

function updateStartMarker() {
  // Si ya existe un marcador de inicio, elimínalo
  if (startMarker) {
    startMarker.remove()
  }

  const el = document.createElement('div')
  el.className = 'custom-marker-mapbox start-marker-mapbox'
  el.innerHTML = '<div class="marker-pin-mapbox start-pin-mapbox"></div>'

  startMarker = new mapboxgl.Marker({ element: el })
    .setLngLat([startLatLng.value.lng, startLatLng.value.lat])
    .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Inicio'))
    .addTo(map)
}

function updateEndMarker() {
  // Si ya existe un marcador de fin, elimínalo
  if (endMarker) {
    endMarker.remove()
  }

  const el = document.createElement('div')
  el.className = 'custom-marker-mapbox end-marker-mapbox'
  el.innerHTML = '<div class="marker-pin-mapbox end-pin-mapbox"></div>'

  endMarker = new mapboxgl.Marker({ element: el })
    .setLngLat([endLatLng.value.lng, endLatLng.value.lat])
    .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Fin'))
    .addTo(map)
}

function addCheckpointsFromMap(lat, lng) {
  checkpoints.value.push({ name: '', lat, lng })
  drawCheckpoints()
}

async function addManualCheckpoint() {
  mode.value = 'checkpoint'
  checkpoints.value.push({ name: '', lat: null, lng: null })
  selectedCheckpointIndex.value = checkpoints.value.length - 1
  await focusLastCheckpointInput() // sigue enfocando al añadir manualmente
  scrollToMap()
}

function scrollToMap(padding = 165) {
  if (!mapContainer.value) return
  const rect = mapContainer.value.getBoundingClientRect()
  const targetY = rect.top + window.scrollY - padding
  window.scrollTo({ top: targetY, behavior: 'smooth' })
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

function drawCheckpoints() {
  if (!map) return
  checkpointMarkers.forEach(m => m.remove())
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

/**
 * Focuses the last checkpoint input field in the DOM.
 * Uses nextTick to ensure the input elements are rendered before focusing.
 */
async function focusLastCheckpointInput() {
  await nextTick()
  const inputs = checkpointInputs.value
  if (inputs && inputs.length > 0) {
    const el = inputs[inputs.length - 1]
    el.focus()
  }
}

function selectCheckpoint(index) {
  selectedCheckpointIndex.value = index
  mode.value = 'checkpoint'
}

watch(mode, (m) => {
  if (m !== 'checkpoint') {
    selectedCheckpointIndex.value = null
  }

})

// Función para obtener la ruta real (calles) de Mapbox
async function getRouteFromMapbox(coords) {
  // coords debe ser array de arrays: [[lng, lat], [lng, lat]...]
  if (coords.length < 2) return null;

  // Construir string de coordenadas separadas por ;
  const coordsString = coords.map(c => `${c[0]},${c[1]}`).join(';');
  const token = mapboxgl.accessToken;
  
  // Usamos perfil 'walking'. Puedes cambiar a 'cycling' si prefieres.
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordsString}?steps=true&geometries=geojson&access_token=${token}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.routes && data.routes.length > 0) {
      return data.routes[0]; // Retorna objeto con { geometry, distance, duration... }
    }
  } catch (error) {
    console.error('Error fetching route:', error);
  }
  return null;
}


async function updateRouteLine() {
  // 1. Limpiar capa previa
  if (map.getSource('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }

  // 2. Verificar que tenemos al menos Inicio y Fin
  if (!startLatLng.value || !endLatLng.value) {
    serverDistanceMeters.value = 0; // Resetear distancia
    return;
  }

  // 3. Construir lista de waypoints en orden [Lng, Lat]
  const waypoints = [
    [startLatLng.value.lng, startLatLng.value.lat]
  ];
  
  // Agregar checkpoints intermedios
  checkpoints.value.forEach(cp => {
    if (cp.lat && cp.lng) {
      waypoints.push([cp.lng, cp.lat]);
    }
  });

  // Agregar fin
  waypoints.push([endLatLng.value.lng, endLatLng.value.lat]);

  // 4. Obtener ruta de la API
  const routeData = await getRouteFromMapbox(waypoints);

  if (!routeData) return;

  // 5. ACTUALIZAR DISTANCIA (Esto es lo que se enviará a tu Backend al guardar)
  // routeData.distance viene en metros
  serverDistanceMeters.value = routeData.distance;

  // 6. Dibujar la línea compleja (calle por calle)
  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: routeData.geometry // GeoJSON detallado
    }
  });

  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#3b82f6', // Azul moderno
      'line-width': 4,
      'line-opacity': 0.8
    }
  });
  
  // Ajustar zoom para ver toda la ruta
  const bounds = new mapboxgl.LngLatBounds();
  routeData.geometry.coordinates.forEach(coord => bounds.extend(coord));
  map.fitBounds(bounds, { padding: 80 });
}

function clearPoints() {
  startLatLng.value = null
  endLatLng.value = null
  checkpoints.value = []
  selectedCheckpointIndex.value = null

  drawCheckpoints()
  if (startMarker) {
    startMarker.remove()
    startMarker = null
  }
  if (endMarker) {
    endMarker.remove()
    endMarker = null
  }
  if (map.getSource('route')) {
    map.removeLayer('route')
    map.removeSource('route')
  }

  map.flyTo({ center: [2.1734, 41.3851], zoom: 12 })
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

/*
const distanceMeters = computed(() => {
  if (!startLatLng.value || !endLatLng.value) return null
  let dist = 0
  const points = [startLatLng.value, ...checkpoints.value.filter(cp => cp.lat && cp.lng).map(cp => ({ lat: cp.lat, lng: cp.lng })), endLatLng.value]
  for (let i = 0; i < points.length - 1; i++) {
    dist += haversineMeters(points[i], points[i + 1])
  }
  return dist
})
*/

//const serverDistanceMeters = ref(null)
const formattedDistance = computed(() => {
  // AHORA: Usamos solo la distancia del servidor
  const meters = serverDistanceMeters.value || 0 
  
  if (!meters) return '-'
  const km = meters / 1000
  return `${km.toFixed(2)} km`
})

const router = useRouter()
const toastMessage = ref('')
const toastVisible = ref(false)

function showToast(msg, ms = 1800) {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, ms)
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
  if (checkpoints.value.some(cp => (cp.lat == null || cp.lng == null))) {
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
    const payload = {
      name: name.value.trim(),
      // 1. Enviar como String "lat,lon"
      startPoint: `${startLatLng.value.lat},${startLatLng.value.lng}`,
      endPoint: `${endLatLng.value.lat},${endLatLng.value.lng}`,
      // also include start/end and raw coords for tests/backwards compat
      start: startLatLng.value,
      end: endLatLng.value,
      distanceKm: Number((serverDistanceMeters.value / 1000).toFixed(2)), 
      checkpoints: cps
    }

    const res = await createRoute(payload)
    const returned = res || {}
    serverDistanceMeters.value = returned.distanceMeters ?? returned.distance ?? null

    showToast('Ruta creada correctamente')
    setTimeout(() => {
      router.push({ name: 'RoutesList' })
    }, 900)
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Error creando la ruta.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  initMap()
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
}

.required {
  color: #c53030;
}

.map-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
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
  transform: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  line-height: 30px;
}

.checkpoints-section { background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9; }
.section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.badge { background: #e2e8f0; color: #475569; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 99px; }
.checkpoints-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.checkpoint-row { display: flex; align-items: center; gap: 10px; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; transition: border 0.2s; }
.checkpoint-row:focus-within { border-color: #8b5cf6; }
.cp-number { width: 24px; height: 24px; background: #000000; color: #fff; font-size: 12px; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cp-input { border:none !important; padding:4px 0 !important; font-size:14px !important; background:transparent !important; flex:1; }
.cp-status { font-size: 14px; cursor: help; }
.missing-geo { opacity: 0.5; filter: grayscale(100%); }

.checkpoint-row.selected {
  border-color: #ed8936;
  background: #fff7f0;
}
.checkpoint-row.selected .cp-number {
  background: #ed8936;
}

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

.btn.small {
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 500;
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

.btn-icon { border:none; background:transparent; cursor:pointer; font-size:18px; line-height:1; }
.btn-icon.danger { color:#c53030; }

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

@media (max-width: 720px) {
  .card {
    padding: 20px;
  }

  .coords {
    flex-direction: column;
    gap: 8px;
  }

  .map-controls {
    flex-direction: column;
    align-items: flex-start;
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
}
</style>
