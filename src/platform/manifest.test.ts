import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Vitest runs from the project root.
const publicDir = join(process.cwd(), 'public')
const read = (name: string) => readFileSync(join(publicDir, name), 'utf8')

describe('web app manifest', () => {
  it('is installable as a standalone app', () => {
    const manifest = JSON.parse(read('manifest.webmanifest'))
    expect(manifest.name).toBe('Tic-Tac-Toe')
    expect(manifest.display).toBe('standalone')
  })

  it('uses relative URLs so it works under the GitHub Pages sub-path', () => {
    const manifest = JSON.parse(read('manifest.webmanifest'))
    expect(manifest.start_url).toBe('./')
    expect(manifest.scope).toBe('./')
    for (const icon of manifest.icons) expect(icon.src.startsWith('/')).toBe(false)
  })

  it('ships 192px and 512px icons that exist', () => {
    const manifest = JSON.parse(read('manifest.webmanifest'))
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    for (const icon of manifest.icons) expect(existsSync(join(publicDir, icon.src))).toBe(true)
  })
})

describe('service worker', () => {
  it('exists and caches with relative URLs only', () => {
    const sw = read('sw.js')
    expect(sw).toContain("addEventListener('fetch'")
    expect(sw).not.toMatch(/['"]\/[a-z]/i)
  })
})
