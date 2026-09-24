export type ServiceWorkerDeps = {
  nav: { serviceWorker?: { register: (url: string, options: RegistrationOptions) => Promise<unknown> } }
  /** Vite's BASE_URL: `/` locally, `/<repo>/` on GitHub Pages. */
  baseUrl: string
  production: boolean
}

/** Registers the offline cache in production builds only. Failures are ignored: offline is best-effort. */
export async function registerServiceWorker({ nav, baseUrl, production }: ServiceWorkerDeps): Promise<void> {
  if (!production || !nav.serviceWorker) return
  try {
    await nav.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl })
  } catch {
    // Private mode, blocked by policy, or served over plain HTTP. The game still works online.
  }
}
