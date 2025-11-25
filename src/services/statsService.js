import api from './api'

/**
 * Get statistics/evolution data for a specific metric and period
 * @param {Object} params - Query parameters
 * @param {string} params.metric - The metric to retrieve (e.g., 'kcal')
 * @param {string} [params.period='30d'] - The time period for the data
 * @returns {Promise<Array<{date: string, value: number}>>} Array of data points
 */
export async function getStats({ metric, period = '30d' }) {
  try {
    const res = await api.get('/api/v1/stats/evolution', {
      params: { metric, period }
    })

    const points = res.data?.points || []
    return points.map(p => {
      // Excluir 'date' y tomar el primer valor numérico que encuentre. Esto es para poder generalizar los diferentes nombres de stats que pueda devolver la API
      const value = Object.entries(p)
        .filter(([key]) => key !== 'date')
        .map(([, val]) => val)
        .find(val => typeof val === 'number') ?? 0

      return {
        date: p.date,
        value
      }
    })
  } catch (err) {
    err.status = err.response?.status
    throw err
  }
}
