import api from './api'

// Servicio para gestionar rutas (tracks) en la API
// Endpoints asumidos bajo /api/v1/routes

export async function getRoutes() {
  const res = await api.get('/api/v1/routes')
  return res.data
}

export async function getRoute(id) {
  const res = await api.get(`/api/v1/routes/${id}`)
  return res.data
}

export async function createRoute(payload) {
  const res = await api.post('/api/v1/routes', payload)
  return res.data
}

export async function updateRoute(id, payload) {
  const res = await api.put(`/api/v1/routes/${id}`, payload)
  return res.data
}

export async function deleteRoute(id) {
  const res = await api.delete(`/api/v1/routes/${id}`)
  return res.data
}
