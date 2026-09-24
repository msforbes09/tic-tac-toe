import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

type Handler = (event: unknown) => void

/** Runs public/sw.js against fake `self`, `caches`, and `fetch`, and returns handles to poke it. */
function loadWorker(network: (url: string, init?: RequestInit) => Response) {
  const handlers: Record<string, Handler> = {}
  const store = new Map<string, Response>()
  const cache = {
    addAll: async () => {},
    put: async (req: Request | string, res: Response) => {
      store.set(typeof req === 'string' ? new URL(req, 'https://app.test/').href : req.url, res)
    },
    match: async (req: Request | string) => store.get(typeof req === 'string' ? new URL(req, 'https://app.test/').href : req.url),
  }
  const caches = { open: async () => cache, keys: async () => [], match: async (req: Request) => store.get(req.url), delete: async () => true }
  const self = {
    location: { origin: 'https://app.test' },
    addEventListener: (type: string, h: Handler) => {
      handlers[type] = h
    },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  }
  const fetch = vi.fn(async (req: Request, init?: RequestInit) => network(req.url, init))
  const code = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8')
  new Function('self', 'caches', 'fetch', code)(self, caches, fetch)

  const request = async (path: string, mode: RequestMode = 'no-cors') => {
    const req = new Request(`https://app.test${path}`, { mode })
    let responded: Promise<Response> | null = null
    handlers.fetch({ request: req, respondWith: (p: Promise<Response>) => (responded = p) })
    const res = await responded!
    await new Promise((r) => setTimeout(r, 0))
    return res
  }
  return { request, store, fetch, handlers }
}

const html = () => new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
const js = () => new Response('console.log(1)', { status: 200, headers: { 'content-type': 'application/javascript' } })

describe('service worker asset caching', () => {
  it('caches a real script and serves it from cache next time', async () => {
    const { request, store, fetch } = loadWorker(() => js())
    const first = await request('/assets/index-abc.js')
    expect(first.headers.get('content-type')).toContain('javascript')
    expect(store.has('https://app.test/assets/index-abc.js')).toBe(true)
    await request('/assets/index-abc.js')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("does not cache the host's HTML fallback under an asset URL", async () => {
    const { request, store } = loadWorker(() => html())
    await request('/assets/index-missing.js')
    expect(store.has('https://app.test/assets/index-missing.js')).toBe(false)
  })

  it('ignores a poisoned HTML entry for an asset and goes to the network', async () => {
    const { request, store, fetch } = loadWorker(() => js())
    store.set('https://app.test/assets/index-abc.js', html())
    const res = await request('/assets/index-abc.js')
    expect(res.headers.get('content-type')).toContain('javascript')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('uses a fresh cache name so installs replace the poisoned v1 cache', () => {
    const code = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8')
    expect(code).not.toMatch(/tic-tac-toe-v1'/)
  })

  it("refetches past the browser's HTTP cache when an asset comes back as HTML", async () => {
    // The first, cache-allowed fetch returns a poisoned HTML entry; the bypassing refetch gets the script.
    const { request, fetch } = loadWorker((_url, init) => (init?.cache === 'reload' ? js() : html()))
    const res = await request('/assets/index-abc.js')
    expect(res.headers.get('content-type')).toContain('javascript')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect((fetch.mock.calls[1] as unknown[])[1]).toEqual({ cache: 'reload' })
  })
})
