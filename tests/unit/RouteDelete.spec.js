import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del servicio de rutas usado por la lista
vi.mock('@/services/routesService', () => {
  const getRoutes = vi.fn()
  const deleteRoute = vi.fn()
  const getRoute = vi.fn()
  return { getRoutes, deleteRoute, getRoute }
})

import Routes from '@/views/Routes.vue'
import { getRoutes, deleteRoute, getRoute } from '@/services/routesService'

beforeEach(() => {
  getRoutes.mockReset()
  deleteRoute.mockReset()
  getRoute.mockReset()
  vi.useRealTimers()
})

describe('Borrar rutas (modal) — lista y detalle', () => {
  it('Lista: abrir modal y cancelar no llama a deleteRoute', async () => {
    getRoutes.mockResolvedValue([{ id: 'r1', name: 'A', distanceMeters: 1000 }])
    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Pulsar borrar -> aparece modal
    await wrapper.find('button.btn.danger').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.confirm-modal-backdrop').exists()).toBe(true)

    // Pulsar cancelar
    const cancel = wrapper.find('.confirm-actions .btn.ghost')
    await cancel.trigger('click')
    await wrapper.vm.$nextTick()

    expect(deleteRoute).not.toHaveBeenCalled()
  })

  it('Lista: hard delete elimina la ruta y muestra toast', async () => {
    // Primera carga con 2 rutas; tras borrar, backend devuelve solo 1
    getRoutes.mockResolvedValueOnce([
      { id: 'r1', name: 'A', distanceMeters: 1000 },
      { id: 'r2', name: 'B', distanceMeters: 2000 }
    ]).mockResolvedValueOnce([
      { id: 'r2', name: 'B', distanceMeters: 2000 }
    ])

    deleteRoute.mockResolvedValue({ deleted: true })

    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Borrar la primera
    await wrapper.find('button.btn.danger').trigger('click')
    await wrapper.vm.$nextTick()
    // Confirmar en modal
    const confirm = wrapper.find('.confirm-actions .btn.danger')
    await confirm.trigger('click')

    // Esperar a que deleteRoute y recarga se procesen
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(deleteRoute).toHaveBeenCalledWith('r1')
    // La lista se recargó y ahora sólo queda 1 fila
    const rows = wrapper.findAll('.route-row')
    expect(rows.length).toBe(1)
    // Toast visible
    expect(wrapper.find('.toast').exists()).toBe(true)
  })

  it('Lista: soft delete (con ejecuciones) oculta la ruta en la lista', async () => {
    // Backend indicará softDeleted y getRoutes segunda llamada devolverá la lista filtrada
    getRoutes.mockResolvedValueOnce([
      { id: 'r1', name: 'A', distanceMeters: 1000 },
      { id: 'r2', name: 'B', distanceMeters: 2000 }
    ]).mockResolvedValueOnce([
      { id: 'r2', name: 'B', distanceMeters: 2000 }
    ])

    deleteRoute.mockResolvedValue({ softDeleted: true })

    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    await wrapper.find('button.btn.danger').trigger('click')
    await wrapper.vm.$nextTick()
    const confirm = wrapper.find('.confirm-actions .btn.danger')
    await confirm.trigger('click')

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(deleteRoute).toHaveBeenCalled()
    const rows = wrapper.findAll('.route-row')
    expect(rows.length).toBe(1)
    expect(wrapper.find('.toast').exists()).toBe(true)
  })

  it('Lista: error en delete muestra mensaje de error', async () => {
    getRoutes.mockResolvedValue([{ id: 'r1', name: 'A', distanceMeters: 1000 }])
    const err = new Error('Fail')
    err.response = { data: { message: 'Delete failed' } }
    deleteRoute.mockRejectedValue(err)

    const wrapper = mount(Routes, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    await wrapper.find('button.btn.danger').trigger('click')
    await wrapper.vm.$nextTick()
    const confirm = wrapper.find('.confirm-actions .btn.danger')
    await confirm.trigger('click')

    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-box').exists()).toBe(true)
    expect(wrapper.find('.error-box').text()).toContain('Delete failed')
  })

  it('Detalle: borrar desde vista detalle muestra toast y redirige', async () => {
    // Mock para la vista detalle
    getRoute.mockResolvedValue({ id: 'r1', name: 'A', distanceMeters: 1000 })
    deleteRoute.mockResolvedValue({ deleted: true })

    // Para que la importación use el mock del router, resetear módulos y mockear antes de importar
    vi.resetModules()
    // Crear el mock del router *dentro* de la fábrica para evitar problemas de hoisting
    vi.mock('vue-router', () => {
      const push = vi.fn()
      return { useRouter: () => ({ push }), useRoute: () => ({ params: { id: 'r1' } }), __push: push }
    })

    const { default: RoutesShow } = await import('@/views/RoutesShow.vue')
    const wrapper = mount(RoutesShow, { global: { stubs: ['router-link'] } })
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Usar fake timers antes de confirmar para que el setTimeout de redirección
    // quede registrado bajo el control de Vitest.
    vi.useFakeTimers()
    try {
      // Abrir modal y confirmar
      await wrapper.find('button.btn.danger').trigger('click')
      await wrapper.vm.$nextTick()
      const confirm = wrapper.find('.confirm-actions .btn.danger')
      await confirm.trigger('click')

      // esperar a que deleteRoute y showToast programen el timeout
      await Promise.resolve()
      await wrapper.vm.$nextTick()

      // Avanzar timers para el timeout de redirección
      vi.advanceTimersByTime(1000)

      // push debería haberse llamado (obtener la referencia al mock exportado)
      const routerMock = await import('vue-router')
      expect(routerMock.__push).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
