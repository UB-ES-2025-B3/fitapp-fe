import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'

// Mocks Servicios
vi.mock('@/services/routesService', () => ({
  getRoute: vi.fn()
}))
vi.mock('@/services/executionService', () => ({
  pauseExecution: vi.fn(),
  resumeExecution: vi.fn(),
  finishExecution: vi.fn()
}))

// Mock Router
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock })
}))

// Imports
import ActiveRun from '@/views/ActiveRun.vue'
// [IMPORTANTE] Importamos el componente del modal para buscarlo de forma segura
import ExecutionFinishModal from '@/components/ExecutionFinishModal.vue' 
import { getRoute } from '@/services/routesService'
import { pauseExecution, resumeExecution, finishExecution } from '@/services/executionService'

describe('ActiveRun.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })

  const mockExecution = {
    id: 'exec1',
    routeId: 'route1',
    status: 'IN_PROGRESS',
    startTime: new Date().toISOString(),
    totalPausedTimeSec: 0
  }

  const mockRoute = {
    id: 'route1',
    name: 'Ruta de Prueba',
    distanceKm: 5.5
  }

  it('Carga datos de la ruta al montar', async () => {
    getRoute.mockResolvedValue(mockRoute)
    
    const wrapper = mount(ActiveRun, {
      global: {
        plugins: [createTestingPinia({
          initialState: { session: { activeExecution: mockExecution } }
        })],
        // Stub simple es suficiente
        stubs: { RouterLink: true, ExecutionFinishModal: true }
      }
    })

    await flushPromises() 

    expect(getRoute).toHaveBeenCalledWith('route1')
    expect(wrapper.text()).toContain('Ruta de Prueba')
  })

  it('Botón Pausar llama a pauseExecution', async () => {
    getRoute.mockResolvedValue(mockRoute)
    pauseExecution.mockResolvedValue({ ...mockExecution, status: 'PAUSED' })

    const wrapper = mount(ActiveRun, {
      global: {
        plugins: [createTestingPinia({
          initialState: { session: { activeExecution: mockExecution } },
          stubActions: false 
        })],
        stubs: { RouterLink: true, ExecutionFinishModal: true }
      }
    })
    await flushPromises()

    const pauseBtn = wrapper.find('.btn-pause')
    expect(pauseBtn.exists()).toBe(true)
    
    await pauseBtn.trigger('click')
    expect(pauseExecution).toHaveBeenCalledWith('exec1')
  })

  it('Botón Reanudar aparece cuando está pausado', async () => {
    getRoute.mockResolvedValue(mockRoute)
    const pausedExec = { ...mockExecution, status: 'PAUSED' }
    
    const wrapper = mount(ActiveRun, {
      global: {
        plugins: [createTestingPinia({
          initialState: { session: { activeExecution: pausedExec } }
        })],
        stubs: { RouterLink: true, ExecutionFinishModal: true }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('PAUSADO')
    const resumeBtn = wrapper.find('.btn-resume')
    expect(resumeBtn.exists()).toBe(true)
    
    resumeExecution.mockResolvedValue({ ...pausedExec, status: 'IN_PROGRESS' })
    await resumeBtn.trigger('click')
    expect(resumeExecution).toHaveBeenCalledWith('exec1')
  })

  it('Abrir modal de finalizar y guardar', async () => {
    getRoute.mockResolvedValue(mockRoute)
    finishExecution.mockResolvedValue({}) 

    const wrapper = mount(ActiveRun, {
      global: {
        plugins: [createTestingPinia({
          initialState: { session: { activeExecution: mockExecution } },
          stubActions: false 
        })],
        stubs: {
          RouterLink: true,
          // Usamos true para que Vue Test Utils cree un stub estándar
          ExecutionFinishModal: true 
        }
      }
    })
    await flushPromises()

    // 1. Clic en Finalizar para abrir modal
    await wrapper.find('.btn-finish').trigger('click')
    // Esperar a que Vue actualice el DOM (v-if="showFinishModal")
    await wrapper.vm.$nextTick()
    
    // 2. Encontrar el componente usando la IMPORTACIÓN (Infalible)
    const modal = wrapper.findComponent(ExecutionFinishModal)
    expect(modal.exists()).toBe(true)

    // 3. Emitir evento 'save' desde el stub
    const payload = { activityType: 'RUNNING_MODERATE', notes: 'Test' }
    modal.vm.$emit('save', payload)
    
    // 4. Esperar ciclos
    await wrapper.vm.$nextTick()
    await flushPromises()
    
    // 5. Verificar
    expect(finishExecution).toHaveBeenCalledWith('exec1', payload)
    expect(pushMock).toHaveBeenCalledWith('/')
  })
})