// Writes the game's tones to docs/promo/audio/tones/<cue>.wav.
import { mkdirSync, writeFileSync } from "node:fs"
import { CUES, type CueName, encodeWav, renderCue } from "../src/tones.ts"

const dir = new URL("../../docs/promo/audio/tones/", import.meta.url)
mkdirSync(dir, { recursive: true })

for (const name of Object.keys(CUES) as CueName[]) {
  writeFileSync(new URL(`${name}.wav`, dir), encodeWav(renderCue(CUES[name])))
  console.log(`tones: ${name}.wav`)
}
