import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del servicio
vi.mock('@/services/executionService', () => {
  const getExecutionHistory = vi.fn()
  return { getExecutionHistory }
})

import HistoryList from '@/views/HistoryList.vue'
import { getExecutionHistory } from '@/services/executionService'

beforeEach(() => {
  getExecutionHistory.mockReset()
})

const flushPromises = () => new Promise((res) => setImmediate(res))

describe('HistoryList.vue — Historial de ejecuciones', () => {
  it('muestra skeleton mientras carga', async () => {
    getExecutionHistory.mockImplementation(() => new Promise(() => {}))
    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    expect(wrapper.find('.skeleton-table').exists()).toBe(true)
  })

  it('muestra error si la petición falla', async () => {
    const err = new Error('Fallo')
    err.response = { data: { message: 'Error cargando historial' } }
    getExecutionHistory.mockRejectedValue(err)

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-box').exists()).toBe(true)
    expect(wrapper.find('.error-box').text()).toContain('Error cargando historial')
  })

  it('muestra empty state cuando no hay historial', async () => {
    getExecutionHistory.mockResolvedValue([])
    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('muestra tabla con ejecuciones ordenadas por fecha descendente', async () => {
    // CORRECCIÓN: Usar 'endTime' en lugar de 'date' para que el componente lo mapee bien
    const executions = [
      {
        id: '1',
        routeName: 'Ruta Montaña',
        distanceKm: 5.2,
        durationSec: 1800, // Usar durationSec como espera el componente
        endTime: '2024-12-01T10:00:00Z' // Fecha antigua
      },
      {
        id: '2',
        routeName: 'Ruta Playa',
        distanceKm: 3.8,
        durationSec: 1200,
        endTime: '2024-12-02T14:30:00Z' // Fecha reciente
      }
    ]
    getExecutionHistory.mockResolvedValue(executions)

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('.execution-row')
    expect(rows.length).toBe(2)

    // La primera fila debe ser la más reciente (Ruta Playa)
    expect(rows[0].text()).toContain('Ruta Playa')
    // La segunda fila debe ser la más antigua (Ruta Montaña)
    expect(rows[1].text()).toContain('Ruta Montaña')
  })

  it('formatea correctamente fechas y duraciones', async () => {
    // CORRECCIÓN: Usar estructura cruda correcta
    const executions = [
      {
        id: '1',
        routeName: 'Ruta Test',
        distanceKm: 5,
        durationSec: 3661, // 1h 1m 1s
        endTime: '2024-12-03T15:45:30Z'
      }
    ]
    getExecutionHistory.mockResolvedValue(executions)

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    const text = wrapper.find('.execution-row').text()

    // Verifica formato fecha (DD/MM/YYYY)
    expect(text).toContain('03/12/2024')
    // Verifica formato duración (HH:MM:SS) -> 01:01:01
    expect(text).toContain('01:01:01')
  })

  it('muestra "-" para campos vacíos o null', async () => {
    const executions = [
      {
        id: '1',
        routeName: 'Ruta Sin Datos',
        distanceKm: null,
        durationSec: null,
        endTime: '2024-12-01T10:00:00Z'
      }
    ]
    getExecutionHistory.mockResolvedValue(executions)

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    const text = wrapper.find('.execution-row').text()
    
    // Verifica que aparezca el guión para los datos faltantes
    expect(text).toContain('-')
  })
})