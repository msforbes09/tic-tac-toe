# Result: 002 Promo video

**Status:** in progress (plan)
**Date:** 2026-10-01
**Branch / PR:** `feat/promo-video` (from `develop` @ 2f1bbe1) / PR not yet open
**Preview or run link:** —

## Plan

Order of work. Each step ends green before the next starts; pure modules go Red → Green → Refactor.

1. **Scaffold `promo/`.** `package.json` pinned: `remotion` and `@remotion/cli` 4.0.531, `react` / `react-dom`
   19.3.0, `@fontsource-variable/fredoka` and `/nunito` at the game's versions, `vitest` and `typescript` at the
   game's versions, `@remotion/media-utils` only if ffprobe (see 6) proves insufficient. Scripts `dev`, `render`,
   `render:reel`, `render:square`, `voice`, `tones`, `test`, `typecheck`. `tsconfig.json`, `remotion.config.ts`,
   `vitest.config.ts`. `.gitignore` gains `promo/out/` (`node_modules` is already covered repo-wide).
   Dependency clash check (peer ranges against the game's React 19.3) written into Rulings.
2. **`src/tones.ts` (TDD).** Pure: `triangleTone(freq, seconds, sampleRate)` with short attack/release,
   `sequence(notes, gap, length)` for the win, achievement and start cues, peak normalised to -12 dBFS, and
   `encodeWav(samples, sampleRate)` (16-bit PCM). Tests: sample count per cue, peak level, WAV header fields.
   `scripts/tones.ts` writes `docs/promo/audio/tones/{move-x,move-o,step-587,win,achievement,start}.wav`
   (exact notes from storyboard section 5).
3. **Voice (`npm --prefix promo run voice`, once).** `scripts/voice.ts` loads `promo/.env` into `process.env`
   (via Node's `--env-file`, never opened by a file tool, never printed), stops with the missing variable's
   _name_ if one is absent, and calls ElevenLabs `POST /v1/text-to-speech/{voice}/with-timestamps`
   (`eleven_multilingual_v2`) three times: the full narrator script as one take, and the two bot lines. That
   endpoint returns the mp3 plus character timings in the same single call, which gives each sentence's
   start and end without a second tool. Response checked: `application/json`, base64 decodes to an mp3 that
   ffprobe reads as audio; nothing from it is executed. Writes `narration.mp3`, `bot-01.mp3`, `bot-02.mp3`
   and `docs/promo/audio/durations.json` (file durations from ffprobe; sentence spans and the word "Zero"
   from the alignment; speech start/end inside each bot file for head/tail trim). No secret or voice id is
   written to any file.
4. **`src/timeline.ts` (TDD).** Pure: measured spans in → every shot's start frame, every narrator / bot clip
   placement (with trim in/out), bubble pop/exit frames, and the speech spans used for ducking. Rules from
   storyboard section 4: shots 1–3 fixed at 0 / 114 / 204; sentences 1–2 as one clip from 0.5 s, sentence 3
   from frame 117; bot-01 on `max(165, end of s3 + 6)`, bubble pops on it and exits as it ends, must end by
   204; bot-02 on frame 240, must end before the toast chime (278); narration 4a–8 as one continuous clip
   whose 4a starts at frame 328 (shot 4 at 324 = start − 4); shots 4b–8 start on their sentence's start − 4;
   shot 7 ends ≤ 840; shot 8 ≥ 60 frames; total exactly 900. Any broken rule throws with the rule's name,
   so a bad take fails the test / render instead of shipping. Tests: the storyboard's frame table with the
   target timings plugged in, then the measured `durations.json`, plus each rule's failure case.
5. **`src/mix.ts` (TDD).** Pure gains per frame: narrator 0 dB, bot −2 dB, music −20 dB ducked a further
   −4 dB inside speech spans (short ramps), 0.5 s fade in, fade out 28.5–30.0 s; tones at music level +2 dB.
   Narrator reference gain is set once from the measured mix so the master lands near −16 LUFS.
6. **Music.** One calm, vocal-free, 90–100 BPM track from Pixabay Music, downloaded once into
   `docs/promo/audio/`, checked with ffprobe; `CREDITS.md` with title, author, Pixabay URL, licence line.
7. **`src/tokens.ts`, `src/layout.ts` and the shots.** Colours, fonts, easings and the type table from the
   storyboard; `layout.ts` holds the anchors per format. One component per shot (`Shot1Board` …
   `Shot8Mark`), shared `Board`, `Mark` (stroke-drawn X / O), `Bubble`, `Toast`, `Glows`, `Logo` geometry
   copied from `src/lib/logo.ts` (read, not imported, so the game stays untouched). One composition `Promo`
   with a `layout` prop; `calculateMetadata` sets 1080×1920 or 1080×1080. Fonts loaded with `delayRender`
   until `document.fonts.load` resolves for both faces.
8. **Render and verify.** `promo/out/reel.mp4`, `promo/out/square.mp4`; ffprobe (Remotion's bundled
   `npx remotion ffprobe`, as there is no system ffmpeg here) for size, fps, frames, duration, AAC, format
   tags; loudness with the bundled ffmpeg `ebur128`. Stills via `npx remotion still` at the frames of each
   section-8 check, both formats where layout matters, into `handoff/002-promo-video/stills/`.
9. **Safe area (check 10).** Programmatic on the layout: a `layout.test.ts` asserting every essential box
   in the reel (including its motion offsets) stays inside y 250–1520 and text ≥ 28 px; plus a documented
   manual look at five reel stills. A pixel scan is not reasonable because the glows live in those bands
   by design.
10. **Reviews, game suite, PR.** `skeptic` and `code-reviewer` subagents over the diff; game `npm test` and
    `npm run build`; PR to `develop`; RESULT.md filled in; "ready" to Mira.

## Summary

## Done-when checklist

## How to run

## Rulings

- Ruling: `handoff/README.md` does not exist on `develop` yet (handoff 001 adds it on `feat/kaya-rebrand`); I
  created it from 001's copy plus the 002 row — keeps the index in one place — cost if wrong: a one-line
  add/add conflict when 001 or 002 merges second.
- Ruling: `HANDOFF.md` was copied byte-for-byte, outside the Prettier hook, so it stays verbatim — Prettier
  would re-pad its tables — none.
- Ruling: promo tests are named `*.test.ts` beside their files, so the game's root `npm test` (and CI) also
  runs them; the pure modules therefore import neither `remotion` nor Node APIs — CI coverage for free
  without touching the game's config — cost if wrong: the game's test count grows by the promo tests.

## Deferred minors

## Merge danger

## Conflicts with CLAUDE.md

## Tests

## Open questions for Mira / Arnel

1. **`docs/promo/storyboard.md` is untracked** in the main checkout and is not on any branch. The handoff's
   allowed paths don't include it. Plan as written: I read it but don't commit it, and `promo/README.md` points
   to it. Say if it should ride in this PR.
2. **Chrome for rendering.** Remotion renders through Chrome Headless Shell and downloads it on first render
   (Google storage), which is not on the handoff's network list. Plan as written: point Remotion at the
   installed Google Chrome (`browserExecutable`) so nothing is downloaded. If that fails twice, I stop and need
   your OK for the one-time headless-shell download.
3. **Pixabay download.** If Pixabay blocks a scripted download, I'll fetch the one track through the browser.

## Trial report

- Tool: Remotion 4.0.531
- Times used:
- What it caught / what it made easy:
- What got in the way:
- Your call (keep / drop / adjust):

## Suggestions for Mira

## Suggested next steps
