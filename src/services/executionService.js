import api from './api'


/**
 * Llama a GET /api/v1/executions
 * Devuelve TODAS las ejecuciones del usuario.
 */
export const getMyExecutions = async () => {
  const res = await api.get('/api/v1/executions/me')
  return res.data
}

/**
 * Inicia una ejecución para una ruta.
 * POST /api/v1/executions/start/{routeId}
 * @param {string|number} routeId
 * @param {{ activityType: string, notes?: string }} payload
 */
export const startExecution = async (routeId, payload) => {
  const res = await api.post(`/api/v1/executions/me/start/${routeId}`, payload)
  return res.data
}

/**
 * Pausa una ejecución.
 * POST /api/v1/executions/pause/{executionId}
 */
export const pauseExecution = async (executionId) => {
  const res = await api.post(`/api/v1/executions/me/pause/${executionId}`)
  return res.data
}

/**
 * Reanuda una ejecución.
 * POST /api/v1/executions/resume/{executionId}
 */
export const resumeExecution = async (executionId) => {
  const res = await api.post(`/api/v1/executions/me/resume/${executionId}`)
  return res.data
}

/**
 * Finaliza una ejecución.
 * POST /api/v1/executions/finish/{executionId}
 * @param {{ activityType: string, notes?: string }} payload
 */
export const finishExecution = async (executionId, payload) => {
  const res = await api.post(`/api/v1/executions/me/finish/${executionId}`, payload)
  return res.data
}