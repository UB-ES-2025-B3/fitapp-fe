import api from './api'

// Servicio para gestionar rutas (tracks) en la API
// Endpoints asumidos bajo /api/v1/routes

// ============================
// ROUTES (requiere Authorization)
// ============================

/**
 * Obtener todas las rutas del usuario autenticado
 * @returns {Promise<Array>} Lista de rutas
 */
export async function getRoutes() {
  try {
    const res = await api.get("/api/v1/routes/me");
    return res.data;
  } catch (err) {
    // Propaga el error con el status para manejarlo en el componente
    err.status = err.response?.status;
    throw err;
  }
}

/**
 * Obtener una ruta específica por ID
 * @param {string|number} id - ID de la ruta
 * @returns {Promise<Object>} Datos de la ruta
 */
export async function getRoute(id) {
  try {
    const res = await api.get(`/api/v1/routes/me/${id}`);
    return res.data;
  } catch (err) {
    // Propaga el error con el status para manejarlo en el componente (e.g., 404)
    err.status = err.response?.status;
    throw err;
  }
}

/**
 * Crear una nueva ruta
 * @param {Object} payload - Datos de la ruta
 * @param {string} payload.name - Nombre de la ruta
 * @param {Object} payload.start - Coordenadas de inicio { lat, lng }
 * @param {Object} payload.end - Coordenadas de fin { lat, lng }
 * @returns {Promise<Object>} Ruta creada
 */
export async function createRoute(payload) {
  const res = await api.post("/api/v1/routes/me", payload);
  return res.data;
}

/**
 * Actualizar una ruta existente
 * @param {string|number} id - ID de la ruta
 * @param {Object} payload - Datos a actualizar
 * @param {string} [payload.name] - Nombre de la ruta
 * @param {Object} [payload.start] - Coordenadas de inicio { lat, lng }
 * @param {Object} [payload.end] - Coordenadas de fin { lat, lng }
 * @returns {Promise<Object>} Ruta actualizada
 */
export async function updateRoute(id, payload) {
  const res = await api.put(`/api/v1/routes/me/${id}`, payload);
  return res.data;
}

/**
 * Eliminar una ruta
 * @param {string|number} id - ID de la ruta a eliminar
 * @returns {Promise<Object>} Confirmación de eliminación
 */
export async function deleteRoute(id) {
  const res = await api.delete(`/api/v1/routes/me/${id}`);
  return res.data;
}
