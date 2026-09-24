import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const html = readFileSync(join(root, 'index.html'), 'utf8')
const meta = (attr: 'name' | 'property', key: string) => {
  const m = html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`))
  return m?.[1]
}

const LIVE = 'https://tic-tac-toe.iam4bs.dev/'

describe('page metadata', () => {
  it('describes the page for search engines', () => {
    expect(meta('name', 'description')).toMatch(/tic-tac-toe/i)
    expect(html).toContain(`<link rel="canonical" href="${LIVE}" />`)
  })

  it('unfurls as a card with a banner when the link is pasted into a chat', () => {
    expect(meta('property', 'og:type')).toBe('website')
    expect(meta('property', 'og:title')).toBe('Tic-Tac-Toe')
    expect(meta('property', 'og:description')).toBeTruthy()
    expect(meta('property', 'og:url')).toBe(LIVE)
    expect(meta('property', 'og:image')).toBe(`${LIVE}og-image.png`)
    expect(meta('property', 'og:image:width')).toBe('1200')
    expect(meta('property', 'og:image:height')).toBe('630')
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    expect(meta('name', 'twitter:image')).toBe(`${LIVE}og-image.png`)
  })

  it('ships the banner and the crawler files', () => {
    for (const file of ['og-image.png', 'robots.txt', 'sitemap.xml']) {
      expect(() => readFileSync(join(root, 'public', file))).not.toThrow()
    }
    const robots = readFileSync(join(root, 'public', 'robots.txt'), 'utf8')
    expect(robots).toContain('Allow: /')
    expect(robots).toContain(`Sitemap: ${LIVE}sitemap.xml`)
    expect(readFileSync(join(root, 'public', 'sitemap.xml'), 'utf8')).toContain(`<loc>${LIVE}</loc>`)
  })

  it('names the app for structured data', () => {
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
    expect(ld).toBeTruthy()
    const data = JSON.parse(ld!)
    expect(data['@type']).toBe('WebApplication')
    expect(data.name).toBe('Tic-Tac-Toe')
    expect(data.url).toBe(LIVE)
  })
})

describe('theme', () => {
  it('is dark only: the document starts dark and nothing follows the system setting', () => {
    expect(html).toMatch(/<html lang="en" class="dark">/)
    expect(html).toContain('<meta name="color-scheme" content="dark" />')
    const main = readFileSync(join(root, 'src', 'main.tsx'), 'utf8')
    expect(main).not.toContain('prefers-color-scheme')
  })
})
