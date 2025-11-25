<template>
  <main>
    <div class="page-container">
      <section class="card">
        <header class="card-header">
          <div>
            <h1>Rutas</h1>
            <p class="muted">Listado de rutas guardadas</p>
          </div>

          <div class="actions">
            <router-link class="btn" :to="{ name: 'RoutesNew' }">Crear ruta</router-link>
          </div>
        </header>

        <div class="card-body">
          <div v-if="loading" class="center">Cargando rutas...</div>

          <div v-else-if="error" class="error-box">{{ error }}</div>

          <div v-else>
            <div v-if="routes.length === 0" class="empty-state">
              <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start">
                <p>No hay rutas todavía.</p>
              </div>
            </div>

            <ul v-else class="routes-list">
              <li v-for="r in routes" :key="r.id" class="route-row">
                <div class="route-info">
                  <strong class="route-name">{{ r.name }}</strong>
                  <span class="route-distance">{{ r.distanceKm ? Number(r.distanceKm).toFixed(2) + ' km' : formatKm(r.distanceMeters) }}</span>
                </div>

                <div class="row-actions">
                  <router-link class="btn ghost" :to="{ name: 'RoutesShow', params: { id: r.id } }">Ver</router-link>
                  <router-link class="btn ghost" :to="{ name: 'RoutesEdit', params: { id: r.id } }">Editar</router-link>
                  <button class="btn danger" @click="openConfirm(r.id)" :disabled="deleting === r.id">
                    <span v-if="deleting === r.id">Borrando...</span>
                    <span v-else>Borrar</span>
                  </button>
                </div>
              </li>
            </ul>
            <!-- Confirm modal utilizado para confirmar borrado -->
            <ConfirmModal :visible="showConfirm" :message="confirmMessage" @confirm="onConfirm" @cancel="onCancel" />
            <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
defineOptions({ name: 'RoutesList' })
import { getRoutes, deleteRoute } from '@/services/routesService.js'

const routes = ref([])
const loading = ref(true)
const error = ref('')
const deleting = ref(null)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await getRoutes()
    // asumimos que la API devuelve un array de objetos con { id, name, distanceMeters }
    routes.value = Array.isArray(data) ? data : []
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Error cargando rutas.'
  } finally {
    loading.value = false
  }
}

const formatKm = (meters) => {
  if (meters == null) return '-'
  const km = Number(meters) / 1000
  return `${km.toFixed(2)} km`
}

// Modal-based delete
const showConfirm = ref(false)
const confirmTarget = ref(null)
const confirmMessage = ref('¿Borrar esta ruta? Esta acción no tiene deshacer.')

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
      // recargar lista para reflejar hard/soft delete según backend
      await load()
      // mostrar toast de éxito breve
      showToast('Ruta borrada correctamente')
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

// Toast simple
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
.card { width:100%; max-width:1000px; background:#fff; border-radius:12px; padding:18px; border:1px solid #eee; box-shadow:0 8px 30px rgba(12,12,12,0.05);}
.card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.card-header h1 { margin:0; font-size:22px }
.muted { color:#666; margin-top:6px }
.card-body { padding-top:6px }
.center { text-align:center; padding:24px }
.error-box { background:#fef2f2; color:#c53030; padding:12px; border-radius:10px; border:1px solid #fecaca }
.empty-state { display:flex; gap:12px; align-items:center; justify-content:space-between; padding:24px }
.routes-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px }
.route-row { display:flex; align-items:center; justify-content:space-between; padding:12px; border-radius:10px; border:1px solid #f1f1f1; background:#fff }
.route-info { display:flex; flex-direction:column }
.route-name { font-weight:700 }
.route-distance { color:#666 }
.row-actions { display:flex; gap:10px }
.btn { padding:10px 14px; border-radius:10px; background:#000; color:#fff; border:none; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center }
.btn.ghost { background:transparent; color:#333; border:1px solid #e6e6e6 }
.btn.danger { background:#c53030 }
.btn:disabled { opacity:0.6; cursor:not-allowed }

@media (max-width: 720px) {
  .route-row { flex-direction:column; align-items:flex-start }
  .row-actions { width:100%; justify-content:flex-start }
}
</style>
