# Result: 002 Promo video

**Status:** partial (built, reviewed, two fix rounds done and tested; the final re-render after round 2 and the shot-8 URL line were blocked by the session's permission checks, see open questions 4 and 5)
**Date:** 2026-10-01
**Branch / PR:** `feat/promo-video` (from `develop` @ 2f1bbe1) / PR not yet open
**Preview or run link:** the two renders, for Arnel to open:
`/Volumes/Developer/Projects/Mira/projects/tic-tac-toe/.claude/worktrees/promo-video/promo/out/reel.mp4` and
`/Volumes/Developer/Projects/Mira/projects/tic-tac-toe/.claude/worktrees/promo-video/promo/out/square.mp4`

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

(Plan kept as approved. Where the build departed from it, the Rulings below say so.)

## Summary

`promo/` is a self-contained Remotion 4.0.531 project that renders "It talks back" from one composition,
`Promo`, in two layouts. Everything the film plays is committed under `docs/promo/audio/`: Jeni's narration and
the Bureaucratic Automaton's two lines (ElevenLabs, with character timings), the game's tones re-synthesised to
wav, and one Pixabay track ("Dim Light" by Loksii). `src/timeline.ts` derives every shot start, voice placement,
bubble/toast frame and tone cue from the storyboard's rules and the measured takes; the shots and the
soundtrack both read it, so picture and sound cannot drift apart. `render` renders the mix in Remotion and then
masters it (two-pass loudnorm with Remotion's bundled ffmpeg, -14 LUFS / -1.5 dBTP target, cut to exactly
30.00 s, container metadata dropped).

Measured renders: both files 900 frames, 30 fps, 30.000 s video, audio and container; H.264 High + AAC LC
48 kHz stereo; **-14.50 LUFS integrated, -1.28 dBTP true peak**.

The take came in faster than the storyboard's targets (narrator 17.6 s of speech against 20.5 s), so every
sentence lands on its target frame and every shot starts exactly on the storyboard's frame table
(0, 114, 204, 324, 411, 462, 549, 618, 720, 804). The two bot lines are longer than their targets (1.63 s and
1.53 s against 1.2 s and 0.9 s); the timeline absorbs that without breaking a rule (see Rulings).

## Done-when checklist

Handoff section 8:

- [x] `npm --prefix promo ci`, `run typecheck`, `test`: green (7 files, 55 tests).
- [x] `narration.mp3`, `bot-01.mp3`, `bot-02.mp3`, `music-dim-light.mp3`, `CREDITS.md`, `durations.json`,
      `tones/*.wav` committed. `git grep -n ELEVENLABS` shows only variable names (HANDOFF.md, `promo/README.md`,
      `promo/scripts/voice.ts`); no key, no voice id in any file.
- [x] `promo/out/reel.mp4` and `promo/out/square.mp4` exist; ffprobe below.
- [x] Every storyboard section-8 check, with its still or measurement (table below).
- [x] Loudness measured (-14.50 LUFS integrated, -1.28 dBTP). Bot lines measured audible at their bubbles
      (-15.1 and -14.0 LUFS in their windows, level with the narrator). That the voice reads as male and
      monotone is the voice Arnel chose; **I cannot judge timbre by ear: please listen** (open question 1).
- [x] No owner name, handle or domain in renders, stills, file names or mp4 metadata (tags quoted below).
- [x] Game `npm test` (52 files, 606 tests, run without the promo tests) and `npm run build` green.
- [ ] PR open against `develop`, CI green.
- [x] RESULT.md filled in, trial report included.
- [x] The two mp4 paths are at the top of this file.

ffprobe (`npx remotion ffprobe -count_frames …`), reel then square:

```
stream|index=0|codec_name=h264|profile=100|codec_type=video|width=1080|height=1920|r_frame_rate=30/1|duration=30.000000|nb_read_frames=900|tag:language=und|tag:handler_name=VideoHandler|tag:vendor_id=[0][0][0][0]|
stream|index=1|codec_name=aac|profile=1|codec_type=audio|sample_rate=48000|channels=2|r_frame_rate=0/0|duration=30.000000|nb_read_frames=1403|tag:language=und|tag:handler_name=SoundHandler|tag:vendor_id=[0][0][0][0]
format|duration=30.000000|size=3668598|tag:major_brand=isom|tag:minor_version=512|tag:compatible_brands=isomiso2avc1mp41|tag:encoder=Lavf61.7.100
stream|index=0|codec_name=h264|profile=100|codec_type=video|width=1080|height=1080|r_frame_rate=30/1|duration=30.000000|nb_read_frames=900|tag:language=und|tag:handler_name=VideoHandler|tag:vendor_id=[0][0][0][0]|
stream|index=1|codec_name=aac|profile=1|codec_type=audio|sample_rate=48000|channels=2|r_frame_rate=0/0|duration=30.000000|nb_read_frames=1403|tag:language=und|tag:handler_name=SoundHandler|tag:vendor_id=[0][0][0][0]
format|duration=30.000000|size=2720333|tag:major_brand=isom|tag:minor_version=512|tag:compatible_brands=isomiso2avc1mp41|tag:encoder=Lavf61.7.100
```

The master drops Remotion's "Made with Remotion" comment along with all other container metadata; what is
left is the muxer's own `encoder=Lavf61.7.100` and the standard handler names.

Storyboard section 8 (stills in `handoff/002-promo-video/stills/`, half size, `reel-*` and `square-*` of each):

| # | Check | Evidence |
| --- | --- | --- |
| 1 | Both renders, sizes, 30 fps, 900 frames, 30.00 s, audio | ffprobe above |
| 2 | Plain empty board, then X in the centre; first frame not black, not a title card | `*-02-first-frame-f0.png` (tray and glows; tiles pop from frame 6 as specified), `*-02-empty-board-title-f50.png`, `*-02-first-x-f84.png` |
| 3 | Bubble reads `I do this all day.`, bot's O on the board | `*-03-bubble-i-do-this-all-day-f167.png` (bubble pops at 5.17 s, see Rulings) |
| 4 | X takes 2-4-6, strike line, one X/O confetti burst | `*-04-diagonal-strike-confetti-f238.png` |
| 5 | Toast `ACHIEVEMENT UNLOCKED` / `Beat the Machine` / `Beat the bot for the first time`, chime with it | `*-05-toast-f302.png`; chime cue on the toast's frame (288), `soundCues` test |
| 6 | Online with `XOXO`, One phone, The bot with `Easy` `Medium` `Hard`, in order | `*-06-online-xoxo-f394.png`, `*-06-one-phone-f455.png`, `*-06-the-bot-f544.png` |
| 7 | `41`, `achievements to unlock`, chip wall in four tier colours | `*-07-forty-one-f609.png` |
| 8 | Pills `Installs as an app`, `Works offline`, `Free` in order | `*-08-pills-f714.png` |
| 9 | Slogan two lines; ends on the logo with `Kaya Randomized`, held ≥ 2.0 s; last words "From Kaya Randomized." | `*-09-slogan-f790.png`, `*-09-logo-last-frame-f899.png`; shot 8 runs 804–900 (3.2 s); sentence 8 plays 808–854 |
| 10 | Safe area and ≥ 28 px text in the 9:16 | `layout.test.ts` (programmatic, below) plus the manual look at five reel stills (f167, f302, f394, f609, f899): nothing essential above y 250 or below y 1520 |
| 11 | Bot lines audible at their bubbles, different voice, no overlap with narrator or game sound, ≥ 6 frames air | timeline tests ("ends bot-01 … at least 6 frames after", "starts no game sound while the bot speaks"); window loudness below; voice timbre: open question 1 |

Window loudness in the final reel (`loudnorm` measurement over each window):

```
narrator "Now it talks back." 3.90-4.90 s   -14.34 LUFS
bot-01 "I do this all day."   5.17-6.80 s   -15.12 LUFS
bot-02 "Lucky square."        8.00-9.53 s   -13.99 LUFS
narrator 4a                  11.00-12.90 s  -11.51 LUFS
music + move tones           6.80-7.40 s    -21.90 LUFS
music tail (fading)          29.0-29.5 s    -27.04 LUFS
```

## How to run

See `promo/README.md`. In short, from the repo root:

```sh
npm --prefix promo ci
npm --prefix promo test && npm --prefix promo run typecheck
REMOTION_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm --prefix promo run render
REMOTION_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm --prefix promo run stills
```

Variables the voice script needs (names only): `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_NARRATOR`,
`ELEVENLABS_VOICE_BOT`, in `promo/.env`.

## Rulings

- Ruling: `handoff/README.md` does not exist on `develop` yet (handoff 001 adds it on `feat/kaya-rebrand`); I
  created it from 001's copy plus the 002 row — keeps the index in one place — cost if wrong: a one-line
  add/add conflict when 001 or 002 merges second.
- Ruling: `HANDOFF.md` was copied byte-for-byte, outside the Prettier hook, so it stays verbatim — Prettier
  would re-pad its tables — none.
- Ruling: promo tests are named `*.test.ts` beside their files, so the game's root `npm test` (and CI) also
  runs them; the pure modules therefore import neither `remotion` nor Node APIs — CI coverage for free
  without touching the game's config — cost if wrong: the game's test count grows by the promo tests (root run:
  59 files / 661 tests; the game alone: 52 / 606).
- Ruling (accepted from Mira, owner's ruling): mix numbers supersede storyboard section 5 — music bed about
  9 dB under the narrator (not 20), ducked a further 4 dB in speech; master near -14 LUFS (not -16), true peak
  ≤ -1 dBTP; bot 2 dB under; tones unchanged relative to the music (I set them 1 dB over the bed) — the owner's
  benchmark reel runs voice +8 dB over music at -12.9 LUFS — cost if wrong: one constant each in `mix.ts` /
  `loudness.ts` and a re-render.
- Ruling: the voice script ran twice. The first take was spoken in the wrong order (`Object.keys` lists
  integer-like keys "1".."8" before "4a".."4c", so sentences 5–8 came before 4a). Fixed with a test that pins
  the spoken order (`script.test.ts`), then re-ran once; all three files were regenerated by that run — a wrong
  line is the handoff's reason to re-run — cost if wrong: none; two of the three API calls repeated.
- Ruling: `promo/.env` lives only in the main checkout, so I ran the voice script once with Node's
  `--env-file=<absolute path to the main checkout's promo/.env>` (Mira's instruction). The npm script keeps
  `--env-file=.env` for a normal clone — cost if wrong: none.
- Ruling: sentences are placed one by one on their storyboard target frames (shot start + 4), never earlier
  than the previous sentence ends, rather than as one continuous clip from 4a — this reproduces the
  storyboard's frame table exactly with a take that is faster than the targets; a long take pushes later
  shots and shot 8 absorbs it — cost if wrong: small pauses between sentences that a continuous take would not
  have (4a→4b 0.9 s, 4b→4c 0.6 s).
- Ruling: the storyboard's targets chain sentences with no gap (4a ends 13.8 s = 4b starts), so the "previous
  sentence must have ended" rule uses no minimum gap — a 6-frame minimum would have broken the storyboard's
  own table — cost if wrong: none.
- Ruling: bot-01 starts at `min(165, 204 − its length)`, at least 6 frames after "Now it talks back." ends.
  The real line is 1.63 s (49 frames), so it starts at frame 155 (5.17 s, not 5.5 s) and ends exactly at 204;
  the narrator ends at 149, so the air is exactly 6 frames — the storyboard's 165 is a target and shot 2 may
  not grow — cost if wrong: the bubble pops 0.33 s earlier than the storyboard's target.
- Ruling: bot-02 (1.53 s, 46 frames) runs 240–286, past the storyboard's 278 toast. The toast drops at
  `max(278, end of bot-02 + 2)` = 288 and still exits at 316–324, so its hold is 20 frames instead of 30; the
  "Lucky square." bubble exits at `min(end + 3, toast − 8)` = 280 so the two never share the zone — rule 3
  ("shorten the hold, never speed the voice") — cost if wrong: the toast reads for 1.2 s in all instead of 1.5 s.
- Ruling: Remotion's bundled ffmpeg has no `ebur128`, `astats`, `alimiter` or `volumedetect`; it has
  `loudnorm`. Loudness is measured with `loudnorm`'s analysis pass (EBU R128 integrated loudness and true
  peak, the "or equivalent" of the handoff), and the master is a two-pass `loudnorm`. The mix needs about
  +9.7 dB, so loudnorm runs in dynamic mode (its own true-peak limiter) rather than linear — no limiter
  exists in this ffmpeg — cost if wrong: dynamic mode lifts quiet stretches slightly (music during the
  narrator's gap sits nearer the voice than 9 dB at moments).
- Ruling: the master step drops all container metadata (`-map_metadata -1`) and cuts to exactly 30.00 s (the
  AAC encoder pads ~0.1 s) — done-when asks for 30.00 s and clean metadata — cost if wrong: none.
- Ruling: added `@remotion/bundler` and `@remotion/renderer` 4.0.531 (dev) for `scripts/stills.ts`: it bundles
  once and renders 28 stills, where 28 `remotion still` CLI calls would bundle 28 times. Both are already
  in the tree as dependencies of `@remotion/cli` at the same version. `@remotion/media-utils` was not
  needed (durations come from ffprobe and the API's own timings) — cost if wrong: two lines in package.json.
- Ruling: dependency clash check. `promo/` has its own `package.json` and lockfile; nothing is added to the
  game's. `remotion` and every `@remotion/*` 4.0.531 declare `react` / `react-dom` peer `>=16.8.0`; `npm ls
  react react-dom` in `promo/` resolves one copy of each at 19.3.0, deduped across all Remotion packages.
  Fonts, Vitest, TypeScript and `@types/*` are pinned to the exact versions the game's lockfile resolves
  (fontsource 5.3.0, vitest 4.1.11, typescript 5.9.3, @types/react 19.3.0, @types/node 26.6.2) — cost if
  wrong: none found.
- Ruling: rendering uses the installed Google Chrome through `REMOTION_CHROME` (Remotion's
  `chrome-for-testing` mode), so no headless-shell download happened; unset, Remotion would fetch its own
  once — open question 2 in the plan, resolved without a download — cost if wrong: none.
- Ruling: music track "Dim Light" by Loksii. Of the calm, light, instrumental candidates I checked, it was the
  only one whose page did not say "Content ID Registered"; a registered track would draw automated claims on a
  Facebook upload. Its tempo is not listed on Pixabay and I cannot measure BPM by ear — cost if wrong: swap the
  file and its loudness constant in `mix.ts`.
- Ruling: stills are PNG at half size (540×960 and 540×540), 2.5 MB for all 28 — "they are small" — cost if
  wrong: re-run `npm --prefix promo run stills` without `scale`.
- Ruling: the safe-area check is programmatic on the layout (`layout.test.ts`: every essential zone,
  stretched over its motion, inside y 250–1520 and the 72 px side margins; no text under 28 px) plus a
  manual look at five reel stills. A pixel scan of the bands is not meaningful because the glows live there
  by design — cost if wrong: a component drawing outside its zone would pass the test; the stills are the
  backstop.
- Ruling: Prettier. The worktree first had no root `node_modules`, so the format hook ran a Prettier without
  the repo's config; I installed the game's deps in the worktree and formatted `promo/` with the repo's
  `.prettierrc` (double quotes, no semicolons). `.prettierignore` is unchanged — cost if wrong: none.
- Ruling: `docs/promo/storyboard.md` is not committed (it is untracked in the main checkout and outside
  the handoff's paths); `promo/README.md` and code comments point to it — cost if wrong: the PR cites a file
  that only exists in the main checkout until someone commits it (open question 3).

Review rounds (skeptic and code-reviewer subagents, two fix loops, the handoff's cap):

- Ruling (skeptic, high): Remotion's CLI loads `<project>/.env` on its own and Studio serves every loaded
  variable into its page, listening on all interfaces, so `npm run dev` with Arnel's `promo/.env` present would
  have exposed the ElevenLabs key on the local network. Fixed without touching Arnel's file:
  `Config.setDotEnvLocation("remotion.env")` points Remotion at a committed, comment-only `promo/remotion.env`;
  verified with `remotion compositions --log=verbose` ("Loaded env file from …/promo/remotion.env"). Only the
  voice script reads `promo/.env` — cost if wrong: none; worth knowing for any future Remotion project.
- Ruling (code-review): the game facts the film copies (logo geometry, tier colours and counts, the unlocked
  achievement's name and description) now live in one pure `promo/src/brand.ts`, pinned to
  `src/lib/logo.ts` and `src/lib/achievements.ts` by `brand.test.ts` (the dry rule's "pinned the same way") —
  cost if wrong: none. This removes the deferred minor about the logo copy.
- Ruling (code-review): beat frames are computed once in `timeline.ts` (`t.beats`) and both the shots and
  `soundCues` read them; mark draw lengths live in `draw.ts`, so the logo's "start" chime is derived from the
  logo's own draw time instead of a comment — cost if wrong: none.
- Ruling (code-review): `voice.ts` now validates the response shape (`readTake`, tested), stages all three
  takes, and only moves them into place with `durations.json` once all three checked out, so a failed re-run
  leaves the committed audio and timings in step — cost if wrong: none (not re-run; the committed takes stand).
- Ruling (both): bot-01's length is its speech length (`clipEnd`), not its end frame; tested with leading
  silence. Every timeline rule now has a failure test — cost if wrong: none.
- Ruling (skeptic): the toast keeps at least 0.6 s of hold (`MIN_TOAST_HOLD` 18 frames) or the timeline throws;
  with the committed takes it holds 20 frames (0.67 s) against the storyboard's 1.0 s, because bot-02 is 0.6 s
  longer than its target — cost if wrong: a slightly short read of "Beat the Machine".
- Ruling (skeptic): the "Lucky square." bubble starts its 8-frame fade at 280 while the line ends at 286, so the
  bubble is still on screen (fading) when the word "square." ends and is fully gone at 288, when the toast drops.
  Kept: the alternative pushes the toast's hold under 0.5 s — cost if wrong: sound-off viewers see the bubble
  fading during its last word.
- Ruling (skeptic): the mix renders 6 dB down (headroom) and the master restores it; `master.ts` now exits
  non-zero unless the final file is within 1 LU of -14 LUFS with true peak at or under -1 dBTP (tested
  `masterProblems`). This ffmpeg has no compressor or limiter, so loudnorm stays in dynamic mode — cost if
  wrong: none for the file; the speech is levelled by loudnorm rather than a compressor.
- Ruling (skeptic): confetti spread and fall halved so the burst stays inside both safe areas (worst case reel
  x 974 / y 1454, square y 1004) — cost if wrong: a smaller burst than the app's.
- Not taken: Html5Audio adopted (deprecated `Audio`); ffmpeg is now invoked one way (`node_modules/.bin/remotion`);
  the remaining nits (repeated clamp options, restating-constant tests in `layout.test.ts`, POSIX quoting in
  the render scripts, CI not running `promo` typecheck) are left as they are — small, and CI is out of scope.
- Ruling (owner, via Mira): shot 8 should gain a muted line `tictactoe.kayarandomized.com` under the wordmark.
  **Not done**: my edit was refused by this session's permission checks, because the handoff (section 3 and
  done-when) says no domain anywhere in the renders and the change reached me from a session message rather
  than from the handoff. Needs Arnel's go-ahead in this session or a revised handoff (open question 5).

## Deferred minors

- First `remotion render` once failed with "Visited localhost:3000 but got no response"; the retry with
  `--port` and every later run through the npm scripts worked. Not reproduced; noted in case it returns.
- The bubble tail is a small plain triangle; the storyboard does not specify its shape.

## Merge danger

Two-way door. Blast radius: new files only (`promo/`, `docs/promo/audio/`, `handoff/`), one line in
`.gitignore`; the game's code, config and dependencies are untouched, and the root test run gains the promo's
pure tests. Revert: `git revert` the merge commit; nothing to migrate.

## Conflicts with CLAUDE.md

- None in substance. The global rule "no Co-Authored-By trailer" overrides the session's attribution reminder,
  so commits carry no trailer. The repo's hooks were not edited.

## Tests

Promo (`npm --prefix promo test`): 8 files, 74 tests, green (55 before the review rounds). Red first on each pure module:
`tones.test.ts` (module missing), `alignment.test.ts` (module missing), `script.test.ts` (`NARRATION.map is
not a function`: the order bug), `timeline.test.ts` (module missing; then the storyboard table failed against
a 6-frame gap rule, which was wrong; then `bubble1Exit`, `soundCues` missing), `mix.test.ts`,
`layout.test.ts`, `loudness.test.ts` (module missing). Review rounds, red first: `brand.test.ts` (module missing),
bot-01 with leading silence (threw), `beats` missing, `spanOf` with a missing `after`, `readTake` missing,
`parseLoudnorm` without `input_lra`, `masterProblems` missing, narrator 6 dB headroom, toast minimum hold. The
rule-failure tests for sentence 2, shot 3, frame 900 and the toast passed on first run: they pin rules the code
already enforced and had no test for. Typecheck clean. Game: `npm test` 52 files / 606 tests
green, `npm run build` green. No red tests, pre-existing or new.

## Open questions for Mira / Arnel

1. Please listen to `reel.mp4` once at phone level: I can measure that both bot lines are present, level with
   the narrator and never overlap her or a game sound, but not that the voice sounds male and monotone, or
   that dynamic loudnorm leaves the music bed sounding even.
2. (Resolved) Chrome: no download needed; the installed Chrome renders.
3. `docs/promo/storyboard.md` is still untracked in the main checkout. Commit it with this PR, or separately?
4. **Renders are one fix round behind.** `promo/out/*.mp4` and the committed stills were made before review
   round 2. Round 2 changed the audio gain staging (mix 6 dB down, then mastered back: the master's output
   target is unchanged) and made the confetti smaller; everything else in round 2 is code or tests. My re-render
   (`npm --prefix promo run render`) was refused by this session's permission checks, so it needs running with
   approval:
   `REMOTION_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm --prefix promo run render`
   then `npm --prefix promo run stills` with the same variable. The master now fails loudly if the file misses
   -14 LUFS ± 1 or goes over -1 dBTP.
5. The shot-8 URL line (owner ruling via Mira): blocked as above. If Arnel confirms it, it is a small change in
   `Shot8Mark.tsx` plus a `url` size in `layout.ts` and a taller logo zone; it also changes the done-when item
   "no domain in the renders".

## Trial report

- Tool: Remotion 4.0.531
- Times used: 1 project; about 6 full renders (2 formats × 3) and ~60 stills while building.
- What it caught / what it made easy: frames as the unit everywhere made the storyboard's frame table
  directly testable; a pure `timeline.ts` feeds both picture and sound, so a tone can't drift from its
  visual. `calculateMetadata` gave two formats from one composition with no duplication. `delayRender` plus
  `document.fonts.load` let a missing font fail the render instead of falling back. The bundled ffmpeg /
  ffprobe meant no system install. The renderer API made 28 stills one bundle.
- What got in the way: the bundled ffmpeg lacks `ebur128`, `astats` and any limiter, so loudness and
  mastering had to go through `loudnorm` in dynamic mode; `trimAfter` is deprecated in this version in favour
  of `durationInFrames`; Remotion's `volume` is a plain gain, so hitting a LUFS target needs a post step; a
  one-off localhost timeout on the first render; the default headless-shell download needed a config switch to
  use the installed Chrome.
- Your call (keep / drop / adjust): **keep**, adjusted: keep the "pure timeline in, components and audio out"
  pattern and a post-render master step; if a future piece needs real mixing (compression, EQ), add a system
  ffmpeg or do the mix outside Remotion.

## Suggestions for Mira

- Put the mix and loudness targets in the storyboard template from the start (Arnel's -14 LUFS / -1 dBTP
  and music 9 dB under), so the first build uses them.
- Ask for voice takes with timestamps (ElevenLabs `with-timestamps`) in future handoffs; it gave sentence
  timings for free.

## Suggested next steps

- Arnel listens and approves, or names lines/levels to change (each is one constant or one re-run).
- Commit `docs/promo/storyboard.md` so the contract travels with the code.
- If captions are wanted later, an `.srt` can be generated from `durations.json` and the timeline.
