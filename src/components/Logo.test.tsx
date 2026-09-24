import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LOGO } from '@/lib/logo'
import { Logo } from './Logo'

describe('Logo', () => {
  it('draws the shared geometry, O under X', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${LOGO.size} ${LOGO.size}`)
    const marks = Array.from(svg.querySelectorAll('[data-player]'))
    expect(marks.map((m) => m.getAttribute('data-player'))).toEqual(['O', 'X'])
    expect(svg.querySelector('circle')?.getAttribute('cx')).toBe(String(LOGO.o.cx))
    expect(svg.querySelectorAll('.logo-mark')).toHaveLength(0)
  })

  it('when animated, draws the O first and then the X', () => {
    const { container } = render(<Logo animate />)
    const marks = Array.from(container.querySelectorAll('.logo-mark')) as HTMLElement[]
    expect(marks.map((m) => m.dataset.player)).toEqual(['O', 'X'])
    const delay = (m: HTMLElement) => parseInt(m.style.getPropertyValue('--logo-delay'))
    expect(delay(marks[0])).toBeLessThan(delay(marks[1]))
  })
})
