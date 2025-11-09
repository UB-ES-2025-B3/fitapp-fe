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
