import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks para los servicios usados por Home
vi.mock('@/services/homeService', () => {
  const getHomeKpis = vi.fn()
  return { getHomeKpis }
})
vi.mock('@/services/authService', () => {
  const getProfile = vi.fn()
  return { getProfile }
})

import Home from '@/views/Home.vue'
// Helper: esperar a que todas las promesas pendientes se resuelvan (flushPromises)
const flushPromises = () => new Promise((res) => setImmediate(res))
import { getHomeKpis } from '@/services/homeService'
import { getProfile } from '@/services/authService'

beforeEach(() => {
  getHomeKpis.mockReset()
  getProfile.mockReset()
})

describe('Home KPIs - calorías con objetivo', () => {
  it('muestra skeleton mientras carga', async () => {
    // Promise que nunca resuelve para mantener el estado de carga
    getHomeKpis.mockImplementation(() => new Promise(() => {}))
    getProfile.mockResolvedValue({ firstName: 'A' })

    const wrapper = mount(Home, { global: { stubs: ['router-link'] } })

    // El contenedor de loading debe existir
    expect(wrapper.find('.loading-container').exists()).toBe(true)
  })

  it('muestra error si la petición falla', async () => {
    const err = new Error('Fail')
    err.response = { data: { message: 'KPIs failed' } }
    getHomeKpis.mockRejectedValue(err)
    getProfile.mockResolvedValue({ firstName: 'A' })

    const wrapper = mount(Home, { global: { stubs: ['router-link'] } })
  // Esperar a que las promesas se procesen
  await flushPromises()
  await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.find('.error-container').text()).toContain('KPIs failed')
  })

  it('muestra "X / Y kcal" y el porcentaje cuando hay objetivo > 0', async () => {
    const kpis = {
      hasCreatedRoutes: true,
      routesCompletedToday: 1,
      totalDurationSecToday: 3600,
      totalDistanceKmToday: 5,
      activeStreakDays: 2,
      caloriesKcalToday: 320,
      goalKcalDaily: 500
    }
    getHomeKpis.mockResolvedValue(kpis)
    getProfile.mockResolvedValue({ firstName: 'A' })

    const wrapper = mount(Home, { global: { stubs: ['router-link'] } })
  await flushPromises()
  await wrapper.vm.$nextTick()

    // Buscar la tarjeta cuyo título sea "Calorías de hoy"
    const cards = wrapper.findAll('.kpi-card-v2')
    const calCard = cards.find(c => c.find('.title').text() === 'Calorías de hoy')
    expect(calCard).toBeTruthy()

    const valueText = calCard.find('.value').text().trim()
    // Debe mostrar "320 / 500 kcal"
    expect(valueText).toBe('320 / 500 kcal')

    const subtitle = calCard.find('.subtitle').text()
    // 320/500 = 64%
    expect(subtitle).toContain('64%')
  })

  it('muestra solo "X kcal" cuando goal = 0', async () => {
    const kpis = {
      hasCreatedRoutes: true,
      routesCompletedToday: 0,
      totalDurationSecToday: 0,
      totalDistanceKmToday: 0,
      activeStreakDays: 0,
      caloriesKcalToday: 120,
      goalKcalDaily: 0
    }
    getHomeKpis.mockResolvedValue(kpis)
    getProfile.mockResolvedValue({ firstName: 'A' })

    const wrapper = mount(Home, { global: { stubs: ['router-link'] } })
  await flushPromises()
  await wrapper.vm.$nextTick()

    const cards = wrapper.findAll('.kpi-card-v2')
    const calCard = cards.find(c => c.find('.title').text() === 'Calorías de hoy')
    expect(calCard).toBeTruthy()

    const valueText = calCard.find('.value').text().trim()
    expect(valueText).toBe('120 kcal')

    const subtitle = calCard.find('.subtitle').text()
    expect(subtitle).toContain('Energía gastada estimada.')
  })
})
