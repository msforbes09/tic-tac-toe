# Result: 004 Promo re-cut

**Renders (open these):**

- `/Volumes/Developer/Projects/Mira/projects/tic-tac-toe/.claude/worktrees/promo-recut/promo/out/reel.mp4` (1080×1920)
- `/Volumes/Developer/Projects/Mira/projects/tic-tac-toe/.claude/worktrees/promo-recut/promo/out/square.mp4` (1080×1080)

(`promo/out/` is git-ignored and lives in this worktree; if the worktree is gone, `npm --prefix promo run render`
on the branch rebuilds both.)

**Status:** done
**Date:** 2026-10-01
**Branch / PR:** `feat/promo-recut` → `develop`, PR #59 (supersedes #57)
**Preview or run link:** none (video; the files above)

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

Plan approved by Mira (both question defaults taken). Amendment 1 (the Kaya mark on shot 8) arrived after
the plan and replaced its shot 8 items (logo timing, 1194 / 1210 / 1224 cues, the 480 / 320 logo stack).
Where the build departed from the plan, the Rulings say so.

## Summary

`promo/` now renders the revision 2 film with amendment 1: 1320 frames, 44.00 s, both formats.

- **Shot 0 (new).** The game's splash opens the film. The O then the X draw at the app's own timing (O 14 frames, X from 16, arms 8), and the title and slogan rise at 30 / 34. The footer reads `© 2026 Kaya Randomized` with no version. It is held to 97, then leaves with the app's splash-out (fade, scale 1.03). The board's tray fades in underneath.
- **Shots 1-3.** No title on the board. The sub-line runs 117-168. The bot "thinks" (the O badge pops, breathes once and leaves as the O draws) before each O. The moves are at 162 / 212 / 348 / 400 / 432, so none is under 1.0 s apart. The win at 448 is held 32 frames. `Lucky square.` plays at 480, and the toast holds 547-621.
- **Shots 4a-7.** Every beat is moved to the v2 frames, with the added holds.
- **Shot 8.** The Kaya Randomized mark is drawn stroke by stroke (stem 1196, arm 1204, leg 1212, done 1224) over the wordmark (1230) and the URL (1242). The X/O tones are at 1196 / 1212 and the start notes at 1224.
- **Audio.** The committed voice takes and music are placed as section 4 says. Nothing was re-recorded or downloaded.
- **Master.** It now retries once, aimed past -14, when loudnorm's dynamic mode lands short (see Rulings). Final: **-14.40 LUFS, -1.28 dBTP**, both files.

## Done-when checklist

- [x] `docs/promo/storyboard-v2.md` committed and identical to the source. `cmp <main checkout>/docs/promo/storyboard-v2.md docs/promo/storyboard-v2.md` printed nothing and exited 0 ("cmp v2: identical"). The amendment also matches: `cmp` on `storyboard-v2-amendment-1.md` printed nothing and exited 0.
- [x] `npm --prefix promo ci`: 0 vulnerabilities.
- [x] `npm --prefix promo run typecheck`: clean.
- [x] `npm --prefix promo test`: 8 files, 86 tests passed.
- [x] `timeline.test.ts` pins the shot table, the sentence starts, the bot clips, the bubble and toast frames, the moves, every beat and the full cue list as literal storyboard frames.
- [x] Both renders exist. `npx remotion ffprobe -count_frames` shows:
  ```
  out/reel.mp4    h264 1080x1920 r_frame_rate=30/1 nb_read_frames=1320 duration=44.000000 | aac duration=44.000000
  out/square.mp4  h264 1080x1080 r_frame_rate=30/1 nb_read_frames=1320 duration=44.000000 | aac duration=44.000000
  ```
- [x] Each of the 16 checks, with 13 and 14 as amended, has its evidence in the table below.
- [x] Loudness, from master.ts (loudnorm measurement of the final file). Both files are within 0.5 LU of -14, with true peak under -1:
  ```
  master: -14.68 LUFS at -14; encoding again aimed at -13.32
  master: out/reel.mp4: -14.40 LUFS integrated, -1.28 dBTP true peak (mix was -31.14 LUFS; dynamic normalisation)
  master: out/square.mp4: -14.40 LUFS integrated, -1.28 dBTP true peak (mix was -31.14 LUFS; dynamic normalisation)
  ```
- [x] `git diff --stat origin/feat/promo-video -- docs/promo/audio` prints nothing: no mp3 or `durations.json` changed.
- [x] Names, versions and URLs. There is no owner name or handle, and no version string. The only URL is `tictactoe.kayarandomized.com`, in shot 8. Still file names are check names. mp4 metadata from `ffprobe -show_format`, the same for both files:
  ```
  TAG:major_brand=isom
  TAG:minor_version=512
  TAG:compatible_brands=isomiso2avc1mp41
  TAG:encoder=Lavf61.7.100
  ```
- [x] The game's `npm test` passes 60 files and 692 tests (baseline on `origin/feat/promo-video` was 681; the root run includes the promo tests). `npm run build` passes. No new failures.
- [x] No commit trailers. `git log origin/feat/promo-video..HEAD --format=%B | grep -ciE "co-authored-by|claude-session|generated with claude"` gives 0. The whole PR range from `origin/develop` also gives 0.
- [x] PR #59 is open against `develop` (not a draft), and its body states that it supersedes #57.
- [x] CI green on #59: **CI**.
  - At first the Actions run never started: the PR conflicted with `develop` (`mergeStateStatus: DIRTY`). The only conflict was `handoff/README.md`, which both sides added.
  - Mira ruled option (b): one `git merge origin/develop` (merge commit `588c232`), resolving only the index.
  - The merge touched no file under `promo/` or `docs/promo/`, so the renders stand.
  - On the merged tree: promo 86/86, typecheck clean, game 692/692, build ok.
- [x] RESULT.md is filled in, with the mp4 paths at the top.

### The 16 checks (storyboard-v2 section 8, 13 and 14 as amended)

Stills are in `handoff/004-promo-recut/stills/`, named `{reel,square}-<check>-<name>-f<frame>.png` at half size.

| #            | Check                                                                                                                                                                                                                                                   | Evidence                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1            | Both renders, 1320 frames, 44.00 s, 30 fps, audio                                                                                                                                                                                                       | ffprobe above                                                                                                                                                                                                                                                                                                                                                                                  |
| 2            | Splash: bare background, O then X (done by 1.1 s), title, slogan, footer with no version, slogan ≥ 1.5 s, tones, "Tic-tac-toe." at the title, poster near 90                                                                                            | `*-02-splash-first-frame-f0`, `-o-drawing-f8`, `-x-done-f33`, `-poster-f90`, `-out-f102`. The X is done at 32 (1.07 s). The slogan is fully in at 47 and holds to 97 (1.67 s). The cues are at 0 / 16 / 30 and the sentence at 36 (timeline test)                                                                                                                                              |
| 3            | Plain board from 3.6 s, no title; the sub-line with the voice; X centre at 5.4 s                                                                                                                                                                        | `*-03-board-no-title-subline-f140`, `*-03-first-x-f170`. The X starts at 162                                                                                                                                                                                                                                                                                                                   |
| 4            | O badge breathes before the first O; O top-left at 7.1 s; no move < 1.0 s after the previous                                                                                                                                                            | `*-04-thinking-badge-f194`, `*-04-first-o-f224`. The test "never starts a move less than 1.0 s after the previous one" covers the spacing                                                                                                                                                                                                                                                      |
| 5            | `I do this all day.` ≥ 1.7 s with the bot voice, after "Now it talks back."                                                                                                                                                                             | `*-05-bubble-i-do-this-all-day-f293`. The bubble shows 273-336 (2.1 s). The sentence ends at 264, 9 frames of air                                                                                                                                                                                                                                                                              |
| 6            | Diagonal at 14.9 s, tiles tint and pulse, one confetti burst, no strike line, tiles held                                                                                                                                                                | `*-06-diagonal-win-tiles-confetti-f455`. The tiles are still tinted at f500 and f577                                                                                                                                                                                                                                                                                                           |
| 7            | `Lucky square.` at 16.0 s, ≥ 0.5 s after the jingle, tiles visible                                                                                                                                                                                      | `*-07-lucky-square-over-tiles-f500`. The bot starts at 480, 19 frames after the jingle ends (test)                                                                                                                                                                                                                                                                                             |
| 8            | Toast at 18.2 s with the chime, legible ≥ 2.0 s                                                                                                                                                                                                         | `*-08-toast-f577`. Fully on 555-621 (2.2 s); the chime is at 547                                                                                                                                                                                                                                                                                                                               |
| 9            | Online `XOXO`, One phone, The bot (Easy/Medium/Hard), last state ≥ 0.8 s                                                                                                                                                                                | `*-09-online-xoxo-f701`, `*-09-one-phone-f773`, `*-09-the-bot-hard-f878`. Hard holds 861-888 (0.9 s)                                                                                                                                                                                                                                                                                           |
| 10           | `41`, the wall in four tier colours, held ≥ 1.0 s                                                                                                                                                                                                       | `*-10-forty-one-wall-f974`. The wall is complete at 954 and holds to 984                                                                                                                                                                                                                                                                                                                       |
| 11           | Three pills in order, together ≥ 1.2 s                                                                                                                                                                                                                  | `*-11-pills-f1088`. All three are on from 1060 to 1098 (1.27 s)                                                                                                                                                                                                                                                                                                                                |
| 12           | Slogan over three tinting X tiles, no strike line, both lines ≥ 1.5 s                                                                                                                                                                                   | `*-12-slogan-f1184`. Both lines are on from 1140 to 1194 (1.8 s)                                                                                                                                                                                                                                                                                                                               |
| 13 (amended) | Ends on the Kaya mark (stem, arm, leg, about 39.9-40.8 s) with the wordmark and URL. No X/O logo. All three together ≥ 2.0 s, mark ≥ 3.0 s. Colours `#8fa8ff` / `#ff9f7a`, no glow or backing. Last words "From Kaya Randomized."; last frame not black | `*-13-kaya-mark-drawing-f1208`, `*-13-kaya-mark-done-f1224`, `*-13-last-frame-f1319`. The lockup holds 1254-1320 (2.2 s) and the mark 1224-1320 (3.2 s). Colours are pinned in `brand.test.ts`. Sentence 8 runs 1232-1278                                                                                                                                                                      |
| 14 (amended) | 9:16 safe area, including the splash and its footer; text ≥ 28 px; no owner name, real code, version or strike line, and no other URL; the shot 8 stack inside y 250-1520                                                                               | `layout.test.ts` checks every essential layer through its motion in both formats. That includes the splash under its 1.03 scale-out (reel top 292, footer bottom 1505) and the Kaya mark, wordmark and URL with slide and settle. It also enforces "no text under 28 px". I looked at reel f90 (splash and footer), f194, f500, f974 and f1319: nothing essential sits above 250 or below 1520 |
| 15           | Bot lines in their own voice at about 9.1 s and 16.0 s, with bubbles; no overlap with the narrator or a game sound; ≥ 6 frames of air                                                                                                                   | Timeline tests: "starts no game sound while the bot speaks"; the air rule throws under 6 frames. Window loudness in the final reel: narrator "Now it talks back." -13.76 LUFS; bot-01 -12.97; bot-02 -12.43 (see Deferred minors)                                                                                                                                                              |
| 16           | Music covers the film, fades in, fades out over the last 1.5 s, no seam                                                                                                                                                                                 | One 101 s track from 0:00 with no loop. Fade in over 15 frames, fade out 1275-1320 (`mix.test.ts`). Bed alone mid shot 3: -16.41 LUFS. Tail after the last word: -20.09 LUFS                                                                                                                                                                                                                   |

## How to run

```sh
npm --prefix promo ci
npm --prefix promo test && npm --prefix promo run typecheck
npm --prefix promo run render   # out/reel.mp4, out/square.mp4 (mastered, 44.00 s)
npm --prefix promo run stills   # handoff/004-promo-recut/stills/
npm --prefix promo run dev      # Remotion Studio
```

## Rulings

- **Ruling (Mira's process ruling, 2026-10-01): one `git merge origin/develop` into `feat/promo-recut`.**
  - Decision: merged once (`588c232`). This lifts the handoff's "do not merge develop" line for this single merge.
  - Why: `handoff/README.md` was added on both sides, and that add/add conflict blocked CI on #59.
  - The resolution touched only that file: rows 001, 002, 003 and 004 in order, each with its true status. No other file conflicted, and no promo file changed in the merge.
  - Cost if wrong: one merge commit in the branch history.

- **Ruling: splash cue lengths.** Accepted from Mira (Q1). Storyboard-v2 §10 item 6 asked me to check the cue against the app.
  - Decision: shots 0 and 8 use the existing `move-o.wav` / `move-x.wav` / `start.wav`.
  - Finding: pitches and offsets line up with the app's `splash` cue (`browserFeedback.ts` on develop): 520 Hz at 0, 660 Hz at 0.52 s, 523 / 784 Hz at 1.00 / 1.08 s, which are frames 0, 16, 30, 32.4. The difference is length: the app's O and X splash notes last **0.14 s**, the move wavs **0.07 s**.
  - Why: the storyboard says "no new files".
  - Cost if wrong: the two opening notes sound half as long as the app's. Fix by adding one `splash` cue to `CUES` and writing `tones/splash.wav`.
- **Ruling: shot 6 pills at 1020 / 1050.** Accepted from Mira (Q2).
  - Decision: pills land at 988 / 1020 / 1050, against the even-pacing targets 988 / 1019 / 1048.
  - Why: these are handoff 002's measured word offsets (+32, +62) from the sentence start.
  - Cost if wrong: one or two frames.
- **Ruling: amendment 1 applied** (from Mira, owner request).
  - Decision: the Kaya mark replaces the X/O logo on shot 8, at the amendment's sizes and positions. Its paths are inline in `brand.ts` and pinned by a test. Mira's message is saved verbatim as `AMENDMENT-1.md` and the designer's file is committed, `cmp` clean.
  - Why: the amendment wins over the storyboard on shot 8.
  - Cost if wrong: shot 8 reverts to the 480 / 320 logo.
- **Ruling: shots are a fixed table, not derived from the takes.**
  - Decision: sentences sit on their section 4 frames. A take that runs into the next shot throws ("sentence N must end before shot M"). That replaces the plan's "pushed past the previous sentence".
  - Why: v2 starts shots 4b and 8 6 and 38 frames before their sentences, so a push could only happen after a sentence had already broken the end-before-next-shot rule. The push was unreachable.
  - Also: the plan's "lock-up ≥ 60 frames" rule became the storyboard's "sentence 8 may run at most 6 frames past 1277". The lock-up frames are now constants (1254-1320, 66 frames) and no take can shorten them.
  - Cost if wrong: a re-recorded longer take fails loudly instead of re-timing itself.
- **Ruling: bot-01 throws instead of shortening its bubble.**
  - Decision: if bot-01 ran long, the timeline throws rather than shortening the bubble hold as rule 3 says. bot-02 does shorten.
  - Why: the takes are fixed for this job.
  - Cost if wrong: a re-record needs a code change.
- **Ruling: master aims past -14 once when it lands short.**
  - Decision: if the master misses by more than 0.5 LU, `scripts/master.ts` re-encodes once aimed at `-14 − miss` (`aimFor`, tested). `masterProblems` now checks the handoff's 0.5 LU rather than 1 LU. The target, peak ceiling, mix levels and filters are unchanged.
  - Why: the 44 s mix (-31.14 LUFS, with 12 s of no narrator) needs +17 dB. That forces loudnorm into its dynamic (limiting) mode, which landed at **-14.68 LUFS**, outside the 0.5 LU limit. Changing LRA (11 / 20 / 30) changed nothing. The aimed pass lands at -14.40 / -1.28 dBTP.
  - Cost if wrong: one extra encode per render (seconds), and a master about 0.4 LU under -14.
- **Ruling: logo gap cut with an SVG mask.**
  - Decision: the knockout where the X crosses the O is now a mask on the O (fixed id `logo-gap`; one logo on screen at a time). Before, the crossing arm was painted in the background colour. Geometry and draw timing are unchanged; the skeptic checked them against the app.
  - Why: over the top-left glow the background-coloured arm showed a dark halo round the X in the splash.
  - Cost if wrong: none visible; the app itself still uses the paint method.
- **Ruling: the board's tray fades in under the splash-out** (from 97, 11 frames), with the splash layered above it.
  - Why: both reviewers found the tray snapped on at 108 in one frame. With the tray on top, it covered the fading splash.
  - Cost if wrong: frames 97-108 show a crossfade, not a bare background.
- **Ruling: splash and footer boxes are narrower than full width** (reel 840 / 600, square 620 / 500).
  - Why: a full-width box scaled 1.03 would cross the side margins in the safe-area test, and the text is far narrower.
  - Cost if wrong: none; the text is centred.
- **Ruling: the bubble badge's breath starts on the pop** (273), as v2 says. It used to start 8 frames after.
- **Ruling: shot 8 settle eased.** The 4 px settle now eases (ENTER) over the last 3 s, as the amendment says. It used to be linear over the whole shot.
- **Ruling: HANDOFF.md written byte for byte.** The Prettier hook re-padded its tables on write. I restored the table lines with a script (only table padding had changed), as handoff 002 did.
- **Ruling: stills are new.** 44 stills (22 checks × 2 formats, 4.0 MB) are in this handoff's folder. Handoff 002's stills are untouched.

## Deferred minors

- **Bot lines measure about 1 LU over the narrator in short windows** (bot-01 -12.97 and bot-02 -12.43 LUFS, against "Now it talks back." -13.76). The mix sets them 2 dB under by integrated source loudness, unchanged from handoff 002, where they measured under. The likely cause is loudnorm's dynamic mode working differently over the new 44 s mix, plus how short the windows are.
  - Not fixed: the mix and master numbers are a settled decision (handoff §3).
  - If the owner hears the bot as too loud, lower `BOT_UNDER` in `mix.ts`.
- **Some storyboard frames are constants in shot components and not pinned by tests.** Examples: 4a's second phone 657 and marks 669 / 681, 4c pills 795, numeral at 888 over 12, slogan line 1 at 1100, splash rise 13 frames. The skeptic checked each by hand and the stills show them.
  - Not fixed: the handoff says no component unit tests. Moving them all into `Beats` would grow it with values only one shot reads.
- **The `KayaMark` opacity guard is redundant** (the skeptic saw no cap dot without it). It is kept because the amendment asks for it explicitly.

## Merge danger

- **Door:** two-way. Everything is inside `promo/`, `docs/promo/` (two added storyboard files) and `handoff/`. The game's `src/`, `package.json`, `public/`, CI and config are untouched.
- **Blast radius:** the game's `npm test` also runs the promo tests (handoff 002's setup), so a broken promo test would turn CI red. Nothing ships to the live app.
- **How to revert:** `git revert` the merge commit; that removes `promo/` and the docs with it. To keep handoff 002's 30 s cut, revert only this handoff's commits (`bfde01c..HEAD`).

## Conflicts with CLAUDE.md

None. The handoff's "no Co-Authored-By" matches the user's global rule. TDD was followed: every logic change had its test changed first and seen failing for the right reason.

## Tests

- **promo:** 8 files, 86 passed (was 75).
  - Timeline: 29 tests. Changed tests all pin literal storyboard-v2 / amendment frames.
  - Layout: 10 tests. Adds the splash, footer, thinking badge and Kaya stack, and splash-out scaling.
  - Brand: splash text and Kaya mark.
  - Loudness: 0.5 LU limit, `aimFor`, aimed second pass.
  - Mix: fade-out 1275-1320.
- **game root:** 60 files, 692 passed. No red tests, including pre-existing ones.
- **build:** `npm run build` ok.
- **Reviews:**
  - skeptic: 0 high, 1 medium (tray snap, fixed), 5 low (L1 sentence-8 rule fixed; L4 settle easing fixed; L5 stills re-rendered; L2 and L3 deferred above).
  - code-review: 1 high (same tray snap, fixed), 4 medium (thinking exits and sub-line as tested beats, fixed; `TOAST_EXIT` from `SHOTS`, fixed; shared `RISE_SLOW`, fixed), lows fixed (renames `MARK_SETTLE` / `zones.subline`, `BOT2_AT` unexported, stills frames from beats, comments). Its note on `splashRise` re-implementing `rise` is answered with a comment: the splash moves 10 px, not 12.

## Open questions for Mira / Arnel

1. **Splash notes.** Should the two splash notes match the app's 0.14 s length? That needs one generated tone file. The default is to keep the existing 0.07 s files.
2. **Bot level.** Is the bot about 1 LU louder than the narrator in its windows acceptable? The mix is unchanged by rule.

## Trial report

- Tool: Remotion 4.0.531 (second job)
- **Times used:** two full renders of both formats, two still runs (44 stills), and three or four short still runs for spot checks.
- **What it caught / what it made easy:**
  - Frame-exact timing in pure TS: the whole re-cut was a table change plus beats, checked by tests.
  - `renderStill` at chosen frames made visual checks cheap. That is how I caught the logo halo and the tray layering.
  - The same composition rendered both formats.
- **What got in the way:**
  - Loudnorm's dynamic fallback on a longer, quieter mix. Remotion's bundled ffmpeg has no limiter or ebur128, so the fix had to stay inside loudnorm.
  - The session's worktree guard rejected compound shell commands, which cost a few retries.
- **Your call:** keep. For a re-cut it is fast: the risk is in the audio master, not the picture.

## Suggestions for Mira

- When a storyboard revision changes length, give the master's loudness tolerance and the expected mix level explicitly. A longer stretch without the narrator lowers integrated loudness.
- Amendments that arrive mid-build worked well as a file plus one message. Keep that shape.

## Suggested next steps

- Mira closes #57. Arnel watches both renders, using frame 90 as the poster.
- If wanted: a `splash` tone with the app's 0.14 s notes, and a bot level check by ear.
