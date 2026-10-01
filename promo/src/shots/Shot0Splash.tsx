import type { CSSProperties } from "react"
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion"
import { SPLASH } from "../brand"
import { Logo } from "../components/Logo"
import { Column, heading, text } from "../components/Shot"
import { type Layout, SPLASH_OUT_SCALE, SPLASH_RISE, TYPE, zones } from "../layout"
import { RISE_SLOW, enter } from "../motion"
import type { Beats } from "../timeline"
import { EXIT } from "../tokens"

const OUT_FRAMES = 11 // the app's 360 ms splash-out

// The splash's own rise (the app's 420 ms splash-rise): 10 px up and in, on the app easing. Not `rise`:
// the splash moves 10 px, not SLIDE, and it never leaves on its own (the splash-out takes it).
function splashRise(frame: number, at: number): CSSProperties {
  const p = enter(frame, at, RISE_SLOW)
  return { opacity: p, transform: `translateY(${(1 - p) * SPLASH_RISE}px)` }
}

// Shot 0: the app's splash, held longer for a video. The logo draws O then X, the title and slogan rise,
// the footer is there from the start; it leaves with the app's splash-out (fade and grow), not a crossfade.
export function Shot0Splash({ layout, beats }: { layout: Layout; beats: Beats["splash"] }) {
  const frame = useCurrentFrame()
  if (frame >= beats.exit + OUT_FRAMES) return null
  const z = zones(layout)
  const type = TYPE[layout]
  const out = interpolate(frame, [beats.exit, beats.exit + OUT_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EXIT,
  })
  return (
    <AbsoluteFill
      style={{ opacity: 1 - out, transform: `scale(${1 + (SPLASH_OUT_SCALE - 1) * out})` }}
    >
      <Column box={z.splash} gap={0}>
        <Logo at={beats.logo} size={z.splashLogo} />
        <div
          style={{
            ...heading(type.title),
            letterSpacing: "-0.01em",
            marginTop: z.splashGaps[0],
            ...splashRise(frame, beats.title),
          }}
        >
          {SPLASH.title}
        </div>
        <div
          style={{
            ...text(type.subline),
            marginTop: z.splashGaps[1],
            ...splashRise(frame, beats.slogan),
          }}
        >
          {SPLASH.slogan}
        </div>
      </Column>
      <Column box={z.footer} gap={0}>
        <div style={{ ...text(type.footer), fontWeight: 600, opacity: 0.7 }}>{SPLASH.footer}</div>
      </Column>
    </AbsoluteFill>
  )
}
