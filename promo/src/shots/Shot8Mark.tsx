import { interpolate, useCurrentFrame } from "remotion"
import { Logo } from "../components/Logo"
import { Column, heading, Shot } from "../components/Shot"
import { type Layout, LOGO_SETTLE, TYPE, zones } from "../layout"
import { rise } from "../motion"
import { BEATS, TOTAL_FRAMES } from "../timeline"

const LOGO_AT = 4 // the X completes 26 frames later, on BEATS.logoDone

// Shot 8: the logo draws (O, then X) over "Kaya Randomized", and holds to the last frame, settling 4 px.
export function Shot8Mark({ layout, from }: { layout: Layout; from: number }) {
  const frame = useCurrentFrame()
  const size = TYPE[layout].wordmark
  const settle = interpolate(frame, [from + LOGO_AT, TOTAL_FRAMES], [0, LOGO_SETTLE], {
    extrapolateLeft: "clamp",
  })
  return (
    <Shot from={from}>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${settle}px)` }}>
        <Column box={zones(layout).logo} gap={size * 0.36}>
          <Logo at={from + LOGO_AT} size={layout === "reel" ? 440 : 300} />
          <div style={{ ...heading(size), ...rise(frame, from + BEATS.logoDone) }}>Kaya Randomized</div>
        </Column>
      </div>
    </Shot>
  )
}
