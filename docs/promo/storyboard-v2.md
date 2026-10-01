# Tic-Tac-Toe promo video: storyboard and design brief, revision 2

Concept: **"It talks back."** 44.00 s, 1320 frames, 30 fps. Built in Remotion by a worker from this file.
Brand on screen: **Kaya Randomized** only. Slogan: **"Three in a row. Zero excuses."**

This file is a complete replacement for revision 1 (`storyboard.md`). Where this file and revision 1 disagree, this file wins.

## Revision 2: what changed against revision 1, and why

Owner feedback on the first render: add the splash screen at the start, do not cap at 30 s, and the game portion looks rushed.

| # | Change | Why |
|---|---|---|
| 1 | New opening **shot 0, the splash** (3.60 s, frames 0-108): the app's own splash, logo drawn, title, slogan, footer. | Owner request. The video now opens on the product's own opening. |
| 2 | 30 s cap removed. Film is **44.00 s, 1320 frames** (was 30.00 s, 900). Ceiling 50 s, steer 40-45 s: met. | Owner request. Every added second is listed in the table below with what it buys. |
| 3 | Shot 1 loses its `Tic-Tac-Toe` title (the splash now shows it). The narrator's "Tic-tac-toe." moves onto the splash. Shot 1 keeps `You learned it on a napkin.` | The title must not appear twice by accident. |
| 4 | Game portion re-paced: the bot **thinks** (the O badge breathes once, 1.1 s) before each O; moves are never closer than 1.0 s (was 0.3 s); the win is held 1.07 s before the bot speaks (was one frame); the win jingle is finished 0.63 s before `Lucky square.`; the achievement toast is on screen 2.47 s (was 1.0 s). | Owner: "even the game portion look rushed". |
| 5 | Shots 4c, 5, 6, 7 and 8 get hold time where a card, chip wall or pill was on screen too briefly (details per shot). Shot 4a is unchanged in length. | Readability only; nothing added to them. |
| 6 | **Win is shown by highlighted tiles, no strike line**, in shot 3 and in shot 7 (revision 1's text still described a strike line in both; the render already uses tiles). | Matches the build and the owner's decision. |
| 7 | Shot 8 logo draw is the app's real timing (about 1.04 s, 32 frames), not "about 20 frames". The shot 8 cue is the app's own `splash` cue, a deliberate bookend with shot 0. | `Logo.tsx` timings; faithful to the app. |
| 8 | Real voice-take lengths are now used (`durations.json`): bot lines are 1.625 s and 1.533 s, longer than revision 1's 1.2 s and 0.9 s targets. | Measured, not guessed. |

Where the 14.0 s went (30.00 to 44.00): splash +3.60; shots 1-3 now 17.10 s against 10.80 s (+6.30); shot 4a +0.10, 4b +0.70, 4c +0.60; shot 5 +0.90; shot 6 +0.40; shot 7 +0.40; shot 8 +1.00.

Direction in three lines (unchanged): the game's own dark room (flat `--background`, tiles, Fredoka headings), so the video looks like the product; X in `--player-x` and O in `--player-o` are the only colour besides the bronze toast and the tier chips; every move is a drawn stroke or a tile pop on the app's own easing, nothing else decorates.

Mode: Persuade, sound-off first (Facebook plays muted), so every claim in the script also appears as on-screen text.

---

## 0. Source facts the worker may rely on

Rows 1-12 are unchanged from revision 1. Rows 13-20 are new in revision 2 (read from `origin/develop`, the released version).

| # | Fact | Source |
|---|---|---|
| 1 | Fonts: Fredoka Variable (headings, buttons), Nunito Variable (text) | `src/index.css:10-11` |
| 2 | Dark tokens: `--background` oklch(0.145 0 0), `--card` oklch(0.205 0 0), `--secondary` oklch(0.269 0 0), `--foreground` oklch(0.985 0 0), `--muted-foreground` oklch(0.708 0 0), `--border` oklch(1 0 0 / 10%) | `src/index.css:106-122` |
| 3 | `--player-x` oklch(0.78 0.13 264), `--player-x-soft` oklch(0.3 0.055 264), `--player-o` oklch(0.79 0.13 42), `--player-o-soft` oklch(0.3 0.055 42) | `src/index.css:138-141` |
| 4 | Hex used in the render: background `#0a0a0a`, tray `#1c1c1c`, tile `#262626`, X `#8fa8ff`, O `#ff9f7a`, text `#fafafa`, muted `#a1a1a1`, X-soft `#202d49` | `design/og-image.svg:3-30`; `promo/src/tokens.ts:14` |
| 5 | Easing used everywhere: `cubic-bezier(0.22, 1, 0.36, 1)` (Remotion `Easing.bezier(0.22, 1, 0.36, 1)`) | `src/index.css:390,395,399` |
| 6 | Board: rounded tiles on a tray, gap 2.5% of the board width; X and O are drawn strokes (round caps) | `src/index.css:375-405` |
| 7 | Win: the three winning tiles are tinted `--player-x-soft` with a 2 px `--player-x` ring at 60%, pulse `tile-win` (scale 1 to 1.055 at 40% to 1, 620 ms), staggered 90 ms per tile along the line, plus one X/O confetti burst (1100 ms) | `src/components/Cell.tsx:12-42`, `src/index.css:476-486`, `:499-520` |
| 8 | Logo geometry in a 512 box: stroke 44, X centre (200,200) arm 90, O centre (330,330) radius 90, 9-unit background gap around the X arm where it crosses the ring | `src/lib/logo.ts:8-17` |
| 9 | Achievement toast: card, 1 px border, radius 18, tier icon left, label small caps muted, name Fredoka semibold; drops from above, 280 ms | `src/components/AchievementToast.tsx:27-35`, `src/index.css:407` |
| 10 | Difficulty labels: Easy, Medium, Hard | `src/components/SetupScreen.tsx:67-69` |
| 11 | Room code: 4 characters, alphabet excludes O, I, L, 0, 1 | `src/lib/room.ts:4-5` |
| 12 | 41 achievements: 16 bronze, 14 silver, 10 gold, 1 platinum. Tier colours bronze `#cd7f32`, silver `#b8c0c8`, gold `#f2c14e`, platinum `#9fe3ff` | `src/lib/achievements.ts:12-17,20-90` |
| 13 | Splash: logo `size-56` (224 px in a 420 px column), title `Tic-Tac-Toe` Fredoka 600 2.6rem (41.6 px) tracking -0.01em, 28 px below the logo (`mt-7`); slogan 8 px below the title (`mt-2`), muted-foreground, base size; whole stack lifted by 4vh; footer bottom-centre, 12 px, muted at 70% | `Splash.tsx:46-58` (develop) |
| 14 | Splash order and timing: O draws 0-480 ms; X starts at 520 ms, two arms of 260 ms each, second after the first (X done at 1040 ms); title rises at 1000 ms; slogan rises at 1140 ms; each rise 420 ms, from 10 px below, on the app easing; app holds 1800 ms then fades 360 ms (opacity to 0, scale to 1.03, easing `cubic-bezier(0.4, 0, 1, 1)`) | `Splash.tsx:9-11,49,52`, `Logo.tsx:10-12,51`, `index.css:431-456` (develop) |
| 15 | Splash text: title `Tic-Tac-Toe`; slogan `Three in a row. Zero excuses.`; footer in the app is `v{version} · © 2026 Kaya Randomized`. **The video drops the version and shows `© 2026 Kaya Randomized` only.** | `Splash.tsx:50,53`, `Colophon.tsx:7` (develop) |
| 16 | Splash sound cue (`splash`): O tone 520 Hz at 0 (0.14 s), X tone 660 Hz at 0.52 s (0.14 s), then the `start` notes 523 Hz at 1.00 s and 784 Hz at 1.08 s (0.10 s each) | `src/platform/browserFeedback.ts:34-40` (develop) |
| 17 | Bot "thinking": the O badge breathes, 1.1 s ease-in-out, scale 1 to 0.88 to 1 and opacity 1 to 0.7 to 1 | `src/index.css:357-372` (develop) |
| 18 | Phone view of the splash has **no** glows and no huge faint logo (those exist only on wide screens, in `Backdrop`); the splash is the bare column | `index.css:210-216,238-270`, `Backdrop.tsx` (develop) |
| 19 | Voice-take lengths (`durations.json`): narrator sentences in section 4; bot-01 speech 1.625 s, bot-02 speech 1.533 s | `docs/promo/audio/durations.json` |
| 20 | Music bed `music-dim-light.mp3`: 101.09 s long (ffprobe) | `docs/promo/audio/` |

Do not copy the app's old "Win three." tagline or the domain in `design/og-image.svg`; both are being replaced.

## 1. The lines quoted from the app (exact)

| Use | Exact text | Source |
|---|---|---|
| Splash slogan (shot 0, and again shot 7) | `Three in a row. Zero excuses.` | `Splash.tsx:53` (develop) |
| Bot taunt (shot 2) | `I do this all day.` | `src/lib/banter.ts:202` |
| Bot reaction after losing (shot 3) | `Lucky square.` | `src/lib/banter.ts:182` |
| Achievement name | `Beat the Machine` | `src/lib/achievements.ts:26` |
| Its description | `Beat the bot for the first time` | `src/lib/achievements.ts:27` |
| Toast label | `ACHIEVEMENT UNLOCKED` (uppercase) | `AchievementToast.tsx:34` |
| Tier | bronze `#cd7f32` | `src/lib/achievements.ts:13,25` |

Creative licence unchanged: the bot taunts mid-game for the story; both lines are real, never paraphrased, and both are spoken by the bot's voice while their bubbles show.

---

## 2. Canvas, layout, type and colour spec

### Canvases
- Primary 1080x1920 (9:16). Secondary 1080x1080 (1:1). 30 fps, **1320 frames**, same timing for both. One composition with a `layout` prop (`"reel" | "square"`).

### Safe areas (unchanged)
- 9:16: **nothing essential in y 0-250 or y 1520-1920** (text, board, logo, toast, bubbles, badge, footer). Only the glows may live there.
- Side margins 72 px (9:16), 60 px on all sides (1:1). All essential text at least 28 px tall in both formats.

### Colour (unchanged)
Flat `#0a0a0a` the whole video. Two soft radial glows (X colour top-left, O colour bottom-right, 38%, blurred, drift at most 6% of the canvas over the whole video) run under every shot **including the splash**, for continuity: the video is one room. Do not draw the app's huge faint backdrop logo. Surfaces: tray `#1c1c1c`, tile `#262626`, card/bubble/toast `--card`. Text `--foreground` / `--muted-foreground`. Nothing else coloured except the tier chips and the bronze toast icon.

### Layout anchors (px)
| Element | 9:16 | 1:1 |
|---|---|---|
| Board | 840x840, x 120, y 560-1400 | 620x620, x 230, y 330-950 |
| Title / sub-line zone | y 290-480 | y 60-250 |
| Bubble, thinking badge and toast zone (replaces the title zone) | y 290-470, width 900, x 90 | y 70-250, width 900, x 90 |
| Mode / stat / slogan content zone | y 460-1300 | y 150-930 |
| **Splash stack** (logo, title, slogan), centred x, vertical centre | y 808 (content zone centre 885, lifted 4vh as the app does) | y 497 |
| **Splash footer**, centre y | 1470 (inside the safe area, not at the bottom edge) | 975 |
| Logo + wordmark + URL stack (shot 8), centred | centred on y 860 | centred on y 540 |

### Type (Fredoka Variable "F", Nunito Variable "N"); size 9:16 / 1:1
Unchanged rows from revision 1 apply (title 128/96, sub-line 48/36, bubble 68/52, toast 28/28 label, 56/44 name, 34/30 description, mode headline 112/84, mode sub-label 48/36, `41` 400/280, "achievements to unlock" 60/44, chips 64/48, slogan lines 124/92, wordmark 100/76, URL 44/34). New rows:

| Role | Face, weight | 9:16 | 1:1 | Derivation |
|---|---|---|---|---|
| Splash logo (box side) | | 690 | 517 | App ratio logo 224 : title 41.6 = 5.39; title is 128 / 96 |
| Splash gap logo to title | | 86 | 65 | App `mt-7` 28 px : 41.6 title, scaled |
| Splash gap title to slogan | | 25 | 18 | App `mt-2` 8 px, scaled |
| Splash slogan, `--muted-foreground` | N 700 | 48 | 36 | Same as the sub-line role |
| Splash footer `© 2026 Kaya Randomized`, muted at 70% | N 600 | 32 | 28 | App 12 px, raised to stay legible; 28 px is the floor |
| Thinking badge (O ring, same badge as inside the bubble) | | 120 | 88 | Assumed, see section 10 |
| Shot 8 logo (box side) | | 480 | 320 | Assumed; deliberately smaller than the splash logo so the bookend is an echo, not a repeat |

Fonts from `@fontsource-variable/fredoka` and `@fontsource-variable/nunito`; never a system fallback.

### Motion rules (unchanged, plus)
- Enter easing `Easing.bezier(0.22, 1, 0.36, 1)`. Exits `Easing.bezier(0.4, 0, 1, 1)`, 8 frames. Marks are drawn (dash offset): board O 10 frames, board X two arms of 8 frames each; tile pop 0.9 to 1 over 8 frames. Shot cuts: 8-frame crossfade plus 12 px slide, never wipe, zoom or spin. No camera shake, no parallax, no bounce overshoot, no emoji.
- **New:** the thinking badge enters with a tile-pop style fade (8 frames), breathes one full cycle (33 frames), and exits in 8 frames as the O begins to draw.
- **Exception, the splash exit:** shot 0 leaves with the app's own splash-out, not the standard crossfade: opacity to 0 and scale to 1.03 over 11 frames (360 ms), easing `(0.4, 0, 1, 1)`, `Splash.tsx` / `index.css:435-456`.

---

## 3. Shot list

Frames `start-end`, end exclusive (the next shot starts on it). 30 fps. **Total 1320 frames, 44.00 s.** Voice times are placements; the worker re-times to the real mp3s (section 4).

| Shot | Seconds | Frames | Length (frames) | Length (s) |
|---|---|---|---|---|
| 0 Splash | 0.00-3.60 | 0-108 | 108 | 3.60 |
| 1 Plain board | 3.60-7.50 | 108-225 | 117 | 3.90 |
| 2 It talks back | 7.50-11.20 | 225-336 | 111 | 3.70 |
| 3 You beat it, it unlocks | 11.20-20.70 | 336-621 | 285 | 9.50 |
| 4a Online | 20.70-23.70 | 621-711 | 90 | 3.00 |
| 4b One phone | 23.70-26.10 | 711-783 | 72 | 2.40 |
| 4c The bot | 26.10-29.60 | 783-888 | 105 | 3.50 |
| 5 Forty-one | 29.60-32.80 | 888-984 | 96 | 3.20 |
| 6 Installs, offline, free | 32.80-36.60 | 984-1098 | 114 | 3.80 |
| 7 The slogan | 36.60-39.80 | 1098-1194 | 96 | 3.20 |
| 8 The mark | 39.80-44.00 | 1194-1320 | 126 | 4.20 |

Length against revision 1 (frames): shot 1 114 to 117 (title gone, same board work), shot 2 90 to 111, shot 3 120 to 285, 4a 87 to 90, 4b 51 to 72, 4c 87 to 105, 5 69 to 96, 6 102 to 114, 7 84 to 96, 8 96 to 126, plus the new shot 0 at 108.

### Shot 0: The splash (0.00-3.60 s, frames 0-108)
Faithful to the app's splash in look and order, held longer for a video.

- **On screen:** the bare `#0a0a0a` background with the video's two glows. Stack centred (anchors in section 2): the logo, then `Tic-Tac-Toe`, then the slogan. Footer `© 2026 Kaya Randomized` at the footer anchor. Nothing else: no board, no tiles, no URL.
- **Text (exact):** `Tic-Tac-Toe` (F 600, tracking -0.01em, 128 / 96); `Three in a row. Zero excuses.` (N 700, `--muted-foreground`, 48 / 36); footer `© 2026 Kaya Randomized` (N 600, muted at 70%, 32 / 28), no version number.
- **Motion** (the app's own timings in frames, from `Splash.tsx` and `Logo.tsx`): (1) O draws, frames 0-14 (480 ms); (2) X first arm 16-24, second arm 24-32 (starts at 520 ms, arms 260 ms; the O-gap knockout arm is drawn with the first arm, as `Logo.tsx:56`); (3) title rises 10 px and fades in on the app easing over 13 frames from frame 30 (1000 ms); (4) slogan the same from frame 34 (1140 ms); (5) footer present from frame 0 (the app shows it from the start). Hold with everything on until frame 97; (6) splash-out over frames 97-108 (opacity to 0, scale 1.03).
- **How long it holds, and why:** the app holds 1.8 s total, which leaves the slogan about 0.7 s on screen at full opacity before it fades: too short to read five words on a phone. The video holds the finished splash until frame 97 (3.23 s). The slogan is fully in at frame 47 and stays 50 frames (1.67 s) before the exit, enough to read it twice. Not longer: the splash is a bookend, not the story.
- **Narration:** "Tic-tac-toe." starts at frame 36 (1.20 s), as the title lands (the title rose at frame 30, the voice follows 6 frames after the start-cue notes, so the voice is not on top of them). It ends about frame 64. Then silence over the slogan (music only) until frame 117.
- **Sound:** the app's `splash` cue (fact 16): O tone at frame 0, X tone at frame 16, the two `start` notes at frames 30 and 32. Worker maps them to `tones/move-o.wav`, `tones/move-x.wav`, `tones/start.wav`; no new files. Music starts at frame 0 and fades in over 0.5 s.
- **Thumbnail:** the first frame is the bare background, because the O has not started to draw. Facebook and the owner should use a **cover frame of about frame 90** (complete splash) as the poster/thumbnail.
- **Reduced scope:** no huge faint backdrop logo (fact 18); no version string.

### Shot 1: Plain board (3.60-7.50 s, frames 108-225)
- **On screen:** the splash fades into an empty board (nine `#262626` tiles on the `#1c1c1c` tray). **There is no title here**; the title lived in the splash. At the end: X in the centre cell (4), O in the top-left cell (0).
- **Text:** sub-line `You learned it on a napkin.` (N 700, `--muted-foreground`) rises at frame 117 (3.90 s), exits frames 168-176.
- **Narration:** "You learned it on a napkin." frames 117-155 (1.266 s). The sub-line and the voice start on the same frame.
- **Motion:** (1) nine tiles pop in, 3-frame stagger, from frame 111, under the splash-out; (2) sub-line rise (12 px, 13 frames) at 117; (3) **X draws in cell 4 at frame 162 (5.40 s)**, 16 frames, 7 frames after the voice ends and the sub-line still on screen; (4) **thinking beat:** the O badge enters in the bubble zone at frame 178 (8 frames) and breathes once, frames 178-211; (5) **O draws in cell 0 at frame 212 (7.07 s)**, 10 frames; the badge exits frames 212-220. Gap X to O: 50 frames (1.67 s). Board is held with X and O until frame 225.
- **Sound:** X move tone at frame 162; O move tone at frame 212. No other cue.

### Shot 2: It talks back (7.50-11.20 s, frames 225-336)
- **On screen:** board as left by shot 1. A speech bubble (`--card`, border, radius 40) pops above the board with a tail pointing at the O in cell 0; inside it the O badge (`--player-o` ring) and the line.
- **Text:** `I do this all day.` (F 600, bubble size).
- **Narration:** "Now it talks back." frames 232-264 (1.045 s). Starts 10 frames after the O finishes drawing (222). It must finish before the bot speaks: frames 264-273 are air (9 frames, at least 6 required).
- **Bot voice:** `I do this all day.` from `bot-01.mp3`, frames 273-322 (1.625 s), starting on the frame the bubble pops.
- **Motion:** (1) bubble scales 0.92 to 1 and fades in at frame 273, 8 frames; (2) the badge breathes once from 273 (33 frames); (3) the bubble holds 6 frames after the voice ends and exits frames 328-336, through the shot 2 to 3 crossfade. The bubble is on screen 55 frames (1.83 s).
- **Sound:** none but the voices. Cue-free window: frames 232-322.

### Shot 3: You beat it, it unlocks (11.20-20.70 s, frames 336-621)
- **On screen:** same board continues. Moves in order: X top-right (cell 2) at **frame 348 (11.60 s)**; O top-middle (cell 1) at **frame 400 (13.33 s)** after a thinking beat; X bottom-left (cell 6) at **frame 432 (14.40 s)**, completing the X diagonal 2-4-6. Final board: X at 2, 4, 6; O at 0, 1. Gaps between move starts: 52, 32 frames; with X to O at 1.73 s and O to X at 1.07 s. Nothing is ever closer than 1.0 s.
- **Text:** bubble `Lucky square.`; toast: label `ACHIEVEMENT UNLOCKED`, name `Beat the Machine`, description `Beat the bot for the first time`, bronze `#cd7f32` medal icon (a plain filled ring with a check or the app's Cpu glyph; no new artwork), on `--card`.
- **Narration:** none from frame 264 until 625 (the whole of shot 3). The stretch holds the bot's two lines, the game's sounds, the music.
- **Bot voice:** `Lucky square.` from `bot-02.mp3`, frames 480-526 (1.533 s), with its bubble.
- **Motion:**
  1. X (cell 2) draws frames 348-364. The thinking badge enters at 366 (8 frames), breathes 366-399; O (cell 1) draws 400-410; the badge exits 400-408.
  2. X (cell 6) draws 432-448.
  3. **Win at frame 448 (14.93 s), when the last X stroke finishes:** the winning tiles 2, 4, 6 tint `--player-x-soft` with a 2 px `--player-x` ring at 60% (fact 7), pulse scale 1.055 (19 frames, 3-frame stagger along the line, order 2, 4, 6), and one X/O confetti burst from the board centre (X and O colours only, 33 frames). **No strike line.** The tinted tiles stay for the rest of the shot.
  4. The win is held alone for 32 frames (1.07 s) before anyone speaks.
  5. Bubble `Lucky square.` pops at frame 480 (16.00 s), 8 frames, exits frames 534-542 (on screen 62 frames, the bot's line plus 8 frames). The O badge in it does not breathe.
  6. Toast drops from above its zone at **frame 547 (18.23 s)**, 8 frames, fully on frames 555-621 (66 frames, **2.2 s hold**), on screen 74 frames (2.47 s) in total. It exits upward over frames 621-629 inside the shot 3 to 4 crossfade.
- **Sound:** move tones at frames 348, 400, 432; win jingle at frame 448 (the jingle runs about 13 frames, to about 461); bot voice at frame 480 (no pop tone), 19 frames after the jingle ends; achievement chime at frame 547, 21 frames after the bot's line ends (526). No cue starts inside frames 273-322 or 480-526.

### Shot 4: Three ways to play (20.70-29.60 s, frames 621-888)
The board slides out and down 12 px over frames 621-629 as the first card enters (the toast leaves in the same 8 frames). Three cards, each centred in the content zone, each with a headline, a sub-label and one drawing. Exits are 8-frame crossfades. Each narrator sentence starts at least 4 frames after its card starts (section 4).

**4a Online (20.70-23.70 s, frames 621-711, 90).** Headline `Online`, sub-label `Room code`. Drawing: four tiles in a row spelling `XOXO` as a room-code field (X `--player-x`, O `--player-o`); XOXO cannot be a real code (O is not in the code alphabet). Motion: (1) headline rises at 621; (2) four tiles pop, 4-frame stagger, from frame 633; (3) a second plain phone outline slides in beside the first at frame 657, X and O marks appear on both from 669 and 681 (plain outlines, no device brand). Hold to 711. Sound: four soft ticks (520/660 Hz alternating, 0.07 s) at 633, 637, 641, 645. Narration: "Play a friend online with a room code," frames 625-683.

**4b One phone (23.70-26.10 s, frames 711-783, 72; was 51).** Headline `One phone`, sub-label `Pass it back and forth`. Drawing: one plain phone outline; an X draws on its screen, then an O. Motion: (1) headline rises at 711; (2) X draws at 735 (16 frames); (3) O draws at 751 (10 frames); hold to 783 (22 frames, 0.73 s, with everything on). Sound: X tone at 735, O tone at 751. Narration: "share one phone," frames 717-750. Why more time: a headline, a sub-label of three words and two drawn marks in 1.7 s left no beat after the O.

**4c The bot (26.10-29.60 s, frames 783-888, 105; was 87).** Headline `The bot`, sub-label `Three levels`. Drawing: three pills `Easy`, `Medium`, `Hard` in a row; the O badge steps from pill to pill, each step brighter (O at 50%, 75%, 100% opacity). Motion: (1) headline rises at 783; (2) pills pop, 5-frame stagger, from frame 795; (3) the badge steps at frames 813, 837, 861 (24 frames per step, 0.8 s each); the last state (Hard, 100%) holds frames 861-888 (0.9 s). Sound: three rising O tones (520, 587, 660 Hz, 0.07 s) at 813, 837, 861. Narration: "or take on a bot that gets harder the more you win." frames 787-858. Why more time: three steps at 0.8 s plus pop-in did not fit 2.9 s with any hold on the final state.

### Shot 5: Forty-one (29.60-32.80 s, frames 888-984, 96; was 69)
- **On screen:** huge `41` (F 600) with `achievements to unlock` beneath. A tidy wall of 41 small round chips in tier colours: 16 bronze, 14 silver, 10 gold, 1 platinum (platinum last, 6-frame glow). Chips are the only extra colour in the video.
- **Text:** `41` and `achievements to unlock`.
- **Narration:** "Forty-one achievements to unlock." frames 892-948 (1.87 s).
- **Motion:** (1) numeral scales 0.94 to 1 and fades in at 888 (12 frames); (2) chips pop in rows, 1-frame stagger from frame 900, order bronze, silver, gold, platinum; the platinum chip starts at 940 and lands at 948; (3) platinum glows once, frames 948-954; the full wall holds frames 954-984 (30 frames, 1.0 s). Why more time: with a 1 s hold limit the tier colours were visible for under a second after the wall completed.
- **Sound:** achievement chime once, at frame 940 (platinum chip), quiet under the narrator as in revision 1.

### Shot 6: Installs, offline, free (32.80-36.60 s, frames 984-1098, 114; was 102)
- **On screen:** three pills stacked in the content zone, one per claim, in `--card` with border, a left icon in `--foreground` stroke (home-screen tile, wifi-off line, plain tag; simple line icons only).
- **Text (exact):** `Installs as an app`, `Works offline`, `Free`.
- **Narration:** "Installs as an app, works offline, and it's free." frames 988-1072 (2.786 s).
- **Motion:** pill 1 rises at frame 988; pill 2 on the first word of its clause (target frame 1019); pill 3 on "and it's free" (target frame 1048); each 10 frames, previous pills stay. The worker places pills 2 and 3 from the measured word times in the mp3; the targets assume even pacing. The three pills are all on screen together from 1058 to 1098 (40 frames, 1.33 s); `Free` alone was on screen 1.2 s in revision 1 with no hold after the voice.
- **Sound:** a quiet tick per pill (660 Hz, 0.07 s) at 988, 1019, 1048.

### Shot 7: The slogan (36.60-39.80 s, frames 1098-1194, 96; was 84)
A deliberate echo of the splash: the splash showed the slogan small, silent and muted; here it is large, spoken and coloured. It is the only place the slogan is spoken.
- **On screen:** three X marks in a row on tiles (X X X in `--player-x`, in a single row) above the slogan; slogan in two lines centred.
- **Text (exact):** line 1 `Three in a row.` in `--foreground`; line 2 `Zero excuses.` in `--player-o`. Nothing else.
- **Narration:** "Three in a row. Zero excuses." frames 1102-1156 (1.80 s); "Zero" lands at about frame 1127 (0.847 s in).
- **Motion:** (1) three X marks draw on their tiles, 6-frame stagger from frame 1098, as line 1 rises at 1100; (2) **win by tiles, no strike line:** when the third X completes (frame 1126) the three tiles tint `--player-x-soft` with the `--player-x` ring at 60% and pulse (scale 1.055, 19 frames, 3-frame stagger), exactly as the board win; (3) line 2 rises at 1127 (13 frames) on "Zero". Holds with both lines on from 1140 to 1194 (54 frames, 1.8 s; 38 frames after the voice ends).
- **Sound:** win jingle at frame 1126, under the narrator at the quiet level.

### Shot 8: The mark (39.80-44.00 s, frames 1194-1320, 126; was 96)
A deliberate bookend with the splash: the same O-then-X draw and the same cue; smaller, with the maker's name beneath instead of the game's title.
- **On screen:** the overlapping X and O logo (O first, then X, exactly as `Logo.tsx`) at 480 / 320 px (assumed, section 10), with the wordmark `Kaya Randomized` (F 600) beneath and one quiet URL line under it. Stack centred on the anchor (section 2). The whole video ends on this still, no fade to black.
- **Text:** `Kaya Randomized`; then `tictactoe.kayarandomized.com` (N 700, `--muted-foreground`, 44 / 34, inside the safe area). No other URL, handle, "visit" or "scan".
- **Narration:** "From Kaya Randomized." frames 1232-1277 (1.509 s), then 43 frames (1.43 s) of music tail.
- **Motion:** (1) O draws frames 1194-1208; X arms 1210-1218 and 1218-1226 (the app's real 1.04 s, 32 frames; revision 1's "about 20 frames" is wrong); (2) wordmark rises 12 px starting frame 1230; (3) URL line rises 12 px and fades in over 12 frames from frame 1242 (settled 1254); (4) logo, wordmark and URL ease down together by 4 px over the last 3 s. Everything is on screen from frame 1254 to the end: 66 frames, **2.2 s** (never under 2.0 s; shot 8 may give 6 frames to the narrator if it runs long, never more).
- **Sound:** the `splash` cue as in shot 0: O tone at 1194, X tone at 1210, start notes at 1224 and 1226. Music fades out frames 1275-1320 (1.5 s).

---

## 4. Timing table: narration and bot to shot

Voice takes under `docs/promo/audio/`: `narration.mp3`, `bot-01.mp3`, `bot-02.mp3`. The worker places each sentence separately from `durations.json`; the narration mp3 does not have to play as one piece, so sentences can sit anywhere on the timeline. Lengths below are the measured ones. Placements are start-of-speech.

**Rules for the worker:**
1. Measure each sentence's start and end in its mp3 (they are in `durations.json`; the speech start of each sentence, not the file start). Narrated shots 4a-8 start at least 4 frames before their sentence (placed: 4 to 6); shots 0-3 are as placed.
2. **The bot never overlaps the narrator.** `bot-01` starts at least 6 frames after "Now it talks back." ends (placed: 9). `bot-02` starts on its bubble pop, after the win jingle ends (placed: 19 frames after) and ends 21 frames before the toast's chime.
3. **Voices are not trimmed shorter than their speech.** Trim head and tail silence only; never speed the voice up. If a take is longer than placed here, shorten the bubble hold, not the air before the line.
4. **Shot 8 absorbs slack**, but only down to 60 frames of full-lockup hold (placed: 66). If more is needed, take it from shot 6's final hold.
5. Total stays exactly 1320 frames.

| # | Sentence (exact) | File | Placed frames (s) | Shot |
|---|---|---|---|---|
| 1 | Tic-tac-toe. | narration.mp3 (0.929 s) | 36-64 (1.20-2.13) | 0 |
| 2 | You learned it on a napkin. | narration.mp3 (1.266 s) | 117-155 (3.90-5.17) | 1 |
| 3 | Now it talks back. | narration.mp3 (1.045 s) | 232-264 (7.73-8.80) | 2 |
| bot 1 | I do this all day. | bot-01.mp3 (1.625 s) | 273-322 (9.10-10.73) | 2 |
| bot 2 | Lucky square. | bot-02.mp3 (1.533 s) | 480-526 (16.00-17.53) | 3 |
| gap | no narrator: frames 264-625 (12.0 s); win, toast, bot lines and music only | | 8.80-20.83 | 2-3 |
| 4a | Play a friend online with a room code, | narration.mp3 (1.939 s) | 625-683 (20.83-22.77) | 4a |
| 4b | share one phone, | narration.mp3 (1.092 s) | 717-750 (23.90-25.00) | 4b |
| 4c | or take on a bot that gets harder the more you win. | narration.mp3 (2.368 s) | 787-858 (26.23-28.60) | 4c |
| 5 | Forty-one achievements to unlock. | narration.mp3 (1.870 s) | 892-948 (29.73-31.60) | 5 |
| 6 | Installs as an app, works offline, and it's free. | narration.mp3 (2.786 s) | 988-1072 (32.93-35.73) | 6 |
| 7 | Three in a row. Zero excuses. | narration.mp3 (1.800 s; "Zero" at +0.847 s) | 1102-1156 (36.73-38.53) | 7 |
| 8 | From Kaya Randomized. | narration.mp3 (1.509 s) | 1232-1277 (41.07-42.57) | 8 |

Totals: narrator 16.6 s of speech, bot 3.2 s (1.625 + 1.533); 19.8 s of speech in a 44.0 s film. Narrator voice and bot voice unchanged from revision 1 (Jeni; The Bureaucratic Automaton; ElevenLabs ids as in revision 1; no re-recording).

## 5. Audio plan

Unchanged from revision 1: narrator at 0 dB reference, about -14 LUFS integrated for the final mix, true peak at or below -1 dBTP; bot 2 dB under the narrator, no pitch-shift, no distortion, no smearing reverb; game sounds are the app's own synthesised triangle tones at about -12 dBFS, quieter than the voice; keep them clear of the two bot lines. The key and voice ids are never written into any file other than the ids that revision 1 allows; `promo/.env` is never committed.

Music bed (changed for length): `music-dim-light.mp3`, 101.09 s long. **It covers the 44.00 s film without a loop, extension or re-cut.** Use it from an in-point of 0:00 (or any in-point up to 0:56). Mix about 9 dB under the narrator, ducked a further 4 dB during narration and both bot lines, fades in over 0.5 s, **fades out frames 1275-1320 (42.5-44.0 s)**. Optional, the worker's call: choose the in-point so a beat lands near frame 108 (the board entrance); do not time-stretch the track. Credits unchanged in `CREDITS.md`.

Game sounds, new or changed: the splash cue in shots 0 and 8 (fact 16, built from `move-o.wav`, `move-x.wav`, `start.wav`, no new tones); the `step-587.wav` tone already exists for 4c.

## 6. Sound cue summary

| Frame | Time | Cue |
|---|---|---|
| 0 | 0.00 s | splash cue: O tone (520 Hz); music in |
| 16 | 0.53 s | splash cue: X tone (660 Hz) |
| 30, 32 | 1.00, 1.07 s | splash cue: start notes (523, 784 Hz) |
| 36-64 | 1.20-2.13 s | narrator: "Tic-tac-toe." |
| 117-155 | 3.90-5.17 s | narrator: "You learned it on a napkin." |
| 162 | 5.40 s | X move |
| 212 | 7.07 s | O move |
| 232-264 | 7.73-8.80 s | narrator: "Now it talks back." |
| 273-322 | 9.10-10.73 s | bot voice: `I do this all day.` (with its bubble) |
| 348 | 11.60 s | X move |
| 400 | 13.33 s | O move |
| 432 | 14.40 s | X move |
| 448 | 14.93 s | win jingle |
| 480-526 | 16.00-17.53 s | bot voice: `Lucky square.` (with its bubble) |
| 547 | 18.23 s | achievement chime |
| 625-683 | 20.83-22.77 s | narrator: 4a |
| 633-645 | 21.10-21.50 s | four ticks (4a) |
| 717-750 | 23.90-25.00 s | narrator: 4b |
| 735, 751 | 24.50, 25.03 s | X move, O move (4b) |
| 787-858 | 26.23-28.60 s | narrator: 4c |
| 813, 837, 861 | 27.10, 27.90, 28.70 s | three rising O tones (4c) |
| 892-948 | 29.73-31.60 s | narrator: "Forty-one achievements to unlock." |
| 940 | 31.33 s | achievement chime (platinum chip) |
| 988-1072 | 32.93-35.73 s | narrator: "Installs as an app, works offline, and it's free." |
| 988, 1019, 1048 | 32.93, 33.97, 34.93 s | tick per pill |
| 1102-1156 | 36.73-38.53 s | narrator: slogan |
| 1126 | 37.53 s | win jingle (third X) |
| 1194, 1210, 1224, 1226 | 39.80, 40.33, 40.80, 40.87 s | splash cue (shot 8) |
| 1232-1277 | 41.07-42.57 s | narrator: "From Kaya Randomized." |
| 1275-1320 | 42.50-44.00 s | music fades out |

## 7. Must not

Every item of revision 1's section 7 stands unchanged, and applies to the splash and to every new frame:

1. No owner name, personal handle or email anywhere (screen, file names, metadata, caption). The only domain allowed is `tictactoe.kayarandomized.com`, as the one line in shot 8 and in the caption; the old domain in `design/og-image.svg` is not used.
2. No real room codes; the only code shown is `XOXO`. No QR code, link or invite URL beyond the one shot 8 line.
3. No claims beyond the script: no player counts, ratings, "#1", "no ads", "no sign-up", store badges, prices beyond "Free", or the words "unbeatable", "AI" or "multiplayer".
4. No "Win three." tagline. The slogan is `Three in a row. Zero excuses.` only.
5. No third-party logos, no phone brand.
6. No stock footage, photographs, emoji or hands.
7. No other game's board skin, sounds or characters; sounds are the app's own tones.
8. No essential text or objects in the top 250 px or bottom 400 px of the 9:16 render. This now includes the splash footer (placed at y 1470).
9. No burned-in running subtitles.
10. No fade to black and no end-card call to action; the URL appears only as shot 8's quiet line.
11. The bot says nothing beyond the two quoted lines and never speaks over the narrator.
12. No API key, key fragment or `.env` content in any file, log, render or report.

Added in revision 2:
13. The splash shows **no version number** (`v{version}`) and no other app chrome; only the logo, title, slogan and the `© 2026 Kaya Randomized` footer.
14. **No strike line** anywhere; a win is the tinted, pulsing tiles (shots 3 and 7).
15. The title `Tic-Tac-Toe` appears once on screen (shot 0) and the slogan twice (shots 0 and 7, deliberately). No other repeated element except the shot 0 and shot 8 logo draw.

## 8. Done when (checks a verifier can make by watching the renders)

1. Both renders exist: 1080x1920 and 1080x1080, 30 fps, **exactly 1320 frames (44.00 s)** each, with audio.
2. Frames 0-108: a bare dark background, an O draws, then an X across it (done by about 1.1 s), then `Tic-Tac-Toe` and beneath it `Three in a row. Zero excuses.`, with `© 2026 Kaya Randomized` at the foot and no version number; the slogan is fully visible for at least 1.5 s before it fades; a short tone sequence plays at the start and the narrator says "Tic-tac-toe." as the title appears. The poster frame near frame 90 shows the complete splash.
3. From about 3.6 s a plain empty board appears with no title on it; the sub-line `You learned it on a napkin.` shows with the voice; then X in the centre at about 5.4 s.
4. Before the first O (about 6-7 s) a plain O badge breathes once above the board; the O lands in the top-left at about 7.1 s. No move in the film starts less than 1.0 s after the previous one.
5. Around 9.1 s a speech bubble reads exactly `I do this all day.` for at least 1.7 s, with the bot's voice, after "Now it talks back." has ended.
6. Around 14.9 s X completes the diagonal (top-right, centre, bottom-left); the three winning tiles tint and pulse and X/O confetti bursts once; **there is no strike line**; the highlighted tiles stay on screen for the rest of shot 3.
7. At about 16.0 s a bubble reads exactly `Lucky square.` with the bot's voice, at least 0.5 s after the win jingle has ended, and the highlighted tiles are visible behind it.
8. At about 18.2 s a toast reads `ACHIEVEMENT UNLOCKED` / `Beat the Machine` / `Beat the bot for the first time`, the chime sounds at that moment, and the toast is fully legible for at least 2.0 s.
9. Between 20.7 and 29.6 s three cards appear in order: Online with the code `XOXO`; One phone; The bot with `Easy`, `Medium`, `Hard`, with the last state held at least 0.8 s.
10. `41` appears with `achievements to unlock` and a chip wall visibly split into four tier colours at about 29.6-32.8 s, and the finished wall holds at least 1.0 s.
11. The three pills read exactly `Installs as an app`, `Works offline`, `Free`, in that order, and all three are on screen together for at least 1.2 s.
12. The slogan reads exactly `Three in a row.` / `Zero excuses.` at about 36.6-39.8 s over three X tiles that tint, with no strike line, and both lines hold at least 1.5 s.
13. The video ends on the overlapping X and O logo (drawn in O then X as in shot 0, at a smaller size) with `Kaya Randomized` and, beneath it, `tictactoe.kayarandomized.com`; the final frame shows all three; they are all visible for at least 2.0 s; the narrator's last words are "From Kaya Randomized."; the last frame is not black.
14. In the 9:16 render, pause on five random frames **including one in the splash and one at the splash footer**: nothing essential inside y 0-250 or y 1520-1920, all text at least 28 px tall. A search of every frame finds no owner name, no real-looking room code, no version string, no strike line, and no URL other than `tictactoe.kayarandomized.com` in shot 8.
15. The bot's two lines are audible in a voice clearly different from the narrator, at about 9.1 s and 16.0 s; each plays with its own bubble; neither overlaps the narrator or a game sound; "Now it talks back." ends at least 6 frames before the first bot line; the bot says nothing else.
16. The music covers the whole film, fades in at the start and out over the last 1.5 s, and there is no seam, loop point or silence.

## 9. Resolved and open

Resolved (owner, 2026-10-01): viewers go to `tictactoe.kayarandomized.com`; one quiet line in shot 8; the post caption carries the same link. Also resolved by the owner: splash at the start, no 30 s cap, game portion slowed.

Open decisions for the owner (none blocks the build; each shows the default used):

1. **A narrator line over the achievement toast.** The narrator is silent for 12.0 s (frames 264-625) while the game plays. This is deliberate (the bot, the win and the toast carry it), but it is long. If the owner wants a voice there, proposed new wording, to sit at about frame 570 over the toast hold: "Beat it, and you unlock an achievement." (about 2 s; the owner would approve it and have it generated once). **Default: no new narration.** Recommendation: leave silent.
2. **Length.** 44.0 s uses the steer's upper edge. If the owner wants about 42 s, the cleanest 2 s to give back are the splash hold (3.6 s to 3.0 s, slogan still on screen 1.1 s) and shot 6's final hold. Default: 44.0 s. Recommendation: keep 44.0 s; the readability holds are what he asked for.
3. **Splash footer.** The video shows `© 2026 Kaya Randomized`. The app also shows `v{version}`; it is dropped because a version string is noise to a viewer. Default: dropped. Recommendation: keep dropped.

## 10. Assumptions and unverified items (for the worker's attention)

1. **Thinking badge size and position**: 120 / 88 px, centred in the bubble zone. Revision 1 gave the bubble's O badge no size; the badge is the same drawing as inside the bubble. Not in an app file.
2. **Shot 8 logo size** 480 / 320 px and the stack gaps; revision 1 gave none. The splash logo is the larger one by design.
3. **Splash stack sizes** are the app's ratios scaled to the video's title size; the footer is raised from the app's 12 px to 32 / 28 px for legibility and moved up into the safe area.
4. **Pill 2 and 3 frames** in shot 6, and the exact chip rows in shot 5, are even-pacing targets; the worker aligns them to the measured words.
5. The bot-02 and bot-01 hold times assume trimming only silence at head and tail; the measured speech spans in `durations.json` are used as-is.
6. The splash cue is the app's `splash` cue; the worker should confirm the three wav files line up with the notes in fact 16 (frames 0, 16, 30, 32).
