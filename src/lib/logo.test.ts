import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOGO } from './logo'

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

describe('logo geometry', () => {
  it('runs the X’s lower-right arm across the O’s ring and ends inside it', () => {
    const tipX = LOGO.x.cx + LOGO.x.arm
    const tipY = LOGO.x.cy + LOGO.x.arm
    const toCentre = dist(tipX, tipY, LOGO.o.cx, LOGO.o.cy)
    // The tip sits past the ring's inner edge, so the arm visibly crosses the stroke.
    expect(toCentre).toBeLessThan(LOGO.o.r - LOGO.stroke / 2)
    // But the X's centre stays outside the ring: two marks that overlap, not one on top of the other.
    expect(dist(LOGO.x.cx, LOGO.x.cy, LOGO.o.cx, LOGO.o.cy)).toBeGreaterThan(LOGO.o.r + LOGO.stroke / 2)
  })

  it('keeps both marks inside the maskable safe zone (inner 80%)', () => {
    const margin = LOGO.size * 0.1
    const half = LOGO.stroke / 2
    expect(LOGO.x.cx - LOGO.x.arm - half).toBeGreaterThanOrEqual(margin)
    expect(LOGO.x.cy - LOGO.x.arm - half).toBeGreaterThanOrEqual(margin)
    expect(LOGO.o.cx + LOGO.o.r + half).toBeLessThanOrEqual(LOGO.size - margin)
    expect(LOGO.o.cy + LOGO.o.r + half).toBeLessThanOrEqual(LOGO.size - margin)
  })
})

describe('public/icon.svg', () => {
  const svg = readFileSync(join(process.cwd(), 'public', 'icon.svg'), 'utf8')
  const num = (re: RegExp) => Number(svg.match(re)?.[1])

  it('draws the same geometry as LOGO', () => {
    expect(svg).toContain(`viewBox="0 0 ${LOGO.size} ${LOGO.size}"`)
    const { cx, cy, arm } = LOGO.x
    expect(svg).toContain(`d="M${cx - arm} ${cy - arm} L${cx + arm} ${cy + arm}"`)
    expect(svg).toContain(`d="M${cx + arm} ${cy - arm} L${cx - arm} ${cy + arm}"`)
    expect(num(/circle cx="(\d+)"/)).toBe(LOGO.o.cx)
    expect(num(/circle cx="\d+" cy="(\d+)"/)).toBe(LOGO.o.cy)
    expect(num(/ r="(\d+)"/)).toBe(LOGO.o.r)
    expect(svg.match(/stroke-width="(\d+)"/g)?.every((m) => m === `stroke-width="${LOGO.stroke}"`)).toBe(true)
  })

  it('draws the O before the X so the X sits on top', () => {
    expect(svg.indexOf('<circle')).toBeLessThan(svg.indexOf('<path'))
  })
})
