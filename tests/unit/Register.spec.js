import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'

vi.mock('@/services/authService', () => ({
  registerUser: vi.fn(),
}))

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import Register from '@/views/Register.vue'
import { registerUser } from '@/services/authService'

const RouterLinkStub = {
  template: '<a><slot /></a>',
  props: ['to'],
}

describe('Register.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Valida que las contraseñas coincidan', async () => {
    const wrapper = mount(Register, {
      global: {
        plugins: [createTestingPinia()],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    await wrapper.find('#password').setValue('password123')
    await wrapper.find('#confirmPassword').setValue('passwordAAA')
    await wrapper.find('#confirmPassword').trigger('blur')

    expect(wrapper.text()).toContain('Las contraseñas no coinciden')
    expect(wrapper.find('button[type="submit"]').element.disabled).toBe(true)
  })

  it('Requiere aceptar términos', async () => {
    const wrapper = mount(Register, {
      global: {
        plugins: [createTestingPinia()],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    await wrapper.find('#email').setValue('a@b.com')
    await wrapper.find('#password').setValue('12345678')
    await wrapper.find('#confirmPassword').setValue('12345678')

    // Checkbox false por defecto
    expect(wrapper.find('button[type="submit"]').element.disabled).toBe(true)

    await wrapper.find('input[type="checkbox"]').setValue(true)
    expect(wrapper.find('button[type="submit"]').element.disabled).toBe(false)
  })

  it('Registro exitoso llama a la API y redirige', async () => {
    vi.useFakeTimers()
    registerUser.mockResolvedValue({ token: 'abc', profileExists: false })

    const wrapper = mount(Register, {
      global: {
        plugins: [createTestingPinia({ stubActions: false })],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    await wrapper.find('#email').setValue('valid@email.com')
    await wrapper.find('#password').setValue('12345678')
    await wrapper.find('#confirmPassword').setValue('12345678')
    await wrapper.find('input[type="checkbox"]').setValue(true)

    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()
    // Delay del modal (1000ms)
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()

    expect(registerUser).toHaveBeenCalledWith({ email: 'valid@email.com', password: '12345678' })
    expect(pushMock).toHaveBeenCalledWith({ name: 'OnboardingProfile' })
    vi.useRealTimers()
  })
})
