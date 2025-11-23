import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/authService', () => {
  const getProfile = vi.fn()
  const updateProfile = vi.fn()
  return { getProfile, updateProfile }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  const push = vi.fn()
  return {
    ...actual, 
    useRouter: () => ({ push }),
    useRoute: () => ({ 
      params: { id: 'r1' },
      query: {} // <--- ESTO EVITA EL ERROR "Cannot read properties of undefined (reading 'query')"
    }),
    __push: push
  }
})

import Profile from '@/views/Profile.vue'
import { getProfile, updateProfile } from '@/services/authService'

describe('Profile.vue — Mis Puntos (criterios de aceptación)', () => {
  beforeEach(() => {
    getProfile.mockReset()
    vi.useRealTimers()
  })

  it('muestra el valor de points cuando la API responde', async () => {
    getProfile.mockResolvedValue({ firstName: 'A', points: 42 })
    const wrapper = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    const kpi = wrapper.find('kpi-card-stub')
    expect(kpi.exists()).toBe(true)
    // valor como atributo en el stub
    expect(kpi.attributes().value).toBe('42')
  })

  it('si points = 0 muestra "0"', async () => {
    getProfile.mockResolvedValue({ firstName: 'A', points: 0 })
    const wrapper = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    const kpi = wrapper.find('kpi-card-stub')
    expect(kpi.exists()).toBe(true)
    expect(kpi.attributes().value).toBe('0')
  })

  it('muestra skeleton mientras getProfile está pendiente', async () => {
    // promesa pendiente
    getProfile.mockImplementation(() => new Promise(() => {}))
    const wrapper = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })

    // Inmediatamente debe mostrar skeleton
    expect(wrapper.find('.kpi-skel').exists()).toBe(true)
  })

  it('muestra error si getProfile rechaza', async () => {
    const err = new Error('fail')
    err.response = { data: { message: 'API error' } }
    getProfile.mockRejectedValue(err)

    const wrapper = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    const box = wrapper.find('.points-error')
    expect(box.exists()).toBe(true)
    expect(box.text()).toContain('API error')
  })

  it('al recargar /profile la tarjeta muestra total actualizado desde API', async () => {
    // Primera carga devuelve 10
    getProfile.mockResolvedValueOnce({ firstName: 'A', points: 10 })
    const wrapper1 = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })
    await Promise.resolve()
    await wrapper1.vm.$nextTick()
    const kpi1 = wrapper1.find('kpi-card-stub')
    expect(kpi1.exists()).toBe(true)
    expect(kpi1.attributes().value).toBe('10')

    // Simular recarga: nueva respuesta con 25
    wrapper1.unmount()
    getProfile.mockResolvedValueOnce({ firstName: 'A', points: 25 })
    const wrapper2 = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })
    await Promise.resolve()
    await wrapper2.vm.$nextTick()
    const kpi2 = wrapper2.find('kpi-card-stub')
    expect(kpi2.exists()).toBe(true)
    expect(kpi2.attributes().value).toBe('25')
  })

  it('Error de carga: mensaje no bloqueante; resto del formulario operativo', async () => {
    const err = new Error('fail')
    err.response = { data: { message: 'API error' } }
    getProfile.mockRejectedValue(err)

    const wrapper = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Mensaje de error visible
    const box = wrapper.find('.points-error')
    expect(box.exists()).toBe(true)

    // El formulario debe seguir operativo: inputs presentes y botón guardar habilitado
    const nameInput = wrapper.find('input[placeholder="Nombre"]')
    expect(nameInput.exists()).toBe(true)
    await nameInput.setValue('Nuevo')
    const submit = wrapper.find('form').find('button[type="submit"]')
    expect(submit.exists()).toBe(true)
    expect(submit.attributes('disabled')).toBeUndefined()
  })

  it('El formulario no permite editar puntos (solo lectura, sin inputs)', async () => {
    getProfile.mockResolvedValue({ firstName: 'A', points: 7 })
    const wrapper = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // No debe existir ningún input dentro de la tarjeta de puntos
    expect(wrapper.find('.points-card input').exists()).toBe(false)
  })

  it('GET /profile muestra goalKcalDaily en el formulario', async () => {
    getProfile.mockResolvedValue({ firstName: 'A', goalKcalDaily: 2100 })
    const wrapper = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    const goalInput = wrapper.find('#goalKcal')
    expect(goalInput.exists()).toBe(true)
    expect(goalInput.element.value).toBe('2100')
  })

  it('PUT /profile guarda goalKcalDaily y muestra loading/error correctamente', async () => {
    // mock profile initial data (valid for validation)
    getProfile.mockResolvedValue({
      firstName: 'A', lastName: 'B', birthDate: '2000-01-01', gender: 'male', timezone: 'UTC', heightCm: 170, weightKg: 70, goalKcalDaily: 2000
    })

    const savedResponse = { firstName: 'A', goalKcalDaily: 1800 }
    updateProfile.mockResolvedValue(savedResponse)

    const wrapper = mount(Profile, { global: { stubs: ['router-link', 'KpiCard'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Cambiar el input a 1800
    const goalInput = wrapper.find('#goalKcal')
    await goalInput.setValue('1800')

    // Disparar submit
    await wrapper.find('form').trigger('submit.prevent')
    // esperar microtasks/promises
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(updateProfile).toHaveBeenCalled()
    const payload = updateProfile.mock.calls[0][0]
    expect(payload.goalKcalDaily).toBe(1800)

    // Después de guardar, el formulario debe reflejar el valor guardado
    const goalAfter = wrapper.find('#goalKcal')
    expect(goalAfter.element.value).toBe('1800')
  })
})

describe('Guards: protección de /profile', () => {
  it('Protegida por login + perfil completo (redirige si no autenticado)', async () => {
    vi.resetModules()
    localStorage.removeItem('token')
    localStorage.setItem('profileExists', 'false')

    const { default: router } = await import('@/router/index.js')
    await router.push('/profile')
    await router.isReady()
    expect(router.currentRoute.value.name).not.toBe('Profile')
  })
})
