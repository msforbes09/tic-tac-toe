# Result: 004 Promo re-cut

**Status:** in progress
**Date:** 2026-10-01
**Branch / PR:** `feat/promo-recut` (PR not open yet)
**Preview or run link:**

## Plan

Contract: `docs/promo/storyboard-v2.md` (committed, `cmp` clean). Every step is Red → Green: the test
changes first with storyboard-v2's literal frames typed in, it fails for the right reason, then the code.

1. **Timeline (`promo/src/timeline.ts`, `timeline.test.ts`).** `TOTAL_FRAMES` 1320; `Shot` gains `"0"`.
   Shots are now the fixed table of section 3 (0, 108, 225, 336, 621, 711, 783, 888, 984, 1098, 1194)
   instead of being derived "sentence − 4": v2 places 4b's sentence 6 frames in and shot 8's 38 frames in,
   so the old derivation cannot reproduce it. Sentences go on the section 4 frames (36, 117, 232, 625,
   717, 787, 892, 988, 1102, 1232), still pushed past the previous sentence if a take ran long. Guard
   rules kept and re-numbered: each narrated shot's sentence starts ≥ 4 frames into it and ends before
   the next shot; "Now it talks back." ends ≥ 6 frames before bot-01 (273); bot-01's bubble (line + 6)
   clears shot 2; bot-02 (480) starts ≥ 15 frames after the win jingle ends (448 + 13); the toast chime
   (547) comes after bot-02 ends and the toast holds ≥ 2.0 s before its exit at 621; shot 8 holds the
   full lock-up ≥ 60 frames; narration ends by 1320. Moves 162 / 212 / 348 / 400 / 432, win 448; a new
   test pins "no move starts < 30 frames after the previous one". New beats: the thinking badge before
   each O (178, 366; exit on the O), bubble exits 328 / 534, splash beats (title 30, slogan 34, exit 97),
   the logo's app timing (O 14 frames, X at +16, arms 8 → done at +32) for shots 0 and 8, wordmark 1230,
   URL 1242. Later-shot beats move to the v2 frames (code tiles 633-645, phone 669/681, 4b marks
   735/751, bot steps 813/837/861, chips 900 → platinum 940, slogan Xs from 1098, row win 1126).
   Test fixtures: the "targets" fixture becomes the measured `durations.json` lengths (v2 already uses
   them), the rule tests are re-pointed at the new numbers.
2. **Sound cues (`soundCues`).** The test pins section 6's cue list literally. The app's `splash` cue
   is built from the existing wavs: `move-o` at 0, `move-x` at 16, `start` at 30 (its second note lands
   at 32.4); the same at 1194 / 1210 / 1224 in shot 8. The old film-start `start` at 9 and the shot 8
   `start` on logo-done go. No new tone file (storyboard 5: "no new tones").
3. **Mix (`mix.ts`, `mix.test.ts`).** Music fade-out 1275-1320 (test first); levels untouched.
4. **Layout (`layout.ts`, `layout.test.ts`).** New zones, both canvases: splash stack (reel centre y 808,
   logo 690, gaps 86 / 25; square centre 497, logo 517, gaps 65 / 18), splash footer (centre 1470 / 975),
   thinking badge (120 / 88, centred in the bubble zone), shot 8 stack re-sized for the 480 / 320 logo
   and re-centred on 860 / 540. The safe-area test grows to cover them through their motion, including
   the splash-out's 1.03 scale about the canvas centre. New type rows (splash slogan 48/36, footer 32/28)
   join the ≥ 28 px test.
5. **Brand (`brand.ts`, `brand.test.ts`).** Splash strings `Tic-Tac-Toe`, `Three in a row. Zero
   excuses.`, `© 2026 Kaya Randomized` in one place, pinned by a test (including "no version").
6. **Components / shots (no unit tests, per the handoff; checked by stills).** New `Shot0Splash`
   (reuses `Logo`, `heading` / `text`, `Column`; own splash-out 97-108, opacity → 0, scale 1.03, exit
   easing). `Logo` takes the app's draw timing. A `breathe` helper moves into `motion.ts`, shared by
   the bubble badge and the new thinking badge (`OBadge` reused; rendered by `GameBoard`). Shot 1 drops
   its title; sub-line in at 117, out at 168. Board tiles pop from 111. Shots 3-8 read the new beats;
   shot 8's settle runs over the last 3 s.
7. **Scripts.** `master.ts` already trims to `TOTAL_FRAMES / FPS` (44.00 s once 1. lands). `stills.ts`
   writes one still per section-8 check (both formats) into `handoff/004-promo-recut/stills/`;
   handoff 002's stills are not touched.
8. **README**, render both formats, ffprobe + loudness into this file, game `npm test` / `npm run build`
   against `origin/feat/promo-video`, skeptic + code-reviewer subagents on the diff, PR to `develop`
   superseding #57.

### Questions (defaults I proceed with if no answer)

1. **Splash cue lengths (storyboard-v2 §10 item 6).** In the app (`browserFeedback.ts` on develop) the
   splash cue's O and X notes last **0.14 s**; the existing `move-o.wav` / `move-x.wav` last **0.07 s**.
   Pitches (520, 660, 523, 784 Hz) and offsets (0, 0.52, 1.00, 1.08 s → frames 0, 16, 30, 32) line up.
   Default: use the existing wavs as the storyboard says ("no new files"), so the two splash notes are
   half as long as the app's. Alternative: add a `splash` entry to `CUES` with the app's exact notes and
   write `tones/splash.wav` via `npm run tones` (one new generated file).
2. **Shot 6 pills 2 and 3.** v2 gives even-pacing targets 1019 / 1048 and asks for the measured word
   times. Handoff 002 measured them at sentence start + 32 and + 62 frames; with the sentence at 988
   that is **1020 / 1050**. Default: 1020 / 1050 (pill 1 at 988), ticks on the same frames.
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
- Tool: Remotion 4.0.531 (second job)
- Times used:
- What it caught / what it made easy:
- What got in the way:
- Your call (keep / drop / adjust):
## Suggestions for Mira
## Suggested next steps
