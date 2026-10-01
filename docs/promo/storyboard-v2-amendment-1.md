# Tic-Tac-Toe promo: storyboard revision 2, amendment 1 (the Kaya Randomized mark on the last shot)

Applies to `storyboard-v2.md`. Where this file and revision 2 disagree, **this file wins**; everything not named here stays exactly as in revision 2. Motion storyboard only: no code, no comps. Written by the designer, 2026-10-01.

Owner request (after approving revision 2): "can we also add kaya randomized logo in the end of the video".

**Length does not change: 1320 frames, 44.00 s. Shots 0-7, the script, voices, narration frames, colours, fonts, the URL line, music and all cue frames before 1194 are untouched.**

## 1. Decisions

| # | Decision | Reasoning |
|---|---|---|
| 1 | **The Kaya mark is the only logo in shot 8.** The game's X and O logo is not drawn there; it stays in the splash (shot 0) only. No X and O lead-in. | The end card belongs to the maker and the splash already shows the game's logo; a lead-in would spend frames before the mark and show two logos to say one thing. |
| 2 | **The mark is drawn, stroke by stroke, with dash offset**: stem, then arm, then leg (coral last). Each stroke eases on the film's own curve `Easing.bezier(0.22, 1, 0.36, 1)`. | It is made of three round-capped strokes, so a draw is its native motion, the same language as the X and O in the splash; coral arriving last echoes the O answering the X. |
| 3 | Mark box 720 px (9:16) and 640 px (1:1), the stack centred by the **ink**, not the box; wordmark and URL sizes unchanged from revision 2. | The mark is the hero of the shot and now larger than the old 480 / 320 logo, while the stack still sits well inside the safe areas. |
| 4 | **No change in length or in any frame outside shot 8.** The mark is fully drawn at frame 1224 and stays 96 frames (3.20 s); the full lockup still holds 66 frames (2.2 s) from 1254. The narrator stays at 1232-1277. | The old logo finished at 1226; the new draw finishes two frames earlier, so every later frame in revision 2 stays valid. |
| 5 | Sound: the existing tones only, three cues: `tones/move-x.wav` at 1196 (stem, blue), `tones/move-o.wav` at 1212 (leg, coral), `tones/start.wav` at 1224 (arrival; its notes land at 1224 and 1226 as in revision 2). No cue at the arm. | The same three files and the same arrival notes as the revision 2 cue, so the bookend with the splash sound is kept; blue stroke gets the X tone, coral stroke the O tone, matching the colours of the game. |

## 2. The mark (use as drawn)

Source: `projects/kaya-randomized-brand/assets/page/mark-A-transparent.svg` (approved by the owner as the company's Facebook Page picture). The worker needs no file outside the repo: draw this inline SVG, 1024 x 1024 viewBox, no background, nothing else in it.

```
<svg viewBox="0 0 1024 1024" fill="none" stroke-width="116" stroke-linecap="round">
  <path d="M340 260V764"    stroke="#8fa8ff"/>   <!-- stem, blue -->
  <path d="M372 540L690 262" stroke="#8fa8ff"/>  <!-- arm, blue -->
  <path d="M540 500L712 764" stroke="#ff9f7a"/>  <!-- leg, coral, on top -->
</svg>
```

Blue `#8fa8ff` and coral `#ff9f7a` are the game's X and O colours already in revision 2 (fact 4). Layer order: stem, arm, leg (the leg is on top of the arm). **Used as drawn: no recolouring, no outline, no tile or card behind it, no glow or shadow beyond the film's two existing background glows, no rotation, no scaling in the animation, no new artwork.** Ink bounds inside the 1024 box: x 282-770, y 202-822 (488 x 620; round caps included).

### Draw spec (dash offset)

Path lengths in box units: stem 504, arm 422.4, leg 315.1. Per stroke: `stroke-dasharray = "L L"`, `stroke-dashoffset` goes from `L` to `0` with the progress below; keep each stroke at opacity 0 until its start frame (no round-cap dot before the draw). Progress is `interpolate(frame, [start, end], [0, 1])` through `Easing.bezier(0.22, 1, 0.36, 1)`, clamped.

| Order | Stroke | Colour | Frames (start-end) | Length (frames) | Time |
|---|---|---|---|---|---|
| 1 | Stem `M340 260V764` | `#8fa8ff` | 1196-1208 | 12 | 39.87-40.27 s |
| 2 | Arm `M372 540L690 262` | `#8fa8ff` | 1204-1216 | 12 | 40.13-40.53 s |
| 3 | Leg `M540 500L712 764` | `#ff9f7a` | 1212-1224 | 12 | 40.40-40.80 s |

Each stroke starts 4 frames before the previous one ends (it grows out of the nearly finished stroke before it); the whole draw is 28 frames (0.93 s), done at frame 1224. The shot starts at 1194 with the standard 8-frame crossfade and 12 px slide (1194-1202); the first stroke starts at 1196 inside it.

## 3. Sizes and positions

All placements centre the **ink** of the mark (not its 1024 box) on x = canvas centre. Box x offset: the ink centre sits at x 526 of 1024, so the box is shifted left of centre by (526 x scale) - centre as listed.

| | 9:16 (1080 x 1920) | 1:1 (1080 x 1080) |
|---|---|---|
| Mark box side (scale) | 720 px (0.703) | 640 px (0.625) |
| Mark box, top-left | x 170, y 371 | x 211, y 123 |
| Mark ink (visible) | 343 x 436, x 368-711, y 513-949 | 305 x 388, x 387-692, y 249-637 |
| Gap ink to wordmark | 64 | 48 |
| Wordmark `Kaya Randomized`, F 600, size / line box | 100 / 120, y 1013-1133 | 76 / 92, y 685-777 |
| Gap wordmark to URL | 20 | 14 |
| URL `tictactoe.kayarandomized.com`, N 700, `--muted-foreground`, size / line box | 44 / 53, y 1153-1206 | 34 / 41, y 791-832 |
| Whole stack (centre) | y 513-1206 (centre 860) | y 249-832 (centre 540) |
| Safe area check | inside y 250-1520, margins 72 | inside 60 px on all sides |

Wordmark and URL are centred on x 540 in both canvases. Wordmark width at 100 px is about 800 px (inside the 936 px text width); if the measured width exceeds 936 px, the worker reduces the size, never wraps. The "ease down 4 px over 3 s" applies to the mark, wordmark and URL together.

## 4. Timing inside shot 8 (126 frames, unchanged)

| Frame | Time | What |
|---|---|---|
| 1194-1202 | 39.80-40.07 | crossfade in from shot 7 (bare background and the two glows) |
| 1196-1208 | 39.87-40.27 | stem draws; `move-x.wav` at 1196 |
| 1204-1216 | 40.13-40.53 | arm draws |
| 1212-1224 | 40.40-40.80 | leg draws; `move-o.wav` at 1212 |
| 1224, 1226 | 40.80, 40.87 | `start.wav` notes; mark complete |
| 1230 | 41.00 | wordmark rises 12 px and fades in (as in revision 2) |
| 1232-1277 | 41.07-42.57 | narrator: "From Kaya Randomized." (unchanged) |
| 1242-1254 | 41.40-41.80 | URL rises 12 px and fades in over 12 frames, settled 1254 (unchanged) |
| 1254-1320 | 41.80-44.00 | full lockup on screen, 66 frames, 2.2 s (unchanged); mark fully visible from 1224 to the end, 96 frames, 3.2 s |
| 1275-1320 | 42.50-44.00 | music fades out (unchanged); last frame is the lockup, not black |

## 5. Replacement text for revision 2

Each block quotes the old line and gives the new one. Line numbers are those of `storyboard-v2.md` as read on 2026-10-01.

### R1. Revision table, row 7 (line 20)
Old:
`| 7 | Shot 8 logo draw is the app's real timing (about 1.04 s, 32 frames), not "about 20 frames". The shot 8 cue is the app's own `splash` cue, a deliberate bookend with shot 0. | `Logo.tsx` timings; faithful to the app. |`

New:
`| 7 | Shot 8 ends on the **Kaya Randomized mark**, drawn stroke by stroke (28 frames, frames 1196-1224), not the game's X and O logo; the shot 8 sound is the same three existing tones as the splash cue (`move-x`, `move-o`, `start`). Amendment 1, owner request. | Owner: "can we also add kaya randomized logo in the end of the video". |`

### R2. Layout anchors row (line 97)
Old:
`| Logo + wordmark + URL stack (shot 8), centred | centred on y 860 | centred on y 540 |`

New:
`| Kaya mark + wordmark + URL stack (shot 8): the mark's ink, wordmark and URL centred as one stack | y 513-1206 (centre 860); mark box 720 at x 170, y 371 | y 249-832 (centre 540); mark box 640 at x 211, y 123 |`

### R3. Type table row (line 110)
Old:
`| Shot 8 logo (box side) | | 480 | 320 | Assumed; deliberately smaller than the splash logo so the bookend is an echo, not a repeat |`

New:
`| Shot 8 Kaya mark (SVG box side; ink is 0.60 of it in height) | | 720 | 640 | Assumed; the mark is the hero of the end card, sized so the stack (mark, wordmark, URL) sits inside the safe areas |`

### R4. Shot 8 block (lines 213-219), replaced in full
Old (heading and five bullets, lines 213-219): from `### Shot 8: The mark (39.80-44.00 s, frames 1194-1320, 126; was 96)` through `- **Sound:** the `splash` cue as in shot 0: O tone at 1194, X tone at 1210, start notes at 1224 and 1226. Music fades out frames 1275-1320 (1.5 s).`

New:

```
### Shot 8: The mark (39.80-44.00 s, frames 1194-1320, 126; was 96)
The film ends on the maker's mark. The game's X and O logo lives in the splash only; this shot belongs to Kaya Randomized. The mark is drawn in the film's own language (dash offset, the app easing), with the same three tones as the splash cue.
- **On screen:** the Kaya Randomized mark (three round-capped strokes, `amendment-1.md` section 2: stem and arm `#8fa8ff`, leg `#ff9f7a`, used as drawn) at 720 / 640 px box, with the wordmark `Kaya Randomized` (F 600) beneath and one quiet URL line under it. Sizes and positions in `storyboard-v2-amendment-1.md` section 3. The whole video ends on this still, no fade to black. The game's X and O logo is not drawn in this shot.
- **Text:** `Kaya Randomized`; then `tictactoe.kayarandomized.com` (N 700, `--muted-foreground`, 44 / 34, inside the safe area). No other URL, handle, "visit" or "scan".
- **Narration:** "From Kaya Randomized." frames 1232-1277 (1.509 s), then 43 frames (1.43 s) of music tail.
- **Motion:** (1) the mark draws by dash offset, one stroke after another on `Easing.bezier(0.22, 1, 0.36, 1)`: stem frames 1196-1208, arm 1204-1216, leg 1212-1224 (28 frames in all); (2) wordmark rises 12 px starting frame 1230; (3) URL line rises 12 px and fades in over 12 frames from frame 1242 (settled 1254); (4) mark, wordmark and URL ease down together by 4 px over the last 3 s. The mark is complete from frame 1224 (96 frames, 3.2 s); everything is on screen from frame 1254 to the end: 66 frames, **2.2 s** (never under 2.0 s; shot 8 may give 6 frames to the narrator if it runs long, never more).
- **Sound:** `tones/move-x.wav` at 1196 (stem), `tones/move-o.wav` at 1212 (leg), `tones/start.wav` at 1224 (its notes land at 1224 and 1226). No cue at the arm. Music fades out frames 1275-1320 (1.5 s). No new sound files.
```

### R5. Sound cue summary row (line 291)
Old:
`| 1194, 1210, 1224, 1226 | 39.80, 40.33, 40.80, 40.87 s | splash cue (shot 8) |`

New:
`| 1196, 1212, 1224, 1226 | 39.87, 40.40, 40.80, 40.87 s | Kaya mark cue (shot 8): X tone as the stem draws, O tone as the leg draws, start notes as the mark completes |`

### R6. Audio plan, game sounds line (line 258)
Old:
`Game sounds, new or changed: the splash cue in shots 0 and 8 (fact 16, built from `move-o.wav`, `move-x.wav`, `start.wav`, no new tones); the `step-587.wav` tone already exists for 4c.`

New:
`Game sounds, new or changed: the splash cue in shot 0 (fact 16, built from `move-o.wav`, `move-x.wav`, `start.wav`, no new tones) and the same three files in shot 8 for the Kaya mark (X tone at frame 1196, O tone at 1212, start notes at 1224; no new tones); the `step-587.wav` tone already exists for 4c.`

### R7. Must not, item 15 (line 315)
Old:
`15. The title `Tic-Tac-Toe` appears once on screen (shot 0) and the slogan twice (shots 0 and 7, deliberately). No other repeated element except the shot 0 and shot 8 logo draw.`

New:
`15. The title `Tic-Tac-Toe` appears once on screen (shot 0) and the slogan twice (shots 0 and 7, deliberately). The game's X and O logo appears once (shot 0); the Kaya Randomized mark appears once (shot 8). No other repeated element.`

### R8. Must not, new item 16 (add after line 315)
New:
`16. The Kaya mark is used exactly as drawn in `storyboard-v2-amendment-1.md` section 2: no recolouring, no outline, no card or tile behind it, no glow or shadow beyond the film's two background glows, no new artwork, and the game's X and O logo is not shown beside it.`

### R9. Done-when check 13 (line 331)
Old:
`13. The video ends on the overlapping X and O logo (drawn in O then X as in shot 0, at a smaller size) with `Kaya Randomized` and, beneath it, `tictactoe.kayarandomized.com`; the final frame shows all three; they are all visible for at least 2.0 s; the narrator's last words are "From Kaya Randomized."; the last frame is not black.`

New:
`13. The video ends on the Kaya Randomized mark (a blue stem and a blue arm forming a K, with a coral leg across it; drawn stroke by stroke, stem then arm then leg, between about 39.9 s and 40.8 s) with `Kaya Randomized` and, beneath it, `tictactoe.kayarandomized.com`; the game's X and O logo does not appear in this shot; the final frame shows mark, wordmark and URL together; all three are visible together for at least 2.0 s and the mark alone is fully drawn for at least 3.0 s before the end; the mark's colours are `#8fa8ff` and `#ff9f7a` with no glow or backing; the narrator's last words are "From Kaya Randomized."; the last frame is not black.`

### R10. Done-when check 14 (line 332), one clause
Old:
`...and no URL other than `tictactoe.kayarandomized.com` in shot 8.`

New:
`...and no URL other than `tictactoe.kayarandomized.com` in shot 8; in the 9:16 render the shot 8 mark, wordmark and URL all sit inside y 250-1520.`

### R11. Assumptions item 2 (line 349)
Old:
`2. **Shot 8 logo size** 480 / 320 px and the stack gaps; revision 1 gave none. The splash logo is the larger one by design.`

New:
`2. **Shot 8 mark size** 720 / 640 px (box) and the stack gaps in amendment 1 section 3; the mark is the hero of the end card and sits inside the safe areas. The sizes are the designer's, not from an app file. The arm-on-stem and leg-on-arm overlaps are as in the approved mark file.`

### Not changed, checked
Section 3 table row `8 The mark` (name and 126 frames); section 4 table row 8 and rule 4 (66-frame full-lockup floor); music fade (1275-1320); section 4 totals; section 9 and the other open decisions; shot 0 and every check that names the splash logo (check 2).

## 6. Assumptions and could not check

1. Mark sizes, gaps and the draw frames are the designer's choice, not measured in a render; the worker should view frames 1224 and 1319 of both canvases and report if the stack looks off-centre.
2. The wordmark width at 100 px (about 800 px) is an estimate; rule in section 3 says shrink, never wrap.
3. `tones/move-x.wav`, `move-o.wav` and `start.wav` are assumed to be the files named in revision 2 fact 16 and section 5; not opened. The `start.wav` note spacing (notes at +0 and +2 frames) is taken from revision 2's cue frames 1224 and 1226.
4. The dash-offset recipe uses path lengths computed by hand (504, 422.4, 315.1); the worker may use `pathLength` or `getTotalLength()` instead; the result must be the same.
5. Round caps extend 58 box units beyond each path end, so at full draw each stroke's ink is longer than its path; this is as in the approved mark and is why the ink bounds in section 2 are wider than the path coordinates.
