import api from './api'

export async function getStats(payload) {
  try {
    const res = await api.get('/api/v1/stats/evolution', payload)

    const points = res.data?.points || []

    const metric = payload.metric

    return points.map(item => ({
      date: item.date,
      value: item[metric] ?? 0
    }))
  } catch (err) {
    // Propaga el error con el status para manejarlo en el componente
    err.status = err.response?.status;
    throw err;
  }
}
