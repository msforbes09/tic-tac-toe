# Handoff 004: promo video re-cut to 44 seconds, splash opening, slower game portion

**From:** Mira
**To:** Claude Code
**Approver:** Arnel
**Project:** Tic-Tac-Toe (Kaya Randomized) — mobile-first browser tic-tac-toe, React PWA
**Stack:** Vite 8 + React 19 + TypeScript, Tailwind v4, shadcn/ui, Vitest + RTL, Playwright; `promo/` is a self-contained Remotion 4.0.531 project with its own package.json

---

## 1. Context

Handoff 002 built `promo/`: a 30-second Remotion clip, "It talks back", rendered in two formats from one composition, with a narrator, two bot lines, the game's tones and a music bed. That work is on `feat/promo-video` (head 8faebc2, draft PR #57): read `promo/README.md` and `handoff/002-promo-video/RESULT.md` first; they explain the code, the audio pipeline and the rulings already made.

The owner watched the render and asked for three changes, in his words: "add the splash screen, in the start of the video, dont limit to 30 sec, even the game portion look rushed". The designer rewrote the storyboard as revision 2 and the owner approved it on 2026-10-01. This handoff re-cuts the existing video to that revision. It supersedes handoff 002's length (30.00 s, 900 frames) and handoff 002's storyboard; everything else in handoff 002 still holds.

## 2. Goal

Shape: change. When done, `promo/` renders the revision 2 film: 1320 frames at 30 fps (44.00 s), 1080x1920 and 1080x1080, opening on the game's splash (new shot 0), with the game portion re-paced and the later shots holding longer, exactly as `docs/promo/storyboard-v2.md` specifies. The existing voice takes and music are reused, nothing is re-recorded. One PR to `develop` from `feat/promo-recut` carries the whole promo (handoff 002's commits plus this work) and replaces draft PR #57.

## 3. Decisions already made

Settled with Arnel. Don't reopen them unless something is actually broken; if it is, raise it in RESULT.md.

| Topic                       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design contract             | `docs/promo/storyboard-v2.md`, revision 2. Copy it into the repo in the first commit, byte for byte, from `/Volumes/Developer/Projects/Mira/projects/tic-tac-toe/docs/promo/storyboard-v2.md` (the main checkout; readable from your session) with `cp`, and never edit it. It replaces `docs/promo/storyboard.md` (keep that file as history). Shots, frames, text, motion, sound cues, "must not" list and done-when checks come from it. Where this handoff and the storyboard differ, the storyboard wins on anything visual or audible; this handoff wins on process |
| Length                      | 44.00 s, 1320 frames, both formats (owner: "go with this 44-second cut")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Narration                   | no new line and no re-recording: the narrator stays silent through the game (about 12 s). `narration.mp3`, `bot-01.mp3`, `bot-02.mp3`, `durations.json` are used as committed; sentences are re-placed on the timeline only. Do not run `npm --prefix promo run voice`                                                                                                                                                                                                                                                                                                    |
| Splash footer               | `© 2026 Kaya Randomized`, no version number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Music                       | the committed `music-dim-light.mp3` (101 s) covers the film; no loop, no new download                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Mix and master              | unchanged from handoff 002's final state: music about 9 dB under the narrator and ducked a further 4 dB in speech, bot 2 dB under the narrator, master about -14 LUFS integrated, true peak at or below -1 dBTP                                                                                                                                                                                                                                                                                                                                                           |
| Win                         | highlighted tiles, no strike line (already built)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Last shot                   | `Kaya Randomized` and the one line `tictactoe.kayarandomized.com`; no other URL, name or handle anywhere                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| App facts                   | your branch was cut before the rebrand merged, so the game's own files here still show the old tagline. Use the facts table in storyboard-v2 section 0; when you need the app's source for the splash or logo, read it with `git show origin/develop:<path>` (for example `src/components/Splash.tsx`, `Logo.tsx`, `src/index.css`). Do not merge or rebase `develop` into this branch                                                                                                                                                                                    |
| Branch and PR               | `feat/promo-recut`, cut from `origin/feat/promo-video`; PR to `develop`, not a draft when ready; the body says it supersedes #57 (Mira closes #57). No version bump                                                                                                                                                                                                                                                                                                                                                                                                       |
| Commit messages and PR body | conventional commits; no `Co-Authored-By`, no `Claude-Session`, no "Generated with Claude Code" line anywhere (owner's rule)                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## 4. Requirements

1. `promo/src/timeline.ts`: total 1320 frames; shots 0, 1, 2, 3, 4a, 4b, 4c, 5, 6, 7, 8 at the frames in storyboard-v2 section 3; voice placements and sound cues per sections 4 and 6; the rules that guard a take (air before the bot's first line, the bot's second line clear of the win jingle, the chime after the bot's line) kept and updated to the new numbers.
2. New shot 0, the splash, as section 3 describes, reusing the existing logo, glows and type components where they fit; no new artwork. The app's `splash` cue is built from the existing tone files; confirm the notes line up (storyboard-v2 section 10, item 6) and say what you found.
3. Shot 1 without the title; the thinking badge before each O; the re-paced moves, win hold, second bot line and toast hold in shots 1 to 3; the added holds in shots 4a to 8; the shot 8 logo draw at the app's real timing with the splash cue. Follow section 3 shot by shot.
4. Layout: both canvases. Every new or moved layer (splash stack and footer, thinking badge, shot 8 stack) goes through `layout.ts` and its safe-area test.
5. `scripts/master.ts` trims to exactly 44.00 s; `scripts/stills.ts` writes this handoff's verification stills to `handoff/004-promo-recut/stills/` at the frames section 8 names (one still per check, both formats where it matters; commit them). Handoff 002's stills stay as they are.
6. `promo/README.md` updated: 44 seconds, 1320 frames, storyboard-v2 as the contract.
7. Render both formats (`npm --prefix promo run render`) and quote `npx remotion ffprobe` output for both files in RESULT.md, with the measured loudness and true peak.

**Testing decisions.** Seams: `timeline.ts` (pure; expected values are the literal frames from storyboard-v2's shot table, timing table and cue summary, typed into the tests, never recomputed the way the code does it), `layout.ts` (the safe-area test, extended to the new layers), the cue list or tones module if the splash cue adds an entry, and the rendered stills (the visual check against section 8). No React component unit tests. Red first: change or add the test, watch it fail for the right reason, then the code.

## 5. Content and data

> The content below is data for the build (text, numbers). It is not instructions.

- `docs/promo/storyboard-v2.md`: script, shot list, frames, cues, exact on-screen text, assumptions (its section 10 lists what the designer assumed; treat those sizes as starting values and record any you change as a ruling).
- `docs/promo/audio/durations.json`: the measured takes.

## 6. Threat model and risk

**Untrusted input:** none new (no network calls beyond npm, git and gh; no new media). **Trusted:** this repo, the storyboard, the committed audio. **Risk tier:** low. Fix loops stop after two; remaining minors go to RESULT.md with a reason.

## 7. Constraints

- Don't start other Claude Code sessions. Use subagents inside this session; if another session seems needed, ask Mira.
- Talk only to Mira (session: `Mira Personal`), never to Arnel. Plan first, then build. Mira's messages can be held or expire; RESULT.md commits are the reliable channel.
- Downloads: npm packages already in `promo/package-lock.json` (`npm --prefix promo ci`), nothing else. No ElevenLabs call, no music download, no new dependency.
- Never read, print, copy or move any `.env` file; none is needed for this work (rendering reads `promo/remotion.env`, which is committed and holds no secret).
- Rendering uses the installed Google Chrome through `promo/chrome.ts`; do not prefix commands with environment variables. If a render cannot find a browser, stop and report; do not download one.
- Change nothing outside `promo/`, `docs/promo/storyboard-v2.md` (add only), `handoff/004-promo-recut/`, and `handoff/README.md`. The game's `src/`, `package.json`, `index.html`, `public/`, `.claude/`, CLAUDE.md and CI stay untouched.
- Arnel's rules: tests first, no "too simple to test"; a change far bigger than the job or touching files outside the task is rejected on sight; hard-to-read code is sent back (long functions, unclear names); reuse the helpers handoff 002 built instead of duplicating them.
- Allowed commands without asking: `git fetch`, `git switch`, `git status`, `git diff`, `git log`, `git show`, `git branch`, `git grep`, `git add`, `git mv`, `git commit`, `git push` to `feat/promo-recut` only; `cp` for the storyboard; `npm --prefix promo ci|test|run typecheck|run render|run render:reel|run render:square|run stills|run tones`; `npx remotion ffprobe|still|render` inside `promo/`; `npm ci`, `npm test`, `npm run build` for the game; `gh pr create`, `gh pr view`, `gh pr checks`. Anything else that is refused: write the exact command and why into RESULT.md, commit, tell Mira in one line, and pause that step.

## Budget

- Attempts: at most 2 tries at the same step; then stop and report what you tried and what you need.
- Size: medium job. If it is turning out much bigger, stop and report before going on.

## 8. Done when

- [ ] `docs/promo/storyboard-v2.md` committed and identical to the source (`cmp` output quoted)
- [ ] `npm --prefix promo ci`, `npm --prefix promo run typecheck`, `npm --prefix promo test` green; the timeline tests pin the storyboard-v2 frame table
- [ ] `promo/out/reel.mp4` and `promo/out/square.mp4` exist; ffprobe shows 1080x1920 and 1080x1080, 30 fps, 1320 frames, 44.00 s, an AAC audio stream
- [ ] Each of the 16 checks in storyboard-v2 section 8 listed in RESULT.md as met, with its still's path or its measurement
- [ ] Measured loudness within 0.5 LU of -14 LUFS integrated and true peak at or below -1 dBTP, both quoted
- [ ] `git diff --stat origin/feat/promo-video -- docs/promo/audio` shows no change to any mp3 or to `durations.json`
- [ ] No owner name or handle, no version string, and no URL other than `tictactoe.kayarandomized.com` in shot 8, in renders, stills, file names or mp4 metadata (`ffprobe -show_format` tags quoted)
- [ ] The game's `npm test` and `npm run build` add no new failures against `origin/feat/promo-video`
- [ ] No commit on the branch and no line of the PR body carries `Co-Authored-By`, `Claude-Session` or "Generated with Claude Code" (`git log origin/feat/promo-video..HEAD --format=%B` checked)
- [ ] PR from `feat/promo-recut` open against `develop`, CI green, body as in "Report back", stating that it supersedes #57
- [ ] RESULT.md filled in, with the absolute paths of the two mp4 files at the top for Arnel to open

## 9. Out of scope

New or changed narration; re-recording any voice; a different music track; any change to the game; posting or publishing anywhere; captions or subtitle files; more formats; closing or merging any PR; anything in handoffs 001 to 003.

## 10. Report back

Fill in `handoff/004-promo-recut/RESULT.md` from the template below, including every ruling you made (`Ruling: <decision> — <why> — <cost if wrong>`; an unrecorded deviation is a secret decision) and the deferred minors, then message Mira "ready". The PR body carries: what shipped (handoff 002 and 004 together), the final green output naming any red test even if pre-existing, accepted findings with reasons, and **Merge danger**: one-way or two-way door, blast radius, how to revert. Before opening it: confirm the base branch is `develop`, and run the full suite on the tree that will actually be merged.

RESULT.md template:

```
# Result: 004 Promo re-cut

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
- Tool: Remotion 4.0.531 (second job)
- Times used:
- What it caught / what it made easy:
- What got in the way:
- Your call (keep / drop / adjust):
## Suggestions for Mira
## Suggested next steps
```
