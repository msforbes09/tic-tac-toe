# Promo video

The 30-second "It talks back" clip for Kaya Randomized, built in [Remotion](https://www.remotion.dev)
4.0.531 from the storyboard at `docs/promo/storyboard.md`. One composition, `Promo`, with a `layout`
prop: `reel` (1080×1920) and `square` (1080×1080), 900 frames at 30 fps. Its own `package.json`; the
game is untouched.

## Run from a fresh clone

Node 22.18 or newer (the scripts are TypeScript run directly by Node).

```sh
npm --prefix promo ci
npm --prefix promo test         # Vitest: timeline, tones, mix, layout, loudness, script
npm --prefix promo run typecheck
npm --prefix promo run dev      # Remotion Studio, to scrub the film
npm --prefix promo run render   # out/reel.mp4 and out/square.mp4 (also render:reel / render:square)
npm --prefix promo run stills   # verification stills into handoff/002-promo-video/stills/
```

Rendering needs a Chrome. Set `REMOTION_CHROME` to an installed Chrome binary to use it (macOS:
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`); leave it unset and Remotion downloads its
own headless shell on the first render.

`render` renders the mix with Remotion, then `scripts/master.ts` masters it with Remotion's bundled ffmpeg
(two-pass loudnorm to -14 LUFS, true peak -1.5 dBTP), trims to exactly 30.00 s and drops container
metadata. `out/` is git-ignored.

## Audio

Everything the film plays is committed under `docs/promo/audio/` (see `CREDITS.md`), which Remotion serves
as its static folder.

- `npm --prefix promo run voice` generated `narration.mp3`, `bot-01.mp3`, `bot-02.mp3` and
  `durations.json` once, through ElevenLabs. The committed files are the source of truth; re-run only to
  replace a wrong line. It reads three variables from `promo/.env` (git-ignored, never committed):
  `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_NARRATOR`, `ELEVENLABS_VOICE_BOT`.
- `npm --prefix promo run tones` writes the game's own tones to `tones/*.wav`.

## Where things live

- `src/timeline.ts`: every shot's start frame, voice placement and sound cue, from the storyboard's rules
  and `durations.json`. A take that breaks a rule fails the tests and the render.
- `src/mix.ts`: relative levels (narrator reference, bot 2 dB under, music 9 dB under and ducked 4 dB in
  speech, tones 1 dB over the music). `src/loudness.ts`: the master's loudnorm passes.
- `src/layout.ts`: canvas, safe areas, anchors and type sizes per format; `layout.test.ts` checks that
  no essential layer enters the 9:16 top 250 px or bottom 400 px.
- `src/tokens.ts`: colours, fonts, easing. `src/tones.ts`: the tone synthesiser.
- `src/shots/`: one component per shot; `src/components/`: board, marks, bubble, toast, logo, glows.
