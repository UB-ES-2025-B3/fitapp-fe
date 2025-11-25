import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/routesService', () => {
  const getRoute = vi.fn()
  const deleteRoute = vi.fn()
  return { getRoute, deleteRoute }
})

vi.mock('@/services/executionService', () => ({
  startExecution: vi.fn(),
  pauseExecution: vi.fn(),
  resumeExecution: vi.fn(),
  finishExecution: vi.fn(),
  getMyExecutions: vi.fn()
}))

vi.mock('vue-router', () => {
  const push = vi.fn()
  return {
    useRouter: () => ({ push }),
    useRoute: () => ({ params: { id: 'r1' } }),
    __push: push
  }
})

vi.mock('@/stores/session.js', () => ({
  useSessionStore: () => ({
    token: 'mock-token',
    activeExecution: null,
    fetchActiveExecution: vi.fn()
  })
}))

import RoutesShow from '@/views/RoutesShow.vue'
import { getRoute } from '@/services/routesService'

beforeEach(() => {
  getRoute.mockReset()
  vi.useRealTimers()
})

describe('RoutesShow.vue — Visualización de checkpoints', () => {
  it('Muestra checkpoints cuando la ruta los tiene', async () => {
    getRoute.mockResolvedValue({
      id: 'r1',
      name: 'Ruta con paradas',
      startPoint: '41.38,2.17',
      endPoint: '41.39,2.18',
      distanceMeters: 2000,
      checkpoints: [
        { id: 'cp1', name: 'Parada 1', point: '41.385,2.175' },
        { id: 'cp2', name: 'Parada 2', point: '41.387,2.176' }
      ]
    })

    const wrapper = mount(RoutesShow, {
      global: {
        stubs: ['router-link', 'ConfirmModal']
      }
    })

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.checkpoints-section').exists()).toBe(true)
    expect(wrapper.find('.badge').text()).toBe('2')

    const checkpointRows = wrapper.findAll('.checkpoint-row')
    expect(checkpointRows.length).toBe(2)
    expect(checkpointRows[0].find('.cp-name').text()).toBe('Parada 1')
    expect(checkpointRows[1].find('.cp-name').text()).toBe('Parada 2')
  })

  it('No muestra sección de checkpoints cuando no hay', async () => {
    getRoute.mockResolvedValue({
      id: 'r1',
      name: 'Ruta sin paradas',
      startPoint: '41.38,2.17',
      endPoint: '41.39,2.18',
      distanceMeters: 1500,
      checkpoints: []
    })

    const wrapper = mount(RoutesShow, {
      global: {
        stubs: ['router-link', 'ConfirmModal']
      }
    })

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.checkpoints-section').exists()).toBe(false)
  })

  it('Filtra checkpoints sin coordenadas válidas', async () => {
    getRoute.mockResolvedValue({
      id: 'r1',
      name: 'Ruta mixta',
      startPoint: '41.38,2.17',
      endPoint: '41.39,2.18',
      checkpoints: [
        { id: 'cp1', name: 'Válida', point: '41.385,2.175' },
        { id: 'cp2', name: 'Inválida', point: 'invalid' },
        { id: 'cp3', name: 'Otra válida', point: '41.387,2.176' }
      ]
    })

    const wrapper = mount(RoutesShow, {
      global: {
        stubs: ['router-link', 'ConfirmModal']
      }
    })

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.badge').text()).toBe('2')
    const rows = wrapper.findAll('.checkpoint-row')
    expect(rows.length).toBe(2)
  })
})
