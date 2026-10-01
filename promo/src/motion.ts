// The storyboard's motion vocabulary (section 2): eased enters, 8-frame exits, 12 px rises.
import type { CSSProperties } from "react"
import { interpolate } from "remotion"
import { SLIDE } from "./layout"
import { ENTER, EXIT, EXIT_FRAMES } from "./tokens"

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const

// 0 before `at`, 1 after `at + length`, eased in between.
export const enter = (frame: number, at: number, length = 10) =>
  interpolate(frame, [at, at + length], [0, 1], { ...clamp, easing: ENTER })

// 0 until `at` (never, when `at` is Infinity), 1 after the 8-frame exit.
export const exit = (frame: number, at: number) =>
  Number.isFinite(at)
    ? interpolate(frame, [at, at + EXIT_FRAMES], [0, 1], { ...clamp, easing: EXIT })
    : 0

// Rises SLIDE px into place from `inAt` over `length` frames; leaves SLIDE px down from `outAt`.
export function rise(frame: number, inAt: number, outAt = Infinity, length = 10): CSSProperties {
  const i = enter(frame, inAt, length)
  const o = exit(frame, outAt)
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i + o) * SLIDE}px)` }
}

// The bot's "thinking" breath (index.css): one 1.1 s cycle from `at`, scale 1 to 0.88 to 1, opacity 1 to 0.7 to 1.
const BREATH_FRAMES = 33
export function breathe(frame: number, at: number): { scale: number; opacity: number } {
  const scale = interpolate(
    frame,
    [at, at + BREATH_FRAMES / 2, at + BREATH_FRAMES],
    [1, 0.88, 1],
    clamp,
  )
  return { scale, opacity: 1 - 0.3 * ((1 - scale) / 0.12) }
}

// Pops from `scale` to 1 and fades in over 8 frames.
export function pop(frame: number, at: number, from = 0.9): { opacity: number; transform: string } {
  const p = enter(frame, at, 8)
  return { opacity: p, transform: `scale(${from + (1 - from) * p})` }
}
