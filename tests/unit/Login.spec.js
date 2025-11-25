import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'

// Mocks
vi.mock('@/services/authService', () => ({
  loginUser: vi.fn(),
  getProfile: vi.fn() // Se añade por si el componente lo usa indirectamente
}))

// Mock router
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock })
}))

import Login from '@/views/Login.vue'
import { loginUser } from '@/services/authService'
import { useSessionStore } from '@/stores/session'

// Stub manual para RouterLink para evitar problemas de renderizado
const RouterLinkStub = {
  template: '<a><slot /></a>',
  props: ['to']
}

describe('Login.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Muestra errores de validación si se envía vacío', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: { RouterLink: RouterLinkStub }
      }
    })

    await wrapper.find('form').trigger('submit.prevent')
    
    expect(wrapper.text()).toContain('El email es obligatorio')
    expect(wrapper.text()).toContain('La contraseña es obligatoria')
    expect(loginUser).not.toHaveBeenCalled()
  })

  it('Login exitoso con perfil completo redirige a Home', async () => {
    loginUser.mockResolvedValue({ 
      token: 'fake-token', 
      profileExists: true 
    })

    const wrapper = mount(Login, {
      global: {
        plugins: [createTestingPinia({ stubActions: false })],
        stubs: { RouterLink: RouterLinkStub }
      }
    })
    const store = useSessionStore()

    await wrapper.find('input[type="email"]').setValue('test@test.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    
    await wrapper.find('form').trigger('submit.prevent')
    
    // Esperar promesas
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(loginUser).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' })
    expect(store.token).toBe('fake-token')
    expect(pushMock).toHaveBeenCalledWith({ name: 'home' })
  })

  it('Login exitoso SIN perfil redirige a Onboarding', async () => {
    loginUser.mockResolvedValue({ 
      token: 'fake-token', 
      profileExists: false 
    })

    const wrapper = mount(Login, {
      global: {
        plugins: [createTestingPinia({ stubActions: false })],
        stubs: { RouterLink: RouterLinkStub }
      }
    })

    await wrapper.find('input[type="email"]').setValue('new@test.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(pushMock).toHaveBeenCalledWith({ name: 'OnboardingProfile' })
  })

  it('Maneja error de credenciales incorrectas', async () => {
    const error = new Error('Auth failed')
    error.response = { data: { message: 'Credenciales inválidas' } }
    loginUser.mockRejectedValue(error)

    const wrapper = mount(Login, {
      global: {
        plugins: [createTestingPinia()],
        stubs: { RouterLink: RouterLinkStub }
      }
    })

    await wrapper.find('input[type="email"]').setValue('fail@test.com')
    await wrapper.find('input[type="password"]').setValue('wrongpass')
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('.error-box').exists()).toBe(true)
    expect(wrapper.text()).toContain('Credenciales inválidas')
  })
})