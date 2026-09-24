import { describe, expect, it } from 'vitest'
import { ADJECTIVES, TERMS, randomName, uniqueName } from './names'

describe('themed names', () => {
  it('pairs an adjective with a board term', () => {
    expect(randomName(() => 0)).toBe(`${ADJECTIVES[0]} ${TERMS[0]}`)
    expect(randomName(() => 0.999)).toBe(`${ADJECTIVES[ADJECTIVES.length - 1]} ${TERMS[TERMS.length - 1]}`)
    expect(ADJECTIVES.length).toBeGreaterThanOrEqual(30)
    expect(TERMS).toContain('Diagonal')
  })

  it('adds a two-digit suffix when the name is taken', () => {
    const base = randomName(() => 0)
    const name = uniqueName([base], () => 0)
    expect(name).toMatch(new RegExp(`^${base} \\d\\d$`))
    expect(uniqueName([], () => 0)).toBe(base)
  })

  it('keeps trying when the suffixed name is taken too', () => {
    const base = randomName(() => 0)
    const taken = [base, `${base} 10`]
    const name = uniqueName(taken, () => 0)
    expect(taken).not.toContain(name)
  })
})
