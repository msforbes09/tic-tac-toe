// Offline support. Every URL here is relative to this file, so the same worker runs at `/`
// locally and under `/<repo>/` on GitHub Pages.
const CACHE = 'tic-tac-toe-v2'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  // Pages: network first so a new deploy shows up, cached copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy))
          return response
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  // Assets are content-hashed by Vite: serve from cache, fetch and store on a miss. The host answers
  // unknown paths with the app's HTML, so an asset fetched during a deploy can come back as HTML;
  // never store that under an asset URL, and never serve such an entry if one slipped in.
  const isHtml = (response) => (response.headers.get('content-type') || '').includes('text/html')
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached && !isHtml(cached)) return cached
      // A browser that fetched an asset during a deploy may hold that HTML in its HTTP cache as
      // immutable; refetch past the cache once before giving up.
      const fromNetwork = fetch(request).then((response) =>
        isHtml(response) ? fetch(request, { cache: 'reload' }) : response,
      )
      return fromNetwork.then((response) => {
        if (response.ok && !isHtml(response)) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
