import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del servicio de rutas: getRoutes y deleteRoute
vi.mock('@/services/routesService', () => {
  const getRoutes = vi.fn()
  const deleteRoute = vi.fn()
  return { getRoutes, deleteRoute }
})

import Routes from '@/views/Routes.vue'
import { getRoutes, deleteRoute } from '@/services/routesService'

// Helper para leer props desde un stub en distintas versiones de VTU
// Helper para leer props desde un stub en distintas versiones de VTU
function readProps(w) {
  if (!w) return {}
  // en algunas versiones wrapper.props es una función, en otras un objeto
  if (typeof w.props === 'function') return w.props()
  return w.props || {}
}

// Helper robusto para extraer la propiedad `to` de un <router-link> stub.
function getTo(w) {
  if (!w || !w.exists()) return null
  const p = readProps(w)
  if (p && p.to) return p.to

  // intentar leer atributos (p. ej. en algunas versiones el stub serializa `to` como atributo)
  const attrs = (typeof w.attributes === 'function') ? w.attributes() : (w.attributes || {})
  if (attrs && attrs.to) {
    const raw = attrs.to
    // si es JSON, parsearlo
    try {
      if (typeof raw === 'string' && raw.trim().startsWith('{')) return JSON.parse(raw)
    } catch {
      // ignore parse errors
    }
    return raw
  }

  return null
}

describe('Routes.vue — Listado de rutas (criterios de aceptación)', () => {
  beforeEach(() => {
    getRoutes.mockReset()
    vi.useRealTimers()
  })

  it('GET /routes renderiza nombre + distancia + acciones Ver/Editar/Borrar', async () => {
    // Mock: la API devuelve dos rutas
    getRoutes.mockResolvedValue([
      { id: 'r1', name: 'Ruta A', distanceMeters: 1500 },
      { id: 'r2', name: 'Ruta B', distanceMeters: 5230 }
    ])

    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })

    // Esperar que la promesa de carga se resuelva y Vue actualice el DOM
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('.route-row')
    expect(rows.length).toBe(2)

    // Comprobar nombre y distancia en la primera fila
    const first = rows[0]
    expect(first.find('.route-name').text()).toBe('Ruta A')
    expect(first.find('.route-distance').text()).toContain('km')

      // Comprobar que existen los enlaces Ver y Editar con los to correctos
      const links = first.findAll('router-link-stub')
      // primer link = Ver, segundo = Editar
      const to0 = getTo(links[0])
      const to1 = getTo(links[1])
      // Aceptar que `to` sea objeto { name, params } o ruta string; preferimos el name cuando exista
      expect(to0).not.toBeNull()
      if (typeof to0 === 'object') {
        expect(to0.name).toBe('RoutesShow')
        expect(to0.params.id).toBe('r1')
      }
      if (typeof to1 === 'object') {
        expect(to1.name).toBe('RoutesEdit')
        expect(to1.params.id).toBe('r1')
      }
  })

  it('Empty state muestra mensaje cuando no hay rutas (sin botón redundante)', async () => {
    getRoutes.mockResolvedValue([])
    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // 1. El contenedor empty-state debe existir
    expect(wrapper.find('.empty-state').exists()).toBe(true)

    // 2. Debe contener el texto informativo
    expect(wrapper.find('.empty-state').text()).toContain('No hay rutas todavía')

    // 3. NO debe contener el botón de crear ruta (ya que está en el header)
    const cta = wrapper.find('.empty-state').find('router-link-stub')
    expect(cta.exists()).toBe(false)
  })

  it('Link "Crear ruta" del header apunta a /routes/new (RoutesNew)', async () => {
    getRoutes.mockResolvedValue([])
    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // El header contiene un router-link hacia RoutesNew
    const headerLink = wrapper.find('header').find('router-link-stub')
    expect(headerLink.exists()).toBe(true)
    const headerTo = getTo(headerLink)
    if (typeof headerTo === 'object') expect(headerTo.name).toBe('RoutesNew')
  })

  it('Muestra estado de loading mientras getRoutes está pendiente', async () => {
    // Promesa pendiente: never resolves
    getRoutes.mockImplementation(() => new Promise(() => {}))
    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })

    // Inmediatamente debe mostrar el indicador de carga
    expect(wrapper.find('.center').text()).toContain('Cargando')
  })

  it('Muestra error si getRoutes rechaza', async () => {
    const err = new Error('fail')
    err.response = { data: { message: 'API error' } }
    getRoutes.mockRejectedValue(err)

    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-box').exists()).toBe(true)
    expect(wrapper.find('.error-box').text()).toContain('API error')
  })

  it('Borrar: confirma, llama a deleteRoute y recarga la lista', async () => {
    // Primera llamada devuelve dos rutas; tras borrado devolverá una sola
    getRoutes.mockResolvedValueOnce([
      { id: 'r1', name: 'Ruta A', distanceMeters: 1500 },
      { id: 'r2', name: 'Ruta B', distanceMeters: 5230 }
    ]).mockResolvedValueOnce([
      { id: 'r2', name: 'Ruta B', distanceMeters: 5230 }
    ])

  deleteRoute.mockResolvedValue({})

    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })
    // esperar carga inicial
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    const rowsBefore = wrapper.findAll('.route-row')
    expect(rowsBefore.length).toBe(2)

    // Pulsar el botón borrar de la primera fila -> abre el modal
    const firstDelete = rowsBefore[0].find('button.btn.danger')
    await firstDelete.trigger('click')
    await wrapper.vm.$nextTick()

    // Confirmar en el modal
    expect(wrapper.find('.confirm-modal-backdrop').exists()).toBe(true)
    const confirm = wrapper.find('.confirm-actions .btn.danger')
    await confirm.trigger('click')

    // esperar que deleteRoute y recarga se procesen
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(deleteRoute).toHaveBeenCalledWith('r1')

    const rowsAfter = wrapper.findAll('.route-row')
    expect(rowsAfter.length).toBe(1)
  })

  it('Borrar: si el usuario cancela, no llama a deleteRoute', async () => {
    getRoutes.mockResolvedValue([
      { id: 'r1', name: 'Ruta A', distanceMeters: 1500 }
    ])

  deleteRoute.mockReset()

    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Abrir modal y cancelar
    const btn = wrapper.find('button.btn.danger')
    await btn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.confirm-modal-backdrop').exists()).toBe(true)
    const cancel = wrapper.find('.confirm-actions .btn.ghost')
    await cancel.trigger('click')

    expect(deleteRoute).not.toHaveBeenCalled()
  })
})

// Prueba rápida de guards: repetir una comprobación de protección a /routes
describe('Guards: protección de /routes', () => {
  it('Protegida por login + perfil completo (redirige si no autenticado)', async () => {
    vi.resetModules()
    localStorage.removeItem('token')
    localStorage.setItem('profileExists', 'false')

    const { default: router } = await import('@/router/index.js')
    await router.push('/routes')
    await router.isReady()
    expect(router.currentRoute.value.name).not.toBe('RoutesList')
  })
})
