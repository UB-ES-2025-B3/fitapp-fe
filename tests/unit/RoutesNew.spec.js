import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Helper para controlar promesas desde el test (deferred)
function deferred() {
	let resolve, reject
	const promise = new Promise((res, rej) => { resolve = res; reject = rej })
	return { promise, resolve, reject }
}

// Mock del servicio de rutas y del router (evitar hoisting de vi.mock)
vi.mock('@/services/routesService', () => {
	const createRoute = vi.fn()
	return { createRoute }
})

vi.mock('vue-router', () => {
	const push = vi.fn()
	return {
		useRouter: () => ({ push }),
		__push: push
	}
})

import RoutesNew from '@/views/RoutesNew.vue'
import { createRoute } from '@/services/routesService'
import { __push as mockPush } from 'vue-router'

beforeEach(() => {
	createRoute.mockReset()
	mockPush.mockReset()
})

// Ensure real timers by default; tests enable fake timers when needed.
beforeEach(() => {
	vi.useRealTimers()
})

describe('RoutesNew.vue — Criterios de aceptación de creación de rutas', () => {
	// Validación: no permitir crear sin nombre
	it('Validación - nombre requerido', async () => {
		const wrapper = mount(RoutesNew, { global: { stubs: ['router-link'] } })
		wrapper.vm.startLatLng = { lat: 41.38, lng: 2.17 }
		wrapper.vm.endLatLng = { lat: 41.39, lng: 2.18 }
		await wrapper.find('form').trigger('submit.prevent')
		await new Promise((r) => setTimeout(r, 0))
		expect(wrapper.vm.error).toBe('El nombre es obligatorio.')
		expect(createRoute).not.toHaveBeenCalled()
	})

	// Validación: no permitir crear sin marcar inicio/fin
	it('Validación - inicio/fin requeridos', async () => {
		const wrapper = mount(RoutesNew, { global: { stubs: ['router-link'] } })
		const nameInput = wrapper.find('input[type="text"]')
		await nameInput.setValue('Ruta sin puntos')
		await wrapper.find('form').trigger('submit.prevent')
		await new Promise((r) => setTimeout(r, 0))
		expect(wrapper.vm.error).toBe('Debes marcar Inicio y Fin en el mapa.')
		expect(createRoute).not.toHaveBeenCalled()
	})

	// POST: la distancia la calcula el backend y el campo es solo lectura
	it('POST: la distancia la calcula el backend y el campo es solo lectura', async () => {
			// Simular que el backend devuelve distanceMeters usando setTimeout(0)
			// para que la resolución quede controlada por los fake timers.
			createRoute.mockImplementation(() => new Promise((res) => setTimeout(() => res({ id: 'abc', distanceMeters: 3500 }), 0)))

			// Activar fake timers antes de montar/submit para controlar tanto la
			// resolución de createRoute (setTimeout 0) como el setTimeout de redirección.
			vi.useFakeTimers()
		const wrapper = mount(RoutesNew, { global: { stubs: ['router-link'] } })
			const nameInput = wrapper.find('input[type="text"]')
			await nameInput.setValue('Ruta test')
			wrapper.vm.startLatLng = { lat: 41.380, lng: 2.170 }
			wrapper.vm.endLatLng = { lat: 41.390, lng: 2.180 }

			wrapper.find('form').trigger('submit.prevent')
			// Avanzar timers para que la promesa de createRoute (setTimeout 0) se ejecute
			vi.advanceTimersByTime(0)
			// permitir microtasks/promises pendientes y actualizar DOM
			await Promise.resolve()
			await wrapper.vm.$nextTick()

			// Verificar que se llamó al servicio con los datos esperados
			expect(createRoute).toHaveBeenCalled()
			const payload = createRoute.mock.calls[0][0]
			expect(payload.name || payload.nombre).toBe('Ruta test')
			expect(payload.start).toBeDefined()
			expect(payload.end).toBeDefined()

			// El campo de distancia es de solo lectura y se rellena con lo devuelto por el backend
			expect(wrapper.vm.serverDistanceMeters).toBe(3500)
			const distanceInput = wrapper.find('input[readonly]')
			expect(distanceInput.exists()).toBe(true)
			expect(distanceInput.element.value).toContain('km')

			try {
				// Avanzar timers para el redirect (900ms dentro del componente)
				vi.advanceTimersByTime(1000)
				expect(mockPush).toHaveBeenCalled()
			} finally {
				vi.useRealTimers()
			}
	})

	// Éxito: tras crear correctamente mostrar toast y redirigir a /routes
	it('Éxito - toast y redirección a /routes tras crear', async () => {
		// Simular respuesta del backend usando setTimeout(0) para que la promesa
		// quede manejada por los fake timers y podamos controlarla.
		createRoute.mockImplementation(() => new Promise((res) => setTimeout(() => res({ id: 'ok', distanceMeters: 1200 }), 0)))

		// Activar fake timers antes de montar/submit
		vi.useFakeTimers()
		const wrapper = mount(RoutesNew, { global: { stubs: ['router-link'] } })
		const nameInput = wrapper.find('input[type="text"]')
		await nameInput.setValue('Ruta exitosa')
		wrapper.vm.startLatLng = { lat: 41.380, lng: 2.170 }
		wrapper.vm.endLatLng = { lat: 41.390, lng: 2.180 }

		// Trigger submit; la resolución de createRoute está en setTimeout(0)
		wrapper.find('form').trigger('submit.prevent')
	    // Avanzar timers para que la promesa de createRoute se resuelva
    vi.advanceTimersByTime(0)
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    // Toast visible
    expect(wrapper.find('.toast').exists()).toBe(true)

		try {
			// Avanzar timers para el redirect (900ms dentro del componente)
			vi.advanceTimersByTime(1000)
			expect(mockPush).toHaveBeenCalled()
		} finally {
			vi.useRealTimers()
		}
	})

	it('Loading en submit y mostrar errores 4xx/5xx', async () => {
		const d = deferred()
		createRoute.mockReturnValue(d.promise)

		const wrapper = mount(RoutesNew, { global: { stubs: ['router-link'] } })
		const nameInput = wrapper.find('input[type="text"]')
		await nameInput.setValue('Ruta fallo')
		wrapper.vm.startLatLng = { lat: 41.380, lng: 2.170 }
		wrapper.vm.endLatLng = { lat: 41.390, lng: 2.180 }

		// Disparar submit sin await para comprobar estado intermedio
		wrapper.find('form').trigger('submit.prevent')
		// Dar chance al componente para marcar saving
		await new Promise((r) => setTimeout(r, 0))
		expect(wrapper.vm.saving).toBe(true)

	// Rechazar la petición simulada
	const err = new Error('Server error')
	err.response = { data: { message: 'Server failed' } }
	d.reject(err)
	// permitir microtasks/promises pendientes y actualizar DOM
	await Promise.resolve()
	await wrapper.vm.$nextTick()

	expect(wrapper.vm.saving).toBe(false)
	expect(wrapper.vm.error).toBe('Server failed')
	expect(wrapper.find('.error-box').exists()).toBe(true)
	})
})

