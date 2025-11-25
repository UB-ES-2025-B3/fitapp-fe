import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import ExecutionFinishModal from '@/components/ExecutionFinishModal.vue'

describe('ExecutionFinishModal.vue', () => {
  it('Muestra resumen de datos correctamente', () => {
    const wrapper = mount(ExecutionFinishModal, {
      props: {
        distanceKm: 10.5,
        durationSec: 3665, // 1h 1m 5s
        isFinishing: false
      }
    })

    expect(wrapper.text()).toContain('10.50 km')
    expect(wrapper.text()).toContain('01:01:05') // Formato HH:MM:SS
  })

  it('Valida que se seleccione tipo de actividad', async () => {
    const wrapper = mount(ExecutionFinishModal, {
      props: { distanceKm: 5, durationSec: 100 }
    })

    await wrapper.find('form').trigger('submit.prevent')
    
    expect(wrapper.text()).toContain('El tipo de actividad es obligatorio')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('Emite evento save con los datos del formulario', async () => {
    const wrapper = mount(ExecutionFinishModal, {
      props: { distanceKm: 5, durationSec: 100 }
    })

    // Seleccionar actividad
    await wrapper.find('select').setValue('CYCLING_MODERATE')
    // Escribir nota
    await wrapper.find('textarea').setValue('Muy divertido')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('save')).toBeTruthy()
    const payload = wrapper.emitted('save')[0][0]
    expect(payload).toEqual({
      activityType: 'CYCLING_MODERATE',
      notes: 'Muy divertido'
    })
  })
})