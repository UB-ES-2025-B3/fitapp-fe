import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/authService', () => {
  const getProfile = vi.fn()
  const updateProfile = vi.fn()
  return { getProfile, updateProfile }
})

import Profile from '@/views/Profile.vue'
import { getProfile } from '@/services/authService'

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
