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

// Mock de authService para obtener perfil (objetivo diario)
vi.mock('@/services/authService', () => ({
  getProfile: vi.fn()
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
import { getProfile } from '@/services/authService'

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


  it('Flujo completo: Finalizar -> Ver Puntos -> Volver a Inicio', async () => {
    // A. SETUP DE DATOS
    getRoute.mockResolvedValue(mockRoute)
    
    // 1. Mock de finishExecution: Devuelve puntos y calorías
    finishExecution.mockResolvedValue({ 
      id: 'exec1', 
      status: 'FINISHED', 
      points: 150, 
      calories: 600 
    })

    // 2. Mock de getProfile: Objetivo diario menor a calorías (para activar bonus visual)
    getProfile.mockResolvedValue({ 
      firstName: 'Test', 
      points: 1000, 
      goalKcalDaily: 500 
    })

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

    // B. ABRIR MODAL DE FINALIZAR
    await wrapper.find('.btn-finish').trigger('click')
    await wrapper.vm.$nextTick()
    
    // Validar que se abre el modal de input
    const finishModal = wrapper.findComponent(ExecutionFinishModal)
    expect(finishModal.exists()).toBe(true)

    // C. GUARDAR (Simular evento 'save')
    const payload = { activityType: 'RUNNING_MODERATE', notes: 'Test' }
    finishModal.vm.$emit('save', payload)
    
    // Esperar promesas (llamada a API)
    await flushPromises()
    
    // VERIFICACIONES INTERMEDIAS
    // 1. Se llamó al servicio con los datos correctos
    expect(finishExecution).toHaveBeenCalledWith('exec1', payload)
    
    // 2. [CAMBIO IMPORTANTE] NO se debe haber redirigido todavía
    expect(pushMock).not.toHaveBeenCalled() 

    // D. VERIFICAR MODAL DE PUNTOS
    // Buscamos el contenedor del modal de puntos
    const pointsModal = wrapper.find('.points-modal-card')
    expect(pointsModal.exists()).toBe(true)
    
    // 1. Verifica que muestra los puntos del backend
    expect(pointsModal.text()).toContain('150')
    
    // 2. Verifica que muestra mensaje de bonus (porque 600 kcal > 500 objetivo)
    expect(pointsModal.text()).toContain('Has superado tu meta diaria')

    // E. CERRAR Y REDIRIGIR
    const closeBtn = pointsModal.find('.btn-primary') // Botón "Volver a Inicio"
    await closeBtn.trigger('click')
    
    // Ahora SÍ debe redirigir
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('Muestra mensaje estándar si no supera objetivo', async () => {
    getRoute.mockResolvedValue(mockRoute)
    
    // Backend devuelve pocos puntos y pocas calorías
    finishExecution.mockResolvedValue({ points: 10, calories: 100 })
    
    // Perfil con objetivo alto (no se supera)
    getProfile.mockResolvedValue({ goalKcalDaily: 2000 })

    const wrapper = mount(ActiveRun, {
      global: {
        plugins: [createTestingPinia({ initialState: { session: { activeExecution: mockExecution } } })],
        stubs: { RouterLink: true, ExecutionFinishModal: true }
      }
    })
    await flushPromises()

    // Simular flujo rápido
    const finishModal = wrapper.findComponent(ExecutionFinishModal)
    // Forzamos la apertura lógica (o simulamos clicks)
    wrapper.vm.showFinishModal = true 
    await wrapper.vm.$nextTick()
    
    wrapper.findComponent(ExecutionFinishModal).vm.$emit('save', { activityType: 'WALK' })
    await flushPromises()

    const pointsModal = wrapper.find('.points-modal-card')
    
    // Verificar que NO sale el mensaje de bonus
    expect(pointsModal.text()).not.toContain('Has superado tu meta diaria')
    expect(pointsModal.text()).toContain('Gran esfuerzo, sigue así')
    expect(pointsModal.text()).toContain('10') // Puntos base
  })

})