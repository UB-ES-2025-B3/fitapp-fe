import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Este fichero contiene tests unitarios para la página de edición de rutas
// (`src/views/RoutesEdit.vue`). Los tests están en castellano y verifican los
// criterios de aceptación indicados: precarga desde GET /routes/:id, validaciones,
// PUT /routes/:id, manejo de loading/errores y comportamiento tras éxito
// (toast + redirección a lista).

// Mocks de servicio y router:
// - `getRoute` simula la respuesta del backend para precargar el formulario.
// - `updateRoute` simula la llamada PUT para actualizar la ruta.
vi.mock('@/services/routesService', () => {
  const getRoute = vi.fn()
  const updateRoute = vi.fn()
  return { getRoute, updateRoute }
})

// Mock sencillo de vue-router: usamos `useRouter`/`useRoute` dentro del componente.
// Exponemos `__push` para poder asertar que el componente pidió redirigir.
vi.mock('vue-router', () => {
  const push = vi.fn()
  return {
    useRouter: () => ({ push }),
    useRoute: () => ({ params: { id: 'r1' } }),
    __push: push
  }
})

import RoutesEdit from '@/views/RoutesEdit.vue'
import { getRoute, updateRoute } from '@/services/routesService'
import { __push as mockPush } from 'vue-router'

// Antes de cada test reseteamos los mocks y nos aseguramos de usar timers reales
beforeEach(() => {
  getRoute.mockReset()
  updateRoute.mockReset()
  mockPush.mockReset()
  vi.useRealTimers()
})

describe('RoutesEdit.vue — Edición de rutas (criterios de aceptación)', () => {
  // 1) Validación: nombre obligatorio. Si GET precarga inicio/fin pero nombre
  //    falta, el submit debe mostrar el error correspondiente.
  it('Validación - nombre requerido', async () => {
    // Simulamos que la API devuelve start/end pero sin nombre
    getRoute.mockResolvedValue({ id: 'r1', start: { lat: 41.38, lng: 2.17 }, end: { lat: 41.39, lng: 2.18 } })
    const wrapper = mount(RoutesEdit, { global: { stubs: ['router-link'] } })

    // Esperar a que la precarga asíncrona termine y Vue actualice el DOM
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Forzar submit sin nombre — debe producir mensaje de error
    await wrapper.find('form').trigger('submit.prevent')
    await Promise.resolve()
    expect(wrapper.vm.error).toBe('El nombre es obligatorio.')
  })

  // 2) Validación: inicio/fin requeridos. Si el GET no trae puntos, el submit
  //    debe afirmar que el usuario debe marcar Inicio y Fin.
  it('Validación - inicio/fin requeridos', async () => {
    getRoute.mockResolvedValue({ id: 'r1', name: 'Ruta editar' })
    const wrapper = mount(RoutesEdit, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Rellenar sólo el nombre y enviar — debe fallar por falta de puntos
    await wrapper.find('input[type="text"]').setValue('Ruta editar')
    await wrapper.find('form').trigger('submit.prevent')
    await Promise.resolve()
    expect(wrapper.vm.error).toBe('Debes marcar Inicio y Fin en el mapa.')
  })

  // 3) GET /routes/:id precarga los campos: comprobamos que los datos devueltos
  //    por el servicio se escriben en el formulario (nombre y distancia servidor).
  it('GET /routes/:id precarga los campos', async () => {
    getRoute.mockResolvedValue({ id: 'r1', name: 'Ruta pre', start: { lat: 41.38, lng: 2.17 }, end: { lat: 41.39, lng: 2.18 }, distanceMeters: 900 })
    const wrapper = mount(RoutesEdit, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Verificar que el formulario fue rellenado con los valores del backend
    expect(wrapper.vm.name).toBe('Ruta pre')
    expect(wrapper.vm.serverDistanceMeters).toBe(900)
  })

  // 4) PUT /routes/:id: tras modificar el formulario debe llamarse a updateRoute,
  //    actualizar la distancia según la respuesta del backend, mostrar toast y
  //    redirigir a la lista. Aquí controlamos timers para que la promesa y el
  //    setTimeout de redirección sean deterministas.
  it('PUT /routes/:id actualiza y muestra toast + redirige', async () => {
    getRoute.mockResolvedValue({ id: 'r1', name: 'Ruta pre', start: { lat: 41.38, lng: 2.17 }, end: { lat: 41.39, lng: 2.18 } })
    // updateRoute resuelve tras setTimeout(0) para que podamos controlarlo con fake timers
    updateRoute.mockImplementation(() => new Promise((res) => setTimeout(() => res({ id: 'r1', distanceMeters: 1200 }), 0)))

    // Usamos fake timers para controlar la resolución y la redirección
    vi.useFakeTimers()
    const wrapper = mount(RoutesEdit, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Cambiar nombre y disparar submit
    await wrapper.find('input[type="text"]').setValue('Ruta editada')
    wrapper.find('form').trigger('submit.prevent')

    // Avanzar timers para que la promesa mock de updateRoute se resuelva
    vi.advanceTimersByTime(0)
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Comprobaciones: update called, distancia actualizada y toast visible
    expect(updateRoute).toHaveBeenCalled()
    expect(wrapper.vm.serverDistanceMeters).toBe(1200)
    expect(wrapper.find('.toast').exists()).toBe(true)

    // Avanzar tiempo para que el componente ejecute la redirección (setTimeout 900ms)
    try {
      vi.advanceTimersByTime(1000)
      expect(mockPush).toHaveBeenCalled()
    } finally {
      // Restaurar timers reales para no afectar otros tests
      vi.useRealTimers()
    }
  })

  // 5) Loading + errores: simulamos una promesa pendiente, comprobamos saving=true
  //    y luego rechazamos la promesa para verificar el manejo de errores y que
  //    saving vuelva a false y muestre el mensaje devuelto por la API.
  it('Loading en submit y mostrar errores 4xx/5xx', async () => {
    getRoute.mockResolvedValue({ id: 'r1', name: 'Ruta pre', start: { lat: 41.38, lng: 2.17 }, end: { lat: 41.39, lng: 2.18 } })
    const d = (() => {
      let res, rej
      const p = new Promise((r, j) => { res = r; rej = j })
      return { promise: p, resolve: res, reject: rej }
    })()
    // updateRoute devuelve una promesa que controlamos manualmente
    updateRoute.mockReturnValue(d.promise)

    const wrapper = mount(RoutesEdit, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Disparar submit; la promesa queda pendiente
    wrapper.find('form').trigger('submit.prevent')
    await Promise.resolve()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.saving).toBe(true)

    // Rechazar la promesa simulada con un error que contiene mensaje de API
    const err = new Error('Fail')
    err.response = { data: { message: 'Update failed' } }
    d.reject(err)
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Tras el rechazo, saving debe ser false y mostrarse el mensaje de error
    expect(wrapper.vm.saving).toBe(false)
    expect(wrapper.vm.error).toBe('Update failed')
  })

  // 6) Validación de paradas: cada parada debe tener nombre.
  it('Validación - paradas requieren nombre', async () => {
    getRoute.mockResolvedValue({
      id: 'r1',
      name: 'Ruta base',
      start: { lat: 41.38, lng: 2.17 },
      end: { lat: 41.39, lng: 2.18 }
    })
    const wrapper = mount(RoutesEdit, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Añadir parada sin nombre (botón "Añadir parada manualmente")
    await wrapper.find('button.btn.dashed').trigger('click')
    await wrapper.vm.$nextTick()

    // Submit debe fallar por nombre vacío
    await wrapper.find('form').trigger('submit.prevent')
    await Promise.resolve()
    expect(wrapper.vm.error).toBe('Todas las paradas deben tener un nombre.')
    expect(updateRoute).not.toHaveBeenCalled()
  })

  // 7) Validación de paradas: si tienen nombre deben tener ubicación.
  it('Validación - paradas requieren ubicación', async () => {
    getRoute.mockResolvedValue({
      id: 'r1',
      name: 'Ruta base',
      start: { lat: 41.38, lng: 2.17 },
      end: { lat: 41.39, lng: 2.18 }
    })
    const wrapper = mount(RoutesEdit, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Crear parada manual
    await wrapper.find('button.btn.dashed').trigger('click')
    await wrapper.vm.$nextTick()

    // Asignar nombre pero no coordenadas
    const cpInput = wrapper.find('.checkpoint-row .cp-input')
    await cpInput.setValue('Parada 1')

    // Submit debe fallar por falta de lat/lng
    await wrapper.find('form').trigger('submit.prevent')
    await Promise.resolve()
    expect(wrapper.vm.error).toBe('Todas las paradas deben tener una ubicación marcada en el mapa.')
    expect(updateRoute).not.toHaveBeenCalled()
  })
})
