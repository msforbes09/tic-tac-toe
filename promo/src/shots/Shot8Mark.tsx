import { interpolate, useCurrentFrame } from "remotion"
import { Logo } from "../components/Logo"
import { Column, heading, Shot } from "../components/Shot"
import { type Layout, LOGO_SETTLE, TYPE, zones } from "../layout"
import { rise } from "../motion"
import { type Beats, TOTAL_FRAMES } from "../timeline"

// Shot 8: the logo draws (O, then X) over "Kaya Randomized", and holds to the last frame, settling 4 px.
export function Shot8Mark({ layout, from, beats }: { layout: Layout; from: number; beats: Beats }) {
  const frame = useCurrentFrame()
  const size = TYPE[layout].wordmark
  const settle = interpolate(frame, [beats.logo, TOTAL_FRAMES], [0, LOGO_SETTLE], {
    extrapolateLeft: "clamp",
  })
  return (
    <Shot from={from}>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${settle}px)` }}>
        <Column box={zones(layout).logo} gap={size * 0.36}>
          <Logo at={beats.logo} size={layout === "reel" ? 440 : 300} />
          <div style={{ ...heading(size), ...rise(frame, beats.logoDone) }}>Kaya Randomized</div>
        </Column>
      </div>
    </Shot>
  )
}
