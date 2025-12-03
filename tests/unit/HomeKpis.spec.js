import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks para los servicios usados por Home
// - getHomeKpis: obtiene los KPIs del día (calorías, rutas, distancia, etc.)
// - getProfile: obtiene datos del usuario (nombre, objetivo de calorías, etc.)
vi.mock('@/services/homeService', () => {
  const getHomeKpis = vi.fn()
  return { getHomeKpis }
})
vi.mock('@/services/authService', () => {
  const getProfile = vi.fn()
  return { getProfile }
})

import Home from '@/views/Home.vue'
// Helper: esperar a que todas las promesas pendientes se resuelvan
// Necesario porque los mocks resuelven en el siguiente setImmediate (microtask)
const flushPromises = () => new Promise((res) => setImmediate(res))
import { getHomeKpis } from '@/services/homeService'
import { getProfile } from '@/services/authService'

beforeEach(() => {
  // Resetea los mocks antes de cada test para evitar efectos cruzados
  getHomeKpis.mockReset()
  getProfile.mockReset()
})

describe('Home KPIs - calorías con objetivo', () => {
  it('muestra skeleton mientras carga', async () => {
    // Promise que nunca resuelve para mantener el estado de carga indefinidamente
    getHomeKpis.mockImplementation(() => new Promise(() => {}))
    getProfile.mockResolvedValue({ firstName: 'A' })

    const wrapper = mount(Home, { global: { stubs: ['router-link'] } })

    // El contenedor de loading debe existir mientras se cargan los datos
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

    // El error debe ser visible
    expect(wrapper.find('.error-container').exists()).toBe(true)
    expect(wrapper.find('.error-container').text()).toContain('KPIs failed')
    // A pesar del error, la CTA para definir objetivo debe estar disponible
    // (el error es no-bloqueante)
    expect(wrapper.find('.define-goal-cta').exists()).toBe(true)
  })

  it('muestra "X / Y kcal" y el porcentaje cuando hay objetivo > 0', async () => {
    const kpis = {
      hasCreatedRoutes: true,
      routesCompletedToday: 1,
      totalDurationSecToday: 3600,
      totalDistanceKmToday: 5,
      activeStreakDays: 2,
      caloriesKcalToday: 320,
      // Objetivo de 500 kcal: 320/500 = 64%
      goalKcalDaily: 500
    }
    getHomeKpis.mockResolvedValue(kpis)
    getProfile.mockResolvedValue({ firstName: 'A' })

    const wrapper = mount(Home, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Buscar la tarjeta de calorías
    const cards = wrapper.findAll('.kpi-card-v2')
    const calCard = cards.find(c => c.find('.title').text() === 'Calorías de hoy')
    expect(calCard).toBeTruthy()

    // Verifica que muestre formato "320 / 500 kcal"
    const valueText = calCard.find('.value').text().trim()
    expect(valueText).toBe('320 / 500 kcal')

    // Verifica que muestre el porcentaje (64%)
    const subtitle = calCard.find('.subtitle').text()
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
      // Sin objetivo definido (0)
      goalKcalDaily: 0
    }
    getHomeKpis.mockResolvedValue(kpis)
    getProfile.mockResolvedValue({ firstName: 'A' })

    const wrapper = mount(Home, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Cuando no hay objetivo, debe mostrarse la CTA para definirlo
    const cta = wrapper.find('.define-goal-cta')
    expect(cta.exists()).toBe(true)
    // La CTA debe navegar a /profile para definir el objetivo
    expect(cta.attributes('to') || cta.props('to')).toBe('/profile')
  })

  it('después de guardar objetivo en Perfil, Home refleja "X / Y Kcal" en el siguiente fetch', async () => {
    // Primer fetch: usuario sin objetivo (goal = 0)
    const kpis0 = {
      hasCreatedRoutes: true,
      routesCompletedToday: 0,
      totalDurationSecToday: 0,
      totalDistanceKmToday: 0,
      activeStreakDays: 0,
      caloriesKcalToday: 120,
      goalKcalDaily: 0
    }
    // Segundo fetch: usuario con objetivo definido (goal = 500)
    const kpis1 = {
      hasCreatedRoutes: true,
      routesCompletedToday: 1,
      totalDurationSecToday: 3600,
      totalDistanceKmToday: 5,
      activeStreakDays: 2,
      caloriesKcalToday: 320,
      goalKcalDaily: 500
    }
    // Primera llamada devuelve kpis0, segunda llamada devuelve kpis1
    getHomeKpis.mockResolvedValueOnce(kpis0).mockResolvedValueOnce(kpis1)
    getProfile.mockResolvedValue({ firstName: 'A' })

    const wrapper = mount(Home, { global: { stubs: ['router-link'] } })
    await flushPromises()
    await wrapper.vm.$nextTick()

    // En el primer fetch, sin objetivo, debe mostrarse la CTA
    expect(wrapper.find('.define-goal-cta').exists()).toBe(true)

    // Simular que el usuario guarda su objetivo en /profile y Home se recarga
    await wrapper.vm.loadDashboardData()
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Ahora, con el nuevo objetivo (500), debe mostrarse la tarjeta en formato "X / Y kcal"
    const cards = wrapper.findAll('.kpi-card-v2')
    const calCard = cards.find(c => c.find('.title').text() === 'Calorías de hoy')
    expect(calCard).toBeTruthy()
    const valueText = calCard.find('.value').text().trim()
    expect(valueText).toBe('320 / 500 kcal')
  })
})
