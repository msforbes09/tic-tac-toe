import "@fontsource-variable/fredoka"
import "@fontsource-variable/nunito"
import { Composition } from "remotion"
import { CANVAS, type Layout } from "./layout"
import { Promo } from "./Promo"
import { FPS, TOTAL_FRAMES } from "./timeline"

export function Root() {
  return (
    <Composition
      id="Promo"
      component={Promo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      {...CANVAS.reel}
      defaultProps={{ layout: "reel" as Layout }}
      calculateMetadata={({ props }) => CANVAS[props.layout]}
    />
  )
}
