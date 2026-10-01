import { Audio, Sequence, staticFile } from "remotion"
import { VOLUME, musicVolume } from "./mix"
import { type Clip, type Timeline, clipEnd, soundCues } from "./timeline"

// A stretch of a voice file placed on the film.
function Voice({ file, clip, volume }: { file: string; clip: Clip; volume: number }) {
  return (
    <Sequence from={clip.from} durationInFrames={clipEnd(clip) - clip.from} layout="none">
      <Audio src={staticFile(file)} trimBefore={clip.trimBefore} volume={volume} />
    </Sequence>
  )
}

// Every sound in the film: narration sentences, the two bot lines, the game's tones, and the music bed.
export function Soundtrack({ timeline }: { timeline: Timeline }) {
  return (
    <>
      <Audio
        src={staticFile("music-dim-light.mp3")}
        volume={(f) => musicVolume(f, timeline.speech)}
      />
      {Object.entries(timeline.narration).map(([key, clip]) => (
        <Voice key={key} file="narration.mp3" clip={clip} volume={VOLUME.narration} />
      ))}
      <Voice file="bot-01.mp3" clip={timeline.bot1} volume={VOLUME["bot-01"]} />
      <Voice file="bot-02.mp3" clip={timeline.bot2} volume={VOLUME["bot-02"]} />
      {soundCues(timeline).map(({ at, cue }) => (
        <Sequence key={`${cue}-${at}`} from={at} layout="none">
          <Audio src={staticFile(`tones/${cue}.wav`)} volume={VOLUME.tones} />
        </Sequence>
      ))}
    </>
  )
}
