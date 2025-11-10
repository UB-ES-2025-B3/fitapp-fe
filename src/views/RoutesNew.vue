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
                  <button type="button" class="btn ghost small" @click="clearPoints">Limpiar puntos</button>
                </div>
              </div>

              <div v-if="googleLoaded" class="map-area" ref="googleMapRef" role="img" aria-label="Mapa de Google Maps para seleccionar inicio y fin"></div>

              <div v-else class="map-area" ref="mapRef" @click="onMapClick($event)" role="img" aria-label="Mapa para seleccionar inicio y fin">
                <svg :width="mapW" :height="mapH" viewBox="0 0 1000 500">
                  <rect x="0" y="0" width="1000" height="500" fill="#f6f9fb" stroke="#e6edf2" />
                  <g v-if="startPoint">
                    <circle :cx="startPoint.x" :cy="startPoint.y" r="8" fill="#2b6cb0" />
                    <text :x="startPoint.x + 12" :y="startPoint.y + 4" font-size="14" fill="#2b6cb0">Inicio</text>
                  </g>
                  <g v-if="endPoint">
                    <circle :cx="endPoint.x" :cy="endPoint.y" r="8" fill="#c53030" />
                    <text :x="endPoint.x + 12" :y="endPoint.y + 4" font-size="14" fill="#c53030">Fin</text>
                  </g>
                  <g v-if="startPoint && endPoint">
                    <line :x1="startPoint.x" :y1="startPoint.y" :x2="endPoint.x" :y2="endPoint.y" stroke="#777" stroke-dasharray="6 4" />
                  </g>
                </svg>
              </div>

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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { createRoute } from '@/services/routesService'

defineOptions({ name: 'RoutesNew' })

// Simple pseudo-map: we map click position inside the box (1000x500 svg)
// to a latitude/longitude using a visible bounding box. This avoids
// adding an external map library while keeping click-to-set behaviour.

const name = ref('')
const mode = ref('start') // 'start' or 'end'
const startPoint = ref(null) // { x, y }
const endPoint = ref(null)
const startLatLng = ref(null) // { lat, lng }
const endLatLng = ref(null)
const saving = ref(false)
const error = ref('')
const mapRef = ref(null)

const mapW = 1000
const mapH = 500
// Google Maps
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const googleLoaded = ref(false)
const googleMapRef = ref(null)
let mapInstance = null
let googleMarkers = { start: null, end: null }

// Simple geographic bounding box for converting pixel->latlng
// Choose a default (Spain-ish) bbox to make distances reasonable.
const BBOX = { north: 43.0, south: 36.0, west: -9.5, east: 3.5 }

function pixelToLatLng(px, py) {
  // px,py relative to svg viewBox 0..1000,0..500
  const lng = BBOX.west + (px / mapW) * (BBOX.east - BBOX.west)
  const lat = BBOX.north - (py / mapH) * (BBOX.north - BBOX.south)
  return { lat, lng }
}


function onMapClick(e) {
  // If Google Maps loaded, clicks are handled by map listener; otherwise use SVG fallback
  if (googleLoaded.value && mapInstance) {
    // ignore svg click handler when google map is active
    return
  }

  // determine click relative to svg
  const rect = mapRef.value.getBoundingClientRect()
  const offsetX = e.clientX - rect.left
  const offsetY = e.clientY - rect.top
  // map to svg coordinates (scale in case CSS resized)
  const scaleX = mapW / rect.width
  const scaleY = mapH / rect.height
  const x = Math.max(0, Math.min(mapW, offsetX * scaleX))
  const y = Math.max(0, Math.min(mapH, offsetY * scaleY))

  const ll = pixelToLatLng(x, y)

  if (mode.value === 'start') {
    startPoint.value = { x, y }
    startLatLng.value = ll
  } else {
    endPoint.value = { x, y }
    endLatLng.value = ll
  }
}

// Load Google Maps script dynamically
function loadGoogleMaps(key) {
  return new Promise((resolve, reject) => {
    if (!key) return reject(new Error('No Google Maps API key'))
    if (window.google && window.google.maps) return resolve(window.google.maps)

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google && window.google.maps) resolve(window.google.maps)
      else reject(new Error('Google Maps failed to load'))
    }
    script.onerror = () => reject(new Error('Google Maps script error'))
    document.head.appendChild(script)
  })
}

function setGoogleMarker(kind, latLng) {
  if (!window.google || !mapInstance) return
  const gLatLng = new window.google.maps.LatLng(latLng.lat, latLng.lng)
  if (googleMarkers[kind]) {
    googleMarkers[kind].setPosition(gLatLng)
  } else {
    googleMarkers[kind] = new window.google.maps.Marker({ map: mapInstance, position: gLatLng, label: kind === 'start' ? 'S' : 'F' })
  }
  // update reactive values
  if (kind === 'start') {
    startLatLng.value = { lat: latLng.lat, lng: latLng.lng }
  } else {
    endLatLng.value = { lat: latLng.lat, lng: latLng.lng }
  }
}

async function initGoogleMap() {
  if (!GMAPS_KEY) return
  try {
    const gmaps = await loadGoogleMaps(GMAPS_KEY)
    googleLoaded.value = true
    // center on Barcelona
    const center = { lat: 41.3851, lng: 2.1734 }
    mapInstance = new gmaps.Map(googleMapRef.value, { center, zoom: 13 })

    // click listener on map to set start/end
    mapInstance.addListener('click', (ev) => {
      const lat = ev.latLng.lat()
      const lng = ev.latLng.lng()
      if (mode.value === 'start') setGoogleMarker('start', { lat, lng })
      else setGoogleMarker('end', { lat, lng })
    })
  } catch {
    // fail silently and keep SVG fallback
    googleLoaded.value = false
  }
}

function clearPoints() {
  startPoint.value = null
  endPoint.value = null
  startLatLng.value = null
  endLatLng.value = null
}

function haversineMeters(a, b) {
  if (!a || !b) return null
  const R = 6371000 // meters
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

const serverDistanceMeters = ref(null)
const formattedDistance = computed(() => {
  // Prefer server-provided distance after create; otherwise show local estimate or '-' if none
  const meters = serverDistanceMeters.value ?? distanceMeters.value
  if (!meters) return '-'
  const km = meters / 1000
  return `${km.toFixed(2)} km`
})

const router = useRouter()
// Simple toast for success messages (local to this component)
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

  // Guardar
  saving.value = true
  try {
    const payload = {
      name: name.value.trim(),
      nombre: name.value.trim(), // duplicate in spanish in case backend expects spanish keys
      // send start/end as objects; backend will calculate distance
      start: { lat: startLatLng.value.lat, lng: startLatLng.value.lng },
      end: { lat: endLatLng.value.lat, lng: endLatLng.value.lng },
      inicio: { lat: startLatLng.value.lat, lng: startLatLng.value.lng },
      fin: { lat: endLatLng.value.lat, lng: endLatLng.value.lng }
    }

    const res = await createRoute(payload)
    // backend should return the created route including calculated distance (meters)
    const returned = res || {}
    // try common fields
    serverDistanceMeters.value = returned.distanceMeters ?? returned.distance ?? null

    // show success toast then redirect after a short delay so user sees calculated distance
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
  // placeholder: nothing to do
  // Try to initialize Google Maps if key is present
  // Avoid loading Google Maps during unit tests (Vitest) to prevent
  // external script fetches and timing issues. import.meta.vitest is defined
  // when running under Vitest.
  if (GMAPS_KEY && !import.meta.vitest) {
    initGoogleMap().catch(() => {})
  }
})
</script>

<style scoped>
.page-container { padding: 28px 20px; display:flex; justify-content:center; }
.card { width:100%; max-width:760px; background:#fff; border-radius:12px; padding:18px; border:1px solid #eee; box-shadow:0 8px 30px rgba(12,12,12,0.05);}
.muted { color:#666; margin-top:6px }
.form-row { margin-bottom:14px; display:flex; flex-direction:column }
.form-row label { font-weight:600; margin-bottom:6px }
.form-row input[type="text"], .form-row input[type="number"] { padding:10px; border-radius:8px; border:1px solid #e6e6e6 }
.required { color:#c53030 }
.map-area { border-radius:10px; overflow:hidden; border:1px solid #e6edf2; background:linear-gradient(180deg,#f8fbfd,#f6f9fb); height:300px; display:flex; align-items:center; justify-content:center; cursor:crosshair }
.coords { display:flex; gap:16px; margin-top:8px; color:#333 }
.map-controls { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px }
.mode label { margin-right:8px }
.actions-row { display:flex; gap:10px; align-items:center }
.btn { padding:10px 14px; border-radius:10px; background:#000; color:#fff; border:none; cursor:pointer; text-decoration:none }
.btn.ghost { background:transparent; color:#333; border:1px solid #e6e6e6 }
.btn.small { padding:6px 8px; font-size:13px }
.error-box { background:#fef2f2; color:#c53030; padding:12px; border-radius:10px; border:1px solid #fecaca }

.toast { position:fixed; right:20px; bottom:20px; background:#2f855a; color:#fff; padding:10px 14px; border-radius:10px; box-shadow:0 6px 18px rgba(0,0,0,0.12) }

@media (max-width:720px) {
  .coords { flex-direction:column }
}
</style>
