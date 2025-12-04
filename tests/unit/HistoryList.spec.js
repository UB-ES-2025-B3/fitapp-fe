import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del servicio de ejecuciones
vi.mock('@/services/executionService', () => {
  const getExecutionHistory = vi.fn()
  return { getExecutionHistory }
})

import HistoryList from '@/views/HistoryList.vue'
import { getExecutionHistory } from '@/services/executionService'

beforeEach(() => {
  getExecutionHistory.mockReset()
})

// Helper para esperar promesas pendientes
const flushPromises = () => new Promise((res) => setImmediate(res))

describe('HistoryList.vue — Historial de ejecuciones', () => {
  it('muestra skeleton mientras carga', async () => {
    // Promesa pendiente para mantener el estado de carga
    getExecutionHistory.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })

    // Debe mostrar skeleton mientras se cargan los datos
    expect(wrapper.find('.skeleton-table').exists()).toBe(true)
  })

  it('muestra error si la petición falla', async () => {
    const err = new Error('Fallo')
    err.response = { data: { message: 'Error cargando historial' } }
    getExecutionHistory.mockRejectedValue(err)

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Debe mostrar el mensaje de error
    expect(wrapper.find('.error-box').exists()).toBe(true)
    expect(wrapper.find('.error-box').text()).toContain('Error cargando historial')
    // El botón de reintentar debe estar disponible
    expect(wrapper.find('.btn-retry').exists()).toBe(true)
  })

  it('muestra empty state cuando no hay historial', async () => {
    getExecutionHistory.mockResolvedValue([])

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Debe mostrar empty state
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-state').text()).toContain('No hay actividades')
  })

  it('muestra tabla con ejecuciones ordenadas por fecha descendente', async () => {
    const executions = [
      {
        id: '1',
        routeName: 'Ruta Montaña',
        distanceKm: 5.2,
        durationSeconds: 1800, // 30 min
        startedAt: '2024-12-01T10:00:00Z'
      },
      {
        id: '2',
        routeName: 'Ruta Playa',
        distanceKm: 3.8,
        durationSeconds: 1200, // 20 min
        startedAt: '2024-12-02T14:30:00Z'
      }
    ]
    getExecutionHistory.mockResolvedValue(executions)

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Debe mostrar la tabla
    expect(wrapper.find('.history-table').exists()).toBe(true)
    const rows = wrapper.findAll('.execution-row')
    expect(rows.length).toBe(2)

    // Verificar que esté ordenada por fecha descendente (más reciente primero)
    // La primera fila debe ser la del 2024-12-02 (más reciente)
    const firstRowText = rows[0].text()
    expect(firstRowText).toContain('Ruta Playa')

    // La segunda fila debe ser la del 2024-12-01
    const secondRowText = rows[1].text()
    expect(secondRowText).toContain('Ruta Montaña')
  })

  it('formatea correctamente fechas y duraciones', async () => {
    const executions = [
      {
        id: '1',
        routeName: 'Ruta Test',
        distanceKm: 5,
        durationSeconds: 3661, // 1 hora, 1 minuto, 1 segundo
        startedAt: '2024-12-03T15:45:30Z'
      }
    ]
    getExecutionHistory.mockResolvedValue(executions)

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    const row = wrapper.find('.execution-row')
    const text = row.text()

    // Verifica que la fecha esté formateada
    expect(text).toContain('03/12/2024') // DD/MM/YYYY
    // Verifica que la duración esté formateada en HH:MM:SS
    expect(text).toContain('01:01:01')
  })

  it('muestra "-" para campos vacíos o null', async () => {
    const executions = [
      {
        id: '1',
        routeName: 'Ruta Sin Datos',
        distanceKm: null,
        durationSeconds: null,
        startedAt: '2024-12-01T10:00:00Z'
      }
    ]
    getExecutionHistory.mockResolvedValue(executions)

    const wrapper = mount(HistoryList, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    const row = wrapper.find('.execution-row')
    const text = row.text()

    // Debe mostrar "-" para distancia y tiempo null
    expect(text).toContain('-')
  })
})
