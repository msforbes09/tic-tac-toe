import { describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './serviceWorker'

const fakeNavigator = () => ({ serviceWorker: { register: vi.fn(async () => ({})) } })

describe('registerServiceWorker', () => {
  it('registers sw.js under the base path with a matching scope in production', async () => {
    const nav = fakeNavigator()
    await registerServiceWorker({ nav, baseUrl: '/tic-tac-toe-react/', production: true })
    expect(nav.serviceWorker.register).toHaveBeenCalledWith('/tic-tac-toe-react/sw.js', {
      scope: '/tic-tac-toe-react/',
    })
  })

  it('does nothing in development, so the dev server is never cached', async () => {
    const nav = fakeNavigator()
    await registerServiceWorker({ nav, baseUrl: '/', production: false })
    expect(nav.serviceWorker.register).not.toHaveBeenCalled()
  })

  it('does nothing in browsers without service workers', async () => {
    await expect(registerServiceWorker({ nav: {}, baseUrl: '/', production: true })).resolves.toBeUndefined()
  })

  it('swallows registration failures; offline support is best-effort', async () => {
    const nav = { serviceWorker: { register: vi.fn(async () => Promise.reject(new Error('blocked'))) } }
    await expect(registerServiceWorker({ nav, baseUrl: '/', production: true })).resolves.toBeUndefined()
  })
})
