import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')

describe('fonts', () => {
  it('bundles Nunito for text and Fredoka for headings, no Geist', () => {
    expect(css).toContain('@import "@fontsource-variable/nunito"')
    expect(css).toContain('@import "@fontsource-variable/fredoka"')
    expect(css).not.toContain('geist')
    expect(css).toMatch(/--font-sans:\s*'Nunito Variable'/)
    expect(css).toMatch(/--font-heading:\s*'Fredoka Variable'/)
  })
})
