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

  it('cuts a background-coloured gap in the O where the X’s arm crosses it', () => {
    const { container } = render(<Logo />)
    const paths = Array.from(container.querySelectorAll('path'))
    const arm = `M${LOGO.x.cx - LOGO.x.arm} ${LOGO.x.cy - LOGO.x.arm} L${LOGO.x.cx + LOGO.x.arm} ${LOGO.x.cy + LOGO.x.arm}`
    const [knockout, coloured] = paths.filter((p) => p.getAttribute('d') === arm)
    expect(knockout.getAttribute('stroke')).toBe('var(--background)')
    expect(Number(knockout.getAttribute('stroke-width'))).toBe(LOGO.stroke + 2 * LOGO.gap)
    expect(coloured.getAttribute('stroke')).toBe('currentColor')
  })

  it('when animated, draws the O first and then the X', () => {
    const { container } = render(<Logo animate />)
    const marks = Array.from(container.querySelectorAll('.logo-mark')) as HTMLElement[]
    expect(marks.map((m) => m.dataset.player)).toEqual(['O', 'X'])
    const delay = (m: HTMLElement) => parseInt(m.style.getPropertyValue('--logo-delay'))
    expect(delay(marks[0])).toBeLessThan(delay(marks[1]))
  })

  it('when animated, the X’s second arm waits for the first arm to finish drawing', () => {
    const { container } = render(<Logo animate />)
    const arms = Array.from(container.querySelectorAll('[data-player="X"] path')).filter(
      (p) => (p as SVGPathElement).getAttribute('stroke') !== 'var(--background)',
    ) as HTMLElement[]
    expect(arms).toHaveLength(2)
    const ms = (v: string) => parseInt(v || '0')
    const firstDuration = ms(arms[0].style.getPropertyValue('--mark-duration'))
    expect(ms(arms[1].style.getPropertyValue('--mark-delay'))).toBeGreaterThanOrEqual(firstDuration)
    expect(firstDuration).toBeGreaterThan(0)
  })
})
