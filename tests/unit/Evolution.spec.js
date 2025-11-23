import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import Evolution from '@/views/Evolution.vue'

// Mock del servicio statsService
vi.mock('@/services/statsService', () => {
  const getStats = vi.fn()
  return { getStats }
})

// Acceso al mock para reiniciar entre tests
import { getStats } from '@/services/statsService'

// Helper para vaciar promesas pendientes (usar setTimeout 0 compatible con entorno jsdom)
const flushPromises = () => new Promise(res => setTimeout(res, 0))

// Stub sencillo para el componente Bar de vue-chartjs
const BarStub = {
  name: 'Bar',
  props: ['data', 'options'],
  template: '<div class="bar-chart-stub" />'
}

beforeEach(() => {
  getStats.mockReset()
})

describe('Evolution View - Estados y lógica', () => {
  it('muestra estado loading mientras la promesa no resuelve', async () => {
    // Promesa que no resuelve
    getStats.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(Evolution, {
      global: { stubs: { Bar: BarStub, RouterLink: RouterLinkStub } }
    })

    expect(wrapper.find('.spinner').exists()).toBe(true)
    expect(wrapper.text()).toContain('Calculando estadísticas')
  })

  it('muestra estado error cuando getStats rechaza y permite reintentar', async () => {
    const err = new Error('Boom')
    getStats.mockRejectedValue(err)

    const wrapper = mount(Evolution, {
      global: { stubs: { Bar: BarStub, RouterLink: RouterLinkStub } }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    const errorBox = wrapper.find('.error-box')
    expect(errorBox.exists()).toBe(true)
    expect(errorBox.text()).toContain('No pudimos cargar tu historial de evolución.')

    // Preparar siguiente intento exitoso
    getStats.mockResolvedValue([{ date: '2023-10-01', value: 100 }])
    // Click en reintentar
    await errorBox.find('button').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()

    // Debe desaparecer el error y mostrarse el gráfico
    expect(wrapper.find('.error-box').exists()).toBe(false)
    expect(wrapper.find('.chart-container').exists()).toBe(true)
  })

  it('muestra empty-state cuando no hay puntos (array vacío)', async () => {
    getStats.mockResolvedValue([])

    const wrapper = mount(Evolution, {
      global: { stubs: { Bar: BarStub, RouterLink: RouterLinkStub } }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    const empty = wrapper.find('.empty-state')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('Sin actividad reciente')
    const link = wrapper.findComponent(RouterLinkStub)
    expect(link.exists()).toBe(true)
  })

  it('muestra empty-state cuando todos los valores son 0', async () => {
    getStats.mockResolvedValue([
      { date: '2023-10-01', value: 0 },
      { date: '2023-10-02', value: 0 }
    ])

    const wrapper = mount(Evolution, {
      global: { stubs: { Bar: BarStub, RouterLink: RouterLinkStub } }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.chart-container').exists()).toBe(false)
  })

  it('muestra gráfico cuando hay al menos un valor > 0', async () => {
    getStats.mockResolvedValue([
      { date: '2023-10-01', value: 0 },
      { date: '2023-10-02', value: 120 },
      { date: '2023-10-03', value: 80 }
    ])

    const wrapper = mount(Evolution, {
      global: { stubs: { Bar: BarStub, RouterLink: RouterLinkStub } }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.chart-container').exists()).toBe(true)
    expect(wrapper.find('.empty-state').exists()).toBe(false)
    // Comprobar que el computed genera labels (simplificado: número de puntos)
    const vm = wrapper.vm
    expect(vm.chartData.labels.length).toBe(3)
    expect(vm.chartData.datasets[0].data).toEqual([0, 120, 80])
  })

  it('normaliza a array vacío si la respuesta no es un array', async () => {
    getStats.mockResolvedValue({ date: '2023-10-01', value: 200 }) // no array

    const wrapper = mount(Evolution, {
      global: { stubs: { Bar: BarStub, RouterLink: RouterLinkStub } }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.chart-container').exists()).toBe(false)
  })
})
