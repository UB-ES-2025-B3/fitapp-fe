import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'

// 1. Mock de servicios
vi.mock('@/services/authService', () => {
  const getProfile = vi.fn()
  const updateProfile = vi.fn()
  const updatePassword = vi.fn()
  return { getProfile, updateProfile, updatePassword }
})

// 2. Mock del Router
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ query: {} })
}))

// 3. Imports
import Profile from '@/views/Profile.vue'
import { updatePassword } from '@/services/authService'

// Helper para montar con Pinia configurado
const mountOptions = {
  global: {
    plugins: [createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        session: { token: 'fake-token', profileExists: true }
      }
    })],
    stubs: { 
      RouterLink: { template: '<a><slot /></a>' },
      KpiCard: true 
    }
  }
}

describe('Profile.vue — Funcionalidad Cambio de Contraseña', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('Valida localmente que las contraseñas coincidan antes de llamar a la API', async () => {
    const wrapper = mount(Profile, mountOptions)
    await flushPromises() 

    const card = wrapper.find('.password-card')
    const inputs = card.findAll('input')
    // inputs: [0] current, [1] new, [2] confirm

    await inputs[0].setValue('PassActual123')
    await inputs[1].setValue('PassNueva123')
    await inputs[2].setValue('NoCoincide!!!') 

    await card.find('button[type="submit"]').trigger('submit')
    
    await wrapper.vm.$nextTick()

    // Verificaciones
    expect(wrapper.text()).toContain('Las contraseñas no coinciden')
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('Maneja error del servidor (ej. contraseña actual incorrecta)', async () => {
    // 1. Configurar fallo del servidor
    const errorMock = new Error('Error')
    errorMock.response = { data: { message: 'La contraseña actual es incorrecta' } }
    updatePassword.mockRejectedValue(errorMock)

    const wrapper = mount(Profile, mountOptions)
    await flushPromises() // Carga inicial

    const card = wrapper.find('.password-card')
    const inputs = card.findAll('input')

    // Rellenamos datos válidos visualmente
    await inputs[0].setValue('PassMal')
    await inputs[1].setValue('Nueva1234')
    await inputs[2].setValue('Nueva1234')

    // Enviamos
    await card.find('button[type="submit"]').trigger('submit')
    
    // Esperamos varias veces para garantizar que la promesa falle Y Vue repinte
    await flushPromises()
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10)) // Pequeña pausa real para el DOM

    // Verificaciones
    expect(updatePassword).toHaveBeenCalled()
    
    // Buscamos específicamente el mensaje de error en la tarjeta
    // Esto es más preciso que buscar en todo el wrapper
    expect(card.text()).toContain('La contraseña actual es incorrecta')
  })

  it('Cambio exitoso llama a la API y limpia los campos', async () => {
    // 1. Configurar éxito del servidor
    updatePassword.mockResolvedValue({ success: true })

    const wrapper = mount(Profile, mountOptions)
    await flushPromises()

    const card = wrapper.find('.password-card')
    const inputs = card.findAll('input')

    // Rellenamos todo correcto
    await inputs[0].setValue('Actual1234')
    await inputs[1].setValue('Nueva1234')
    await inputs[2].setValue('Nueva1234')

    // Enviamos
    await card.find('button[type="submit"]').trigger('submit')
    
    // [SOLUCIÓN ROBUSTA]
    await flushPromises()
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    // Verificaciones
    
    // A) Se llamó a la función con los argumentos correctos
    expect(updatePassword).toHaveBeenCalledWith('Actual1234', 'Nueva1234', 'Nueva1234')
    
    // B) Los inputs se limpiaron visualmente
    expect(inputs[0].element.value).toBe('')
    expect(inputs[1].element.value).toBe('')
    expect(inputs[2].element.value).toBe('')
  })
})