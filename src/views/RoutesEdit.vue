<template>
  <main>
    <div class="page-container">
      <section class="card">
        <header class="card-header">
          <h1>Editar ruta</h1>
          <p class="muted">Edición de ruta (pendiente de implementación con backend)</p>
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

              <div v-if="googleLoaded" class="map-area" ref="googleMapRef" role="img" aria-label="Mapa de Google Maps para editar inicio y fin"></div>

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
              <button class="btn" :disabled="saving"> <span v-if="saving">Guardando...</span><span v-else>Modificar ruta</span></button>
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
import { useRouter, useRoute } from 'vue-router'
import { getRoute, updateRoute } from '@/services/routesService'

defineOptions({ name: 'RoutesEdit' })

const name = ref('')
const mode = ref('start')
const startPoint = ref(null)
const endPoint = ref(null)
const startLatLng = ref(null)
const endLatLng = ref(null)
const saving = ref(false)
const error = ref('')
const mapRef = ref(null)

const mapW = 1000
const mapH = 500
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const googleLoaded = ref(false)
const googleMapRef = ref(null)
let mapInstance = null
// unused: googleMarkers placeholder removed

const BBOX = { north: 43.0, south: 36.0, west: -9.5, east: 3.5 }

function pixelToLatLng(px, py) {
  const lng = BBOX.west + (px / mapW) * (BBOX.east - BBOX.west)
  const lat = BBOX.north - (py / mapH) * (BBOX.north - BBOX.south)
  return { lat, lng }
}

function onMapClick(e) {
  if (googleLoaded.value && mapInstance) return
  const rect = mapRef.value.getBoundingClientRect()
  const offsetX = e.clientX - rect.left
  const offsetY = e.clientY - rect.top
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

function clearPoints() {
  startPoint.value = null
  endPoint.value = null
  startLatLng.value = null
  endLatLng.value = null
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

const serverDistanceMeters = ref(null)
const formattedDistance = computed(() => {
  const meters = serverDistanceMeters.value ?? distanceMeters.value
  if (!meters) return '-'
  const km = meters / 1000
  return `${km.toFixed(2)} km`
})

const router = useRouter()
const route = useRoute()
const toastMessage = ref('')
const toastVisible = ref(false)
function showToast(msg, ms = 1800) {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, ms)
}

async function load() {
  error.value = ''
  try {
    const id = route.params.id
    const res = await getRoute(id)
    const r = res || {}
    name.value = r.name || r.nombre || ''
    // prefer server start/end if provided
    if (r.start || r.inicio) {
      const s = r.start || r.inicio
      startLatLng.value = { lat: s.lat, lng: s.lng }
      // approximate pixel for SVG
      startPoint.value = { x: 500, y: 250 }
    }
    if (r.end || r.fin) {
      const e = r.end || r.fin
      endLatLng.value = { lat: e.lat, lng: e.lng }
      endPoint.value = { x: 540, y: 260 }
    }
    serverDistanceMeters.value = r.distanceMeters ?? r.distance ?? null
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
      nombre: name.value.trim(),
      start: { lat: startLatLng.value.lat, lng: startLatLng.value.lng },
      end: { lat: endLatLng.value.lat, lng: endLatLng.value.lng },
      inicio: { lat: startLatLng.value.lat, lng: startLatLng.value.lng },
      fin: { lat: endLatLng.value.lat, lng: endLatLng.value.lng }
    }
    const res = await updateRoute(id, payload)
    const returned = res || {}
    serverDistanceMeters.value = returned.distanceMeters ?? returned.distance ?? null
    showToast('Ruta modificada correctamente')
    setTimeout(() => { router.push({ name: 'RoutesList' }) }, 900)
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Error guardando la ruta.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (GMAPS_KEY && !import.meta.vitest) {
    // optional: initGoogleMap() similar to RoutesNew if desired; skip here for brevity
  }
  load()
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

.form-row input[type="text"], 
.form-row input[type="number"] { 
  padding: 11px 12px; 
  border-radius: 8px; 
  border: 1px solid #ddd;
  font-size: 14px;
}

.form-row input[type="text"]:focus, 
.form-row input[type="number"]:focus { 
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

.map-area { 
  border-radius: 10px; 
  overflow: hidden; 
  border: 1px solid #e6edf2; 
  background: linear-gradient(180deg, #f8fbfd, #f6f9fb); 
  height: 400px;
  width: 100%;
  cursor: crosshair;
  position: relative;
}

.map-area svg {
  width: 100%;
  height: 100%;
  display: block;
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
    height: 300px;
  }
}
</style>
