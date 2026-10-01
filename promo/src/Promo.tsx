import { useEffect, useState } from "react"
import { AbsoluteFill, cancelRender, continueRender, delayRender } from "remotion"
import measured from "../../docs/promo/audio/durations.json"
import { Glows } from "./components/Glows"
import type { Layout } from "./layout"
import { GameBoard } from "./shots/GameBoard"
import { Shot1Board } from "./shots/Shot1Board"
import { Shot2TalksBack } from "./shots/Shot2TalksBack"
import { Shot3YouWin } from "./shots/Shot3YouWin"
import { Shot4Modes } from "./shots/Shot4Modes"
import { Shot5FortyOne } from "./shots/Shot5FortyOne"
import { Shot6Free } from "./shots/Shot6Free"
import { Shot7Slogan } from "./shots/Shot7Slogan"
import { Shot8Mark } from "./shots/Shot8Mark"
import { Soundtrack } from "./Soundtrack"
import { type Measured, buildTimeline } from "./timeline"
import { COLOR, FONT } from "./tokens"

const t = buildTimeline(measured as Measured)

// Holds the render until both faces are loaded; a missing face fails the render instead of falling back.
function useFonts() {
  const [handle] = useState(() => delayRender("Loading Fredoka and Nunito"))
  useEffect(() => {
    Promise.all([
      document.fonts.load(`600 64px ${FONT.heading}`),
      document.fonts.load(`700 64px ${FONT.text}`),
      document.fonts.load(`600 64px ${FONT.text}`),
    ])
      .then((faces) => {
        if (faces.some((f) => f.length === 0)) throw new Error("A promo font did not load")
        continueRender(handle)
      })
      .catch(cancelRender)
  }, [handle])
}

export function Promo({ layout }: { layout: Layout }) {
  useFonts()
  const s = t.shots
  return (
    <AbsoluteFill style={{ background: COLOR.background, overflow: "hidden" }}>
      <Glows layout={layout} />
      <GameBoard layout={layout} to={s["4a"]} />
      <Shot1Board layout={layout} to={s["2"]} sublineAt={t.narration["2"].from + 3} />
      <Shot2TalksBack
        layout={layout}
        from={s["2"]}
        to={s["3"]}
        popAt={t.bot1.from}
        exitAt={t.bubble1Exit}
      />
      <Shot3YouWin
        layout={layout}
        from={s["3"]}
        to={s["4a"]}
        bubbleAt={t.bot2.from}
        bubbleExit={t.bubble2Exit}
        toastAt={t.toast}
      />
      <Shot4Modes
        layout={layout}
        starts={[s["4a"], s["4b"], s["4c"]]}
        to={s["5"]}
        beats={t.beats}
      />
      <Shot5FortyOne layout={layout} from={s["5"]} to={s["6"]} beats={t.beats} />
      <Shot6Free layout={layout} from={s["6"]} to={s["7"]} beats={t.beats} />
      <Shot7Slogan layout={layout} from={s["7"]} to={s["8"]} zeroAt={t.zero} beats={t.beats} />
      <Shot8Mark layout={layout} from={s["8"]} beats={t.beats} />
      <Soundtrack timeline={t} />
    </AbsoluteFill>
  )
}
