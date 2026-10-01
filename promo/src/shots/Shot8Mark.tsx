import { interpolate, useCurrentFrame } from "remotion"
import { Logo } from "../components/Logo"
import { Column, heading, Shot, text } from "../components/Shot"
import { type Layout, LOGO_SETTLE, TYPE, zones } from "../layout"
import { rise } from "../motion"
import { type Beats, TOTAL_FRAMES } from "../timeline"
import { COLOR } from "../tokens"

const URL_FRAMES = 12

// Shot 8: the logo draws (O, then X) over "Kaya Randomized" and, once that rises, the site's address in a
// quiet line (owner ruling, 2026-10-01). Holds to the last frame, settling 4 px.
export function Shot8Mark({ layout, from, beats }: { layout: Layout; from: number; beats: Beats }) {
  const frame = useCurrentFrame()
  const type = TYPE[layout]
  const settle = interpolate(frame, [beats.logo, TOTAL_FRAMES], [0, LOGO_SETTLE], {
    extrapolateLeft: "clamp",
  })
  return (
    <Shot from={from}>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${settle}px)` }}>
        <Column box={zones(layout).logo} gap={type.wordmark * 0.36}>
          <Logo at={beats.logo} size={layout === "reel" ? 440 : 300} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: type.url * 0.35,
            }}
          >
            <div style={{ ...heading(type.wordmark), ...rise(frame, beats.logoDone) }}>
              Kaya Randomized
            </div>
            <div
              style={{
                ...text(type.url, COLOR.muted),
                ...rise(frame, beats.url, Infinity, URL_FRAMES),
              }}
            >
              tictactoe.kayarandomized.com
            </div>
          </div>
        </Column>
      </div>
    </Shot>
  )
}
