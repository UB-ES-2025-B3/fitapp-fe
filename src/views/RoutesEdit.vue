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
                  <button type="button" class="btn ghost small" @click="clearPoints">Limpiar puntos</button>
                </div>
              </div>

              <div ref="mapContainer" class="map-area" role="img" aria-label="Mapa interactivo para seleccionar inicio y fin"></div>

              <div class="coords">
                <div>Inicio: <strong v-if="startLatLng">{{ startLatLng.lat.toFixed(5) }}, {{ startLatLng.lng.toFixed(5) }}</strong><span v-else> — no seleccionado</span></div>
                <div>Fin: <strong v-if="endLatLng">{{ endLatLng.lat.toFixed(5) }}, {{ endLatLng.lng.toFixed(5) }}</strong><span v-else> — no seleccionado</span></div>
              </div>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
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
}

function onMapClick(e) {
  const { lng, lat } = e.lngLat
  if (mode.value === 'start') {
    startLatLng.value = { lat, lng }
    updateStartMarker()
  } else {
    endLatLng.value = { lat, lng }
    updateEndMarker()
  }
  updateRouteLine()
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
  if (map.getSource && map.getSource('route')) {
    try {
      map.removeLayer('route')
      map.removeSource('route')
    } catch {
      // ignore
    }
  }

  if (startLatLng.value && endLatLng.value) {
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
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#777', 'line-width': 3 }
    })

    const bounds = new mapboxgl.LngLatBounds()
    bounds.extend([startLatLng.value.lng, startLatLng.value.lat])
    bounds.extend([endLatLng.value.lng, endLatLng.value.lat])
    map.fitBounds(bounds, { padding: 80 })
  }
}

function clearPoints() {
  startLatLng.value = null
  endLatLng.value = null
  if (startMarker) { startMarker.remove(); startMarker = null }
  if (endMarker) { endMarker.remove(); endMarker = null }
  if (map && map.getSource && map.getSource('route')) {
    try { map.removeLayer('route'); map.removeSource('route') } catch {
      /* ignore */
    }
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
  return haversineMeters(startLatLng.value, endLatLng.value)
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
    if (data.start) startLatLng.value = { lat: data.start.lat, lng: data.start.lng }
    if (data.end) endLatLng.value = { lat: data.end.lat, lng: data.end.lng }
    const distKm = data.distanceKm
    if (distKm != null) {
      serverDistanceMeters.value = Number(distKm) * 1000
    } else {
      serverDistanceMeters.value = data.distanceMeters ?? data.distance ?? null
    }
    // init map after we set points
    initMap()
    if (startLatLng.value) updateStartMarker()
    if (endLatLng.value) updateEndMarker()
    if (startLatLng.value && endLatLng.value) updateRouteLine()
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

  saving.value = true
  try {
    const id = route.params.id
    const payload = {
      name: name.value.trim(),
      // 1. Enviar como String "lat,lon"
      startPoint: `${startLatLng.value.lat},${startLatLng.value.lng}`,
      endPoint: `${endLatLng.value.lat},${endLatLng.value.lng}`,
      // 2. Calcular y enviar distanceKm
      distanceKm: Number((distanceMeters.value / 1000).toFixed(2))
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
/* Reuse same styles as RoutesNew for consistency */
.page-container { padding: 28px 20px; display:flex; justify-content:center }
.card { width:100%; max-width:760px; background:#fff; border-radius:12px; padding:24px; border:1px solid #eee; box-shadow:0 8px 30px rgba(12,12,12,0.05) }
.card-header h1 { margin:0 0 8px 0; font-size:24px }
.muted { color:#666; margin:0; font-size:14px }
.card-body { margin-top:24px }
.form-row { margin-bottom:20px; display:flex; flex-direction:column }
.form-row label { font-weight:600; margin-bottom:8px; font-size:14px; color:#333 }
.form-row input[type="text"] { padding:11px 12px; border-radius:8px; border:1px solid #ddd; font-size:14px }
.required { color:#c53030 }
.map-area { border-radius:10px; overflow:hidden; border:1px solid #e6edf2; height:450px; width:100%; position:relative; z-index:1; background:#f0f4f8 }
.coords { display:flex; gap:20px; margin-top:12px; color:#555; font-size:13px }
.actions-row { display:flex; gap:12px; align-items:center; margin-top:24px }
.btn { padding:11px 18px; border-radius:8px; background:#000; color:#fff; border:none; cursor:pointer; text-decoration:none; font-size:14px; font-weight:600 }
.btn.ghost { background:transparent; color:#333; border:1px solid #ddd }
.error-box { background:#fef2f2; color:#c53030; padding:14px; border-radius:8px; border:1px solid #fecaca; margin-top:16px; font-size:14px }
.toast { position:fixed; right:20px; bottom:20px; background:#2f855a; color:#fff; padding:12px 16px; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.15); font-size:14px; z-index:1000; font-weight:500 }
</style>
