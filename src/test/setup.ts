import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Newer Node ships a built-in `localStorage` global (stable behind
// --localstorage-file) that shadows jsdom's window.localStorage with a
// non-functional stub when no file path is configured. Install a real
// in-memory implementation unconditionally so tests that touch
// window.localStorage work, without ever reading Node's lazy stub (which
// itself emits a startup warning on first access).
{
  const store = new Map<string, string>()
  const memoryStorage: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }
  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage,
    writable: true,
    configurable: true,
  })
}

afterEach(() => {
  cleanup()
})
