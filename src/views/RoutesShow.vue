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

            <div class="actions-row">
              <router-link class="btn ghost" :to="{ name: 'RoutesEdit', params: { id: routeData.id } }">Editar</router-link>
              <button class="btn danger" @click="openConfirm(routeData.id)" :disabled="deleting === routeData.id">Borrar</button>
              <router-link class="btn" :to="{ name: 'RoutesList' }">Volver al listado</router-link>
            </div>
          </div>

          <ConfirmModal :visible="showConfirm" :message="confirmMessage" @confirm="onConfirm" @cancel="onCancel" />
          <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { getRoute, deleteRoute } from '@/services/routesService'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

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

let map = null
let startMarker = null
let endMarker = null

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

onMounted(() => {
  // 1. Cargar los datos de la ruta PRIMERO
  loadRoute()
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

@media (max-width: 720px) {
  .card {
    padding: 20px;
  }

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
}
</style>
