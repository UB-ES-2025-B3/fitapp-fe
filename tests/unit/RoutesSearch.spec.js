import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del servicio de rutas para evitar llamadas reales a la API durante los tests
vi.mock('@/services/routesService', () => {
  const getRoutes = vi.fn()
  const deleteRoute = vi.fn()
  return { getRoutes, deleteRoute }
})

import Routes from '@/views/Routes.vue'
import { getRoutes } from '@/services/routesService'

beforeEach(() => {
  // Resetea los mocks antes de cada test para evitar efectos secundarios
  getRoutes.mockReset()
})

// Helper para esperar promesas pendientes y permitir que Vue actualice el DOM
// Necesario porque los mocks usan Promise.resolve que se ejecutan en el siguiente microtask
const flushPromises = () => new Promise((res) => setImmediate(res))

describe('Routes - Búsqueda de rutas', () => {
  it('muestra todas las rutas cuando searchQuery está vacío', async () => {
    // Prepara datos simulados
    const mockRoutes = [
      { id: '1', name: 'Ruta Montaña', distanceMeters: 5000 },
      { id: '2', name: 'Ruta Playa', distanceMeters: 3000 },
      { id: '3', name: 'Ruta Bosque', distanceMeters: 7000 }
    ]
    getRoutes.mockResolvedValue(mockRoutes)

    // Monta el componente (stubs no renderiza router-link ni ConfirmModal)
    const wrapper = mount(Routes, { global: { stubs: ['router-link', 'ConfirmModal'] } })
    // Espera a que las promesas se resuelvan y Vue actualice el DOM
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Verifica que se muestren las 3 rutas
    const rows = wrapper.findAll('.route-row')
    expect(rows.length).toBe(3)
  })

  it('filtra rutas case-insensitive cuando se escribe en el input', async () => {
    const mockRoutes = [
      { id: '1', name: 'Ruta Montaña', distanceMeters: 5000 },
      { id: '2', name: 'Ruta Playa', distanceMeters: 3000 },
      { id: '3', name: 'Ruta Bosque', distanceMeters: 7000 }
    ]
    getRoutes.mockResolvedValue(mockRoutes)

    const wrapper = mount(Routes, { global: { stubs: ['router-link', 'ConfirmModal'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Buscar "montaña" (minúsculas, debe encontrar "Ruta Montaña" gracias a toLowerCase)
    wrapper.vm.searchQuery = 'montaña'
    await wrapper.vm.$nextTick()

    // El filtrado es case-insensitive, así que encontrará la ruta "Ruta Montaña"
    const rows = wrapper.findAll('.route-row')
    expect(rows.length).toBe(1)
    expect(rows[0].find('.route-name').text()).toContain('Montaña')
  })

  it('filtra rutas por búsqueda parcial', async () => {
    const mockRoutes = [
      { id: '1', name: 'Ruta Montaña', distanceMeters: 5000 },
      { id: '2', name: 'Ruta Playa', distanceMeters: 3000 },
      { id: '3', name: 'Ruta Bosque', distanceMeters: 7000 }
    ]
    getRoutes.mockResolvedValue(mockRoutes)

    const wrapper = mount(Routes, { global: { stubs: ['router-link', 'ConfirmModal'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Buscar "ruta" (búsqueda parcial - está en todas las rutas)
    wrapper.vm.searchQuery = 'ruta'
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('.route-row')
    expect(rows.length).toBe(3)

    // Buscar "Playa" (búsqueda parcial - está solo en una ruta)
    wrapper.vm.searchQuery = 'Playa'
    await wrapper.vm.$nextTick()

    const filteredRows = wrapper.findAll('.route-row')
    expect(filteredRows.length).toBe(1)
    expect(filteredRows[0].find('.route-name').text()).toContain('Playa')
  })

  it('muestra mensaje de "no resultados" cuando la búsqueda no encuentra nada', async () => {
    const mockRoutes = [
      { id: '1', name: 'Ruta Montaña', distanceMeters: 5000 },
      { id: '2', name: 'Ruta Playa', distanceMeters: 3000 }
    ]
    getRoutes.mockResolvedValue(mockRoutes)

    const wrapper = mount(Routes, { global: { stubs: ['router-link', 'ConfirmModal'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Buscar algo que no existe en ninguna ruta
    wrapper.vm.searchQuery = 'xyz123'
    await wrapper.vm.$nextTick()

    // El empty-state solo se muestra cuando hay rutas pero ninguna coincide con la búsqueda
    const emptyState = wrapper.find('.empty-state')
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.text()).toContain('No se encontraron rutas con ese nombre')
  })

  it('vuelve a mostrar todas las rutas cuando se borra la búsqueda', async () => {
    const mockRoutes = [
      { id: '1', name: 'Ruta Montaña', distanceMeters: 5000 },
      { id: '2', name: 'Ruta Playa', distanceMeters: 3000 },
      { id: '3', name: 'Ruta Bosque', distanceMeters: 7000 }
    ]
    getRoutes.mockResolvedValue(mockRoutes)

    const wrapper = mount(Routes, { global: { stubs: ['router-link', 'ConfirmModal'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Filtrar por "Montaña" - solo muestra 1 ruta
    wrapper.vm.searchQuery = 'Montaña'
    await wrapper.vm.$nextTick()
    let rows = wrapper.findAll('.route-row')
    expect(rows.length).toBe(1)

    // Borrar búsqueda (vaciar searchQuery) - vuelve a mostrar todas
    wrapper.vm.searchQuery = ''
    await wrapper.vm.$nextTick()
    rows = wrapper.findAll('.route-row')
    expect(rows.length).toBe(3)
  })

  it('actualiza instantáneamente al escribir en el input', async () => {
    const mockRoutes = [
      { id: '1', name: 'Ruta Montaña', distanceMeters: 5000 },
      { id: '2', name: 'Ruta Playa', distanceMeters: 3000 },
      { id: '3', name: 'Ruta Bosque', distanceMeters: 7000 }
    ]
    getRoutes.mockResolvedValue(mockRoutes)

    const wrapper = mount(Routes, { global: { stubs: ['router-link', 'ConfirmModal'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Encontrar el input de búsqueda
    const searchInput = wrapper.find('.search-input')
    expect(searchInput.exists()).toBe(true)

    // Simular escritura en el input - gracias a v-model se actualiza searchQuery instantáneamente
    await searchInput.setValue('playa')
    await wrapper.vm.$nextTick()

    // Verifica que la búsqueda se aplicó instantáneamente (sin latencia API)
    const rows = wrapper.findAll('.route-row')
    expect(rows.length).toBe(1)
    expect(rows[0].find('.route-name').text()).toContain('Playa')
  })
})
