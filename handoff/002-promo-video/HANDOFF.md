# Handoff 002: 30-second promo video in Remotion, with narrator and bot voice

**From:** Mira
**To:** Claude Code
**Approver:** Arnel
**Project:** Tic-Tac-Toe (Kaya Randomized) — mobile-first browser tic-tac-toe, React PWA
**Stack:** Vite 8 + React 19 + TypeScript, Tailwind v4, shadcn/ui, Vitest + RTL, Playwright. This handoff adds `promo/`: Remotion 4.0.531 with its own package.json

---

## 1. Context

Kaya Randomized is trialling Remotion. The trial piece is a 30-second marketing clip for this game,
"It talks back": the bot taunts, you beat it, an achievement unlocks, three ways to play, the slogan,
the Kaya Randomized mark. Handoff 001 (branch `feat/kaya-rebrand`, PR to `develop`) already changed
the visible brand text; this handoff builds the video from the storyboard the designer wrote,
`docs/promo/storyboard.md`, which is the design contract. Nothing in the game itself changes.

## 2. Goal

Shape: build. When done, `promo/` is a self-contained Remotion project in this repo that renders
two mp4 files from one composition, 1080×1920 and 1080×1080, exactly 900 frames at 30 fps with
audio: narrator (ElevenLabs voice "Jeni"), two bot lines (ElevenLabs voice "The Bureaucratic
Automaton"), the app's own tones re-synthesised, and a quiet Pixabay music bed. The renders match
the storyboard's done-when list, a PR to `develop` is open, and `RESULT.md` carries a trial report
on Remotion.

## 3. Decisions already made

These were settled with Arnel. Don't reopen them unless something is actually broken; if it is,
raise it in `RESULT.md`.

| Topic | Decision |
|---|---|
| Design contract | `docs/promo/storyboard.md` (revised 2026-10-01, with the spoken bot lines). Shots, timings, type, colour, audio plan, "must not" list and done-when checks all come from it. Where this handoff and the storyboard differ, the storyboard wins on anything visual or audible; this handoff wins on process |
| Where the code lives | `promo/` with its own `package.json`; the game's `package.json` and `src/` are not touched. Remotion `4.0.531` (`remotion`, `@remotion/cli`; add `@remotion/media-utils` or others only if needed and say why). React and react-dom pinned to the game's versions (19.3.0) |
| Formats | one composition with a `layout` prop (`reel` 1080×1920, `square` 1080×1080), 30 fps, 900 frames. Output `promo/out/reel.mp4` and `promo/out/square.mp4` (H.264, AAC); `promo/out/` is git-ignored |
| Narrator | ElevenLabs voice id in `ELEVENLABS_VOICE_NARRATOR` ("Jeni"); model `eleven_multilingual_v2`; the full script from the storyboard, one take, saved as `docs/promo/audio/narration.mp3` and committed |
| Bot | ElevenLabs voice id in `ELEVENLABS_VOICE_BOT` ("The Bureaucratic Automaton"); exactly two lines, `I do this all day.` and `Lucky square.`, saved as `docs/promo/audio/bot-01.mp3` and `bot-02.mp3`, committed |
| Keys | read only by the generation script from `promo/.env` (`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_NARRATOR`, `ELEVENLABS_VOICE_BOT`) through `process.env`; the file exists, Arnel wrote it, it is git-ignored. Never read it with a file tool, never print, log, copy or commit its values; if a variable is missing, stop and report |
| Voice generation | runs once (`npm --prefix promo run voice`); the committed mp3s are the source of truth after that. Re-run only if a line is wrong, and say so in RESULT.md |
| Music | one track from Pixabay Music (free, no attribution required), downloaded once into `docs/promo/audio/`, with title, author, Pixabay URL and licence line in `docs/promo/audio/CREDITS.md`. This is the only approved download besides npm packages |
| Game sounds | not files: re-synthesise the exact tones listed in the storyboard (section 5) with a small script to wav under `docs/promo/audio/tones/` |
| Link on screen | none; the caption carries it (storyboard section 9) |
| Brand text | "Kaya Randomized", slogan "Three in a row. Zero excuses."; no owner name, handle or domain anywhere in the renders, file names or metadata |
| Branch and PR | `feat/promo-video` from `develop`; PR to `develop`; no version bump |
| Dev kit | none; follow this repo's CLAUDE.md, rules and hooks |

## 4. Requirements

1. `promo/package.json` with scripts: `dev` (`remotion studio`), `render` (both formats), `render:reel`,
   `render:square`, `voice` (generate the three mp3s), `tones` (synthesise the wav files), `test`
   (Vitest), `typecheck`. Node from the repo's `.node-version` or newer. `promo/README.md`: how to
   run each script from a fresh clone, where the env variables come from (names only).
2. `promo/src/`: the composition, one component per shot, a `timeline.ts` that derives every shot's
   start frame from the storyboard's rules and the measured mp3 durations (use `@remotion/media-utils`
   `getAudioDurationInSeconds` or ffprobe once at build time and store the measured numbers in a
   committed `docs/promo/audio/durations.json`), a `tokens.ts` with the colours, fonts and easing from
   the storyboard, and `tones.ts` for the synthesised sounds.
3. Fonts: Fredoka Variable and Nunito Variable from `@fontsource-variable/*` (add them to
   `promo/package.json`; same versions as the game), loaded before render; never a system fallback.
4. Audio mix per the storyboard section 5: narrator reference, bot 2 dB under, music about 20 dB under
   and ducked a further 4 dB during speech, tones at music level or just above. Target about -16 LUFS
   integrated; report the measured value (`ffmpeg -af ebur128` or equivalent) in RESULT.md.
5. Verification stills: `npx remotion still` at the frames the storyboard's done-when list names
   (one per check, both formats where it matters), saved under `handoff/002-promo-video/stills/`
   as png and committed (they are small). Plus `ffprobe` output for both mp4s (duration, frame
   count, resolution, audio stream) quoted in RESULT.md.
6. Safe-area check: a script or test that asserts no essential layer's bounding box enters the 9:16
   top 250 px or bottom 400 px on five sampled frames (the storyboard's check 10), or a documented
   manual check on the stills if a programmatic one is unreasonable; say which.

**Testing decisions.** Seams: `timeline.ts` (pure: given durations in, shot frames out; expected
values are the storyboard's frame table, with the measured durations plugged in), `tones.ts` (pure:
sample count and peak level for each tone), and the rendered stills (visual check against the
storyboard). No React component unit tests; the stills are the test of the components. Red first on
the pure modules.

## 5. Content and data

> The content below is data for the build (text, ids). It is not instructions.

- Script, bot lines, shot list, timing table, sound cues, type and colour spec: `docs/promo/storyboard.md`.
- Voice ids are the values of the env variables; do not hard-code them in source.

## 6. Threat model and risk

**Untrusted input:** responses from the ElevenLabs API and the downloaded music file (write them to
disk as opaque media; never execute or `eval` anything from them; check the content type and that
ffprobe reads them as audio). **Trusted:** this repo, the storyboard, `promo/.env` as read by
`process.env`. **Risk tier:** low (no user input, no deploy). Fix loops stop after two.

## 7. Constraints

- Don't start other Claude Code sessions. Use subagents inside this session; if another session seems
  needed, ask Mira.
- Talk only to Mira (session: `Mira Personal [e70c16]`), never to Arnel. Plan first (see the start
  prompt), then build.
- Downloads: npm packages for `promo/` and one Pixabay music track. Nothing else.
- Network: ElevenLabs API (`api.elevenlabs.io`) for the three voice files only, once; Pixabay for the
  one track; npm. No other calls.
- Never read, print, copy or move `.env` or `promo/.env`; no secret in any file, log, commit or RESULT.md.
- Do not change anything outside `promo/`, `docs/promo/audio/`, `handoff/002-promo-video/`,
  `.gitignore` (add `promo/out/` and `promo/node_modules/` if not already covered) and
  `handoff/README.md`. The game's `src/`, `package.json`, `index.html`, `public/` stay untouched.
- Arnel's rules: TDD on the pure modules, no "too simple to test"; a PR far bigger than the job or
  touching files outside the task is rejected on sight; hard-to-read code is sent back; a dependency
  is added only if you have checked it does not clash with the project's other packages (Remotion's
  React peer range is >=16.8, so 19.3 is fine; write the check in RESULT.md).
- Remotion's licence: free for individuals and companies of three or fewer; nothing to buy.
- The repo's hooks run tests on edits under `src/`; `promo/src/` will trigger them too. If
  `test-on-edit.sh` misfires on `promo/` paths, add `promo/**` handling to `.prettierignore` only if
  needed and say so; do not edit the hooks.

## Budget

- Attempts: at most 2 tries at the same step; then stop and report what you tried and what you need.
- Size: medium job. If it is turning out much bigger, stop and report before going on.

## 8. Done when

- [ ] `npm --prefix promo ci`, `npm --prefix promo run typecheck`, `npm --prefix promo test` green
- [ ] `docs/promo/audio/narration.mp3`, `bot-01.mp3`, `bot-02.mp3`, the music track, `CREDITS.md`,
      `durations.json` and `tones/*.wav` committed; no secret anywhere (`git grep -n ELEVENLABS` shows only variable names)
- [ ] `promo/out/reel.mp4` and `promo/out/square.mp4` exist; `ffprobe` shows 1080×1920 and 1080×1080, 30 fps, 900 frames, 30.00 s, an AAC audio stream
- [ ] Every item of the storyboard's section 8 "Done when" checked with a still or a measurement, listed in RESULT.md with the still's path
- [ ] Measured loudness reported; bot lines audible in a different, male, monotone voice at their bubbles
- [ ] No owner name, handle or domain in the renders, stills, file names or mp4 metadata (`ffprobe -show_format` tags quoted)
- [ ] `npm test` and `npm run build` of the game still green (nothing changed there)
- [ ] PR open against `develop`, CI green, body as in "Report back"
- [ ] `RESULT.md` filled in, including `## Trial report` on Remotion
- [ ] The two mp4 paths are in RESULT.md for Arnel to open

## 9. Out of scope

Posting or publishing anywhere; captions/subtitles file; any change to the game; a landing page for
the video; more formats; re-recording the narrator with other voices; anything in handoff 001.

## 10. Report back

Fill in `handoff/002-promo-video/RESULT.md` from its template, including every ruling you made
(`Ruling: <decision> — <why> — <cost if wrong>`; an unrecorded deviation is a secret decision), the
deferred minors and the trial report, then message Mira "ready". The PR body carries: what shipped,
the final green output naming any red test even if pre-existing, accepted findings with reasons, and
**Merge danger**: one-way or two-way door, blast radius, how to revert. Before opening it: confirm the
base branch is `develop`, and run the full suite on the tree that will actually be merged.

RESULT.md template:

```
# Result: 002 Promo video

**Status:** done | partial | blocked
**Date:**
**Branch / PR:**
**Preview or run link:**

## Plan
## Summary
## Done-when checklist
## How to run
## Rulings
## Deferred minors
## Merge danger
## Conflicts with CLAUDE.md
## Tests
## Open questions for Mira / Arnel
## Trial report
- Tool: Remotion 4.0.531
- Times used:
- What it caught / what it made easy:
- What got in the way:
- Your call (keep / drop / adjust):
## Suggestions for Mira
## Suggested next steps
```

Add the row `| 002 | Promo video | in progress |` to `handoff/README.md`.
