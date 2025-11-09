<template>
  <main>
    <div class="page-container">
      <section class="card">
        <header class="card-header">
          <h1>Ver ruta</h1>
          <p class="muted">Vista de detalle (pendiente de implementación)</p>
        </header>

        <div class="card-body">
          <!-- Mostrar algunos datos básicos de la ruta -->
          <div v-if="loading" class="center">Cargando...</div>
          <div v-else-if="error" class="error-box">{{ error }}</div>
          <div v-else>
            <h2>{{ routeData.name }}</h2>
            <p>Distancia: {{ formatKm(routeData.distanceMeters) }}</p>
            <div class="form-row">
              <label>Mapa (inicio / fin)</label>
              <div class="map-area" role="img" aria-label="Mapa de la ruta (solo lectura)">
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

          <!-- Confirm modal para borrar desde detalle -->
          <ConfirmModal :visible="showConfirm" :message="confirmMessage" @confirm="onConfirm" @cancel="onCancel" />
          <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { getRoute, deleteRoute } from '@/services/routesService'

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

// Map helpers (same projection used in RoutesNew)
const mapW = 1000
const mapH = 500
const BBOX = { north: 43.0, south: 36.0, west: -9.5, east: 3.5 }

const startLatLng = ref(null)
const endLatLng = ref(null)
const startPoint = ref(null)
const endPoint = ref(null)

function latLngToPixel(ll) {
  if (!ll) return null
  const x = ((ll.lng - BBOX.west) / (BBOX.east - BBOX.west)) * mapW
  const y = ((BBOX.north - ll.lat) / (BBOX.north - BBOX.south)) * mapH
  return { x: Math.max(0, Math.min(mapW, x)), y: Math.max(0, Math.min(mapH, y)) }
}

function extractLatLngs(r) {
  if (!r) return { s: null, e: null }
  const s = r.start ?? r.inicio ?? r.startLatLng ?? (r.startLat && r.startLng ? { lat: r.startLat, lng: r.startLng } : null)
  const e = r.end ?? r.fin ?? r.endLatLng ?? (r.endLat && r.endLng ? { lat: r.endLat, lng: r.endLng } : null)
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
    // Extract start/end coordinates (flexible field names) and compute pixel points for SVG
    const { s, e } = extractLatLngs(routeData.value)
    startLatLng.value = s || null
    endLatLng.value = e || null
    startPoint.value = s ? latLngToPixel(s) : null
    endPoint.value = e ? latLngToPixel(e) : null
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
    // éxito: mostrar toast y después redirigir para que el usuario lo vea
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

onMounted(() => {
  load()
})

// Toast simple para confirmar acciones
const toastMessage = ref('')
const toastVisible = ref(false)
function showToast(msg, ms = 1800) {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, ms)
}
</script>

<style scoped>
.page-container { padding: 28px 20px; display:flex; justify-content:center; }
.card { width:100%; max-width:760px; background:#fff; border-radius:12px; padding:18px; border:1px solid #eee; box-shadow:0 8px 30px rgba(12,12,12,0.05);}
.muted { color:#666; margin-top:6px }
.btn { padding:10px 14px; border-radius:10px; background:#000; color:#fff; border:none; cursor:pointer; text-decoration:none }
</style>
