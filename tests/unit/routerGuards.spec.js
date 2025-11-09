import { describe, it, expect, vi } from 'vitest'

// Estas pruebas verifican que el guard global del router redirige según el estado
// del store de sesión (token + profileExists). Se mockea el store antes de
// importar el router para que la importación use la versión mockeada.

describe('Guards del router (auth + onboarding)', () => {
  it('Usuario no autenticado → redirige a login al intentar /routes/new', async () => {
    vi.resetModules()
    // Asegurar localStorage vacío (no autenticado)
    localStorage.removeItem('token')
    localStorage.setItem('profileExists', 'false')

    const { default: router } = await import('@/router/index.js')

    // Intentar navegar a /routes/new
    await router.push('/routes/new')
    // esperar a que terminen las navegaciones pendientes
    await router.isReady()
    const name = router.currentRoute.value.name
    expect(name).toBe('login')
  })

  it('Usuario no autenticado → redirige a login al intentar /routes/:id/edit', async () => {
    vi.resetModules()
    localStorage.removeItem('token')
    localStorage.setItem('profileExists', 'false')

    const { default: router } = await import('@/router/index.js')
    await router.push('/routes/abc/edit')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('Usuario autenticado sin perfil → forzar onboarding', async () => {
    vi.resetModules()
    // Usuario autenticado pero sin profileExists
    localStorage.setItem('token', 'tok')
    localStorage.setItem('profileExists', 'false')

    const { default: router } = await import('@/router/index.js')
    // Ir a /routes (se le debe forzar al OnboardingProfile)
    await router.push('/routes')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('OnboardingProfile')
  })

  it('Usuario autenticado con perfil → puede acceder a /routes', async () => {
    vi.resetModules()
    // Usuario autenticado y profileExists true
    localStorage.setItem('token', 'tok')
    localStorage.setItem('profileExists', 'true')

    const { default: router } = await import('@/router/index.js')
    await router.push('/routes')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('RoutesList')
  })
})
