# Tic-Tac-Toe promo video: storyboard and design brief

Concept: **"It talks back."** 30.0 s, 900 frames, 30 fps. Built in Remotion by a worker from this file.
Brand on screen: **Kaya Randomized** only. Slogan: **"Three in a row. Zero excuses."**

Mode: Persuade (a short film that earns a tap). Sound-off first: Facebook plays muted, so every claim in the
script also appears as on-screen text, and the voice-over adds to it rather than carrying it alone.

Direction in three lines: the game's own dark room (flat `--background`, tiles, Fredoka headings), so the video
looks like the product; X in `--player-x` and O in `--player-o` are the only colour besides the bronze toast and
the tier chips; every move is a drawn stroke or a tile pop on the app's own easing, nothing else decorates.

---

## 0. Source facts the worker may rely on

| Fact | Source |
|---|---|
| Fonts: Fredoka Variable (headings, buttons), Nunito Variable (text) | `src/index.css:10-11` |
| Dark tokens: `--background` oklch(0.145 0 0), `--card` oklch(0.205 0 0), `--secondary` oklch(0.269 0 0), `--foreground` oklch(0.985 0 0), `--muted-foreground` oklch(0.708 0 0), `--border` oklch(1 0 0 / 10%) | `src/index.css:106-122` |
| `--player-x` oklch(0.78 0.13 264), `--player-x-soft` oklch(0.3 0.055 264), `--player-o` oklch(0.79 0.13 42), `--player-o-soft` oklch(0.3 0.055 42) | `src/index.css:138-141` |
| Hex equivalents already used in the current social image (use these in Remotion): background `#0a0a0a`, tray `#1c1c1c`, tile `#262626`, X `#8fa8ff`, O `#ff9f7a`, text `#fafafa`, muted `#a1a1a1` (approximate for `--muted-foreground`) | `design/og-image.svg:3-30` |
| Easing used everywhere in the app: `cubic-bezier(0.22, 1, 0.36, 1)` (Remotion: `Easing.bezier(0.22, 1, 0.36, 1)`) | `src/index.css:390,395,399` |
| Board: rounded tiles on a tray, gap about 2.5% of the board width; X and O are drawn strokes (round caps), not glyphs; win = strike line plus tile pulse (scale 1.055, 620 ms) plus X/O confetti burst | `src/index.css:375-405,499-520` |
| Logo: O (bottom-right) and X (top-left) overlapping; geometry in a 512 box: stroke 44, X centre (200,200) arm 90, O centre (330,330) radius 90, 9-unit background gap around the X arm where it crosses the ring. O draws first, then the X | `src/lib/logo.ts:8-17`, `src/components/Logo.tsx` |
| Achievement toast: card with 1 px border, radius 18, tier icon left, label "Achievement unlocked" (small caps, muted), achievement name in Fredoka semibold; drops in from the top, 280 ms | `src/components/AchievementToast.tsx:27-35`, `src/index.css:407` |
| Difficulty labels: Easy, Medium, Hard | `src/components/SetupScreen.tsx:67-69` |
| Room code: 4 characters, alphabet excludes O, I, L, 0, 1 | `src/lib/room.ts:4-5` |
| 41 achievements: 16 bronze, 14 silver, 10 gold, 1 platinum (counted from the catalogue) | `src/lib/achievements.ts:20-90`; README says "Forty-one" |
| Tier colours: bronze `#cd7f32`, silver `#b8c0c8`, gold `#f2c14e`, platinum `#9fe3ff` | `src/lib/achievements.ts:12-17` |

Do not copy the app's current "Win three." tagline or the domain in `design/og-image.svg`; both are being replaced.

## 1. The two lines quoted from the app (exact)

| Use | Exact text | Source |
|---|---|---|
| Bot taunt (shot 2) | `I do this all day.` | `src/lib/banter.ts:202` (COCKY, medium, loss pool) |
| Bot reaction after losing (shot 3) | `Lucky square.` | `src/lib/banter.ts:182` (COCKY, medium, win pool) |
| Achievement name (shot 3) | `Beat the Machine` | `src/lib/achievements.ts:26` |
| Its description line | `Beat the bot for the first time` | `src/lib/achievements.ts:27` |
| Toast label | `Achievement unlocked` | `src/components/AchievementToast.tsx:34` (the app sets it uppercase; keep uppercase) |
| Tier of the unlock | bronze, `#cd7f32` | `src/lib/achievements.ts:13,25` |

Creative licence, stated plainly: in the app the bot speaks after a game; here the taunt is shown mid-game for the
story. Both lines are real lines from the same pool. Do not paraphrase them. Both are also **spoken** by the bot's own
voice (section 4), exactly as written, while their bubbles show.

---

## 2. Canvas, layout, type and colour spec

### Canvases
- Primary 1080x1920 (9:16). Secondary 1080x1080 (1:1). 30 fps, 900 frames, same timing for both.
- One composition with a `layout` prop (`"reel" | "square"`). Same shots, same timings; only the anchors and sizes below change.

### Safe areas
- 9:16 (Facebook reels): **nothing essential in y 0-250 or y 1520-1920**. "Essential" = any text, the board, the logo, the toast, bubbles. Only the background glows may live there.
- Side margins 72 px in both formats. All essential text at least 28 px tall in both formats (small phone, muted playback).
- 1:1: 60 px margin on all four sides.

### Colour
- Background: flat `--background` (`#0a0a0a`) the whole video. Two soft radial glows, as in `src/index.css:240-259`: one `--player-x` at 38% behind the top-left, one `--player-o` at 38% behind the bottom-right, blurred, drifting slowly (at most 6% of the canvas over the whole video). In the 9:16 the glows sit in the unsafe top and bottom bands so they fill them. No gradients on text, no other decoration.
- Surfaces: tray `#1c1c1c`, tile `#262626`, card/bubble/toast `--card` (`#171717` approx.), border `--border`.
- Text: `--foreground` primary, `--muted-foreground` secondary. X marks `--player-x`, O marks `--player-o`. Nothing else is coloured except the tier chips in shot 5 and the bronze toast icon.

### Layout anchors (px)
| Element | 9:16 | 1:1 |
|---|---|---|
| Board (square, tray + 9 tiles) | 840x840, x 120, y 560-1400 | 620x620, x 230, y 330-950 |
| Title / sub-line zone | y 290-480 | y 60-250 |
| Bubble and toast zone (above board, replaces the title zone) | y 290-470, width 900, x 90 | y 70-250, width 900, x 90 |
| Mode / stat / slogan content zone | y 460-1300 | y 150-930 |
| Logo + wordmark (shot 8) | centred on y 860 | centred on y 540 |

### Type (Fredoka Variable "F", Nunito Variable "N"); size 9:16 / 1:1
| Role | Face, weight | 9:16 | 1:1 |
|---|---|---|---|
| Title "Tic-Tac-Toe" | F 600, tracking -0.01em | 128 | 96 |
| Sub-line, labels, descriptions | N 700 | 48 | 36 |
| Bubble text | F 600 | 68 | 52 |
| Toast label (uppercase, tracking 0.05em, muted) | N 600 | 28 | 28 |
| Toast name | F 600 | 56 | 44 |
| Toast description (muted) | N 600 | 34 | 30 |
| Mode headline ("Online", "One phone", "The bot") | F 600 | 112 | 84 |
| Mode sub-label ("Room code", etc.) | N 700 | 48 | 36 |
| Big numeral "41" | F 600 | 400 | 280 |
| "achievements to unlock" | N 700 | 60 | 44 |
| Chips ("Installs as an app", "Works offline", "Free") | F 600 | 64 | 48 |
| Slogan lines | F 600, line-height 1.05 | 124 | 92 |
| Wordmark "Kaya Randomized" | F 600 | 100 | 76 |
| URL line (shot 8 only), `--muted-foreground` | N 700 | 44 | 34 |

Load both fonts from `@fontsource-variable/fredoka` and `@fontsource-variable/nunito` (already project dependencies) or
the Google Fonts equivalents; never fall back to a system font in the render.

### Motion rules
- Easing for every enter: `Easing.bezier(0.22, 1, 0.36, 1)`. Exits: `Easing.bezier(0.4, 0, 1, 1)`, 8 frames.
- Marks are **drawn** (stroke-dashoffset), 10 frames each; X is two arms of 8 frames, second arm after the first. Tile pop: scale 0.9 to 1, 8 frames.
- Cuts between shots are 8-frame crossfade-plus-slide (content out 12 px, next in 12 px), never a wipe, zoom or spin.
- 2-4 moves per shot, listed in each shot. No camera shake, no parallax, no bounce overshoot, no emoji.

---

## 3. Shot list

Frames are `start-end` where end is exclusive (next shot starts on it). Times in seconds at 30 fps.
Narration and bot times are the **target**; the worker re-times them to the real mp3s (section 4).

Shot summary (900 frames total):

| Shot | Seconds | Frames | Length |
|---|---|---|---|
| 1 Plain board | 0.00-3.80 | 0-114 | 114 |
| 2 It talks back | 3.80-6.80 | 114-204 | 90 |
| 3 You beat it, it unlocks | 6.80-10.80 | 204-324 | 120 |
| 4 Three ways to play | 10.80-18.30 | 324-549 | 225 |
| 5 Forty-one | 18.30-20.60 | 549-618 | 69 |
| 6 Installs, offline, free | 20.60-24.00 | 618-720 | 102 |
| 7 The slogan | 24.00-26.80 | 720-804 | 84 |
| 8 The mark | 26.80-30.00 | 804-900 | 96 |

### Shot 1: Plain board (0.00-3.80 s, frames 0-114)
- **On screen:** empty board (nine `#262626` tiles on the `#1c1c1c` tray). At the end, X in the centre cell (4) and O in the top-left cell (0).
- **Text:** `Tic-Tac-Toe` (title, F 600) at 0.4 s; sub-line `You learned it on a napkin.` (N 700, `--muted-foreground`) at 1.9 s. Both exit at 3.6 s.
- **Narration:** "Tic-tac-toe." (0.5-1.5) "You learned it on a napkin." (1.8-3.6)
- **Motion:** (1) nine tiles pop in, 3-frame stagger, from frame 6; (2) title rises 12 px and fades in at frame 12, sub-line same at frame 57; (3) X draws in cell 4 at 2.2 s (frame 66); (4) O draws in cell 0 at 3.0 s (frame 90).
- **Sound:** start cue at 0.3 s (523 Hz, 784 Hz); X move tone at 2.2 s; O move tone at 3.0 s (notes in section 6).

### Shot 2: It talks back (3.80-6.80 s, frames 114-204)
- **On screen:** board as left by shot 1 (X centre, O top-left). A speech bubble (`--card`, border, radius 40) pops above the board with a small tail pointing at the O in cell 0. Inside: an O badge (`--player-o` ring) and the line.
- **Text:** `I do this all day.` (F 600, bubble size)
- **Narration:** "Now it talks back." (3.9-5.3, frames 117-159). It must finish before the bot speaks, with at least 6 frames of air.
- **Bot voice:** `I do this all day.` from `bot-01.mp3`, target 5.5-6.7 s (frames 165-201, about 1.2 s), starting on the frame the bubble pops. Start frame = narrator's last frame + at least 6.
- **Motion:** (1) bubble scales 0.92 to 1 and fades in at 5.5 s (frame 165), 8 frames, on the first frame of the bot's voice; (2) the O badge does the app's "thinking" breath once (scale 1 to 0.88 to 1, 1.1 s, `src/index.css:357-372`); (3) bubble exits at 6.7 s (frame 201), 8 frames, as the bot's line ends; the exit runs through the shot 2 to 3 crossfade.
- **Sound:** no pop tone; the bot's voice is the sound of the bubble. The text is for sound-off viewers. Between frames 117-159 only the narrator speaks; frames 159-165 are air.

### Shot 3: You beat it, it unlocks (6.80-10.80 s, frames 204-324)
- **On screen:** same board continues. Moves in order: X top-right (cell 2) at 6.90 s (frame 207); O top-middle (cell 1) at 7.20 s (frame 216); X bottom-left (cell 6) at 7.50 s (frame 225) completes the X diagonal 2-4-6. Final board: X at 2, 4, 6; O at 0, 1.
- **Text:** bubble `Lucky square.` (8.0-9.0 s); toast: label `ACHIEVEMENT UNLOCKED`, name `Beat the Machine`, description `Beat the bot for the first time`, bronze `#cd7f32` medal icon (a plain filled ring with a check or the app's Cpu glyph; no new artwork), toast on `--card`.
- **Narration:** none. The narrator is silent from 5.3 s to 11.0 s; this stretch holds the bot's two lines, the music and the game's own sounds.
- **Bot voice:** `Lucky square.` from `bot-02.mp3`, target 8.0-8.93 s (frames 240-268, about 0.9 s), playing with its bubble inside the quiet after the win (the win jingle has ended at frame 239).
- **Motion:** (1) three marks draw as above; (2) win moment at frame 226: strike line draws along 2-4-6 in `--player-x` (15 frames), the three winning tiles pulse (scale 1.055, 19 frames), a single X/O confetti burst from the board centre (X and O colours only, 1.1 s, as `src/index.css:499-520`); (3) bubble `Lucky square.` pops at 8.0 s (frame 240), exits at 9.0 s (frame 270, 8 frames); (4) toast drops from above its zone at 9.27 s (frame 278), 8 frames, holds 1.0 s (frames 286-316), exits upward over frames 316-324.
- **Sound:** move tones at 207, 216, 225; win jingle at frame 226 (523, 659, 784, 1047 Hz); bot voice at frame 240 (no pop tone); achievement chime at frame 278 (784, 1175 Hz), after the bot's line has finished.

### Shot 4: Three ways to play (10.80-18.30 s, frames 324-549)
The board slides out and down 12 px over frames 324-332 as the first card enters. Three cards flash by, each centred in the content zone, each with a headline, a sub-label and one drawing. Card exits are 8-frame crossfades.

**4a Online (10.80-13.70 s, frames 324-411).** Headline `Online`, sub-label `Room code`. Drawing: four tiles in a row spelling `XOXO` (X in `--player-x`, O in `--player-o`), as a room-code field. XOXO cannot be a real code (O is not in the code alphabet), so this is safe. Motion: (1) headline rises; (2) four tiles pop with 4-frame stagger; (3) a small second-phone outline slides in beside the first, X and O marks appear on both (the "two phones" idea, plain outlines, no device brand). Sound: four soft ticks (520/660 Hz alternating, 0.07 s).
Narration: "Play a friend online with a room code," (11.0-13.8).

**4b One phone (13.70-15.40 s, frames 411-462).** Headline `One phone`, sub-label `Pass it back and forth`. Drawing: a single plain phone outline; an X draws on its screen, then an O. Motion: (1) headline rises; (2) X draws; (3) O draws. Sound: X tone then O tone.
Narration: "share one phone," (13.8-15.4).

**4c The bot (15.40-18.30 s, frames 462-549).** Headline `The bot`, sub-label `Three levels`. Drawing: three pills `Easy`, `Medium`, `Hard` in a row (labels from the app's own segmented control), the O badge stepping from pill to pill, each step brighter (O at 50% to 75% to 100% opacity). Motion: (1) headline rises; (2) pills pop with 5-frame stagger; (3) O badge steps across, one step per 0.8 s. Sound: three rising O tones (520, 587, 660 Hz, 0.07 s).
Narration: "or take on a bot that gets harder the more you win." (15.4-18.2).

### Shot 5: Forty-one (18.30-20.60 s, frames 549-618)
- **On screen:** huge `41` (F 600) with `achievements to unlock` beneath. Behind/around it a tidy wall of 41 small round chips in tier colours: 16 bronze, 14 silver, 10 gold, 1 platinum (platinum last, with a 6-frame glow). Chips are the only extra colour in the video.
- **Text:** `41` and `achievements to unlock`.
- **Narration:** "Forty-one achievements to unlock." (18.5-20.4)
- **Motion:** (1) numeral scales 0.94 to 1, fades in; (2) chips pop in rows with 1-frame stagger (about 1 s total) in order bronze, silver, gold, platinum; (3) platinum chip glows once.
- **Sound:** achievement chime once, at the platinum chip.

### Shot 6: Installs, offline, free (20.60-24.00 s, frames 618-720)
- **On screen:** three pills stacked in the content zone, one per claim, in `--card` with border, left icon drawn in `--foreground` stroke (home-screen tile, wifi-off line, plain tag; simple line icons only).
- **Text (exact):** `Installs as an app`, `Works offline`, `Free`
- **Narration:** "Installs as an app, works offline, and it's free." (20.7-23.8)
- **Motion:** (1) pill 1 rises at 20.7 s (frame 621); (2) pill 2 at 21.8 s (frame 654); (3) pill 3 at 22.8 s (frame 684); each 10 frames; previous pills stay.
- **Sound:** a quiet tick per pill (660 Hz, 0.07 s).

### Shot 7: The slogan (24.00-26.80 s, frames 720-804)
- **On screen:** three marks in a row (X X X in `--player-x`, drawn on tiles in a single row) above the slogan; strike line through them; slogan in two lines centred.
- **Text (exact):** line 1 `Three in a row.` in `--foreground`; line 2 `Zero excuses.` in `--player-o`. Nothing else.
- **Narration:** "Three in a row. Zero excuses." (24.2-26.6)
- **Motion:** (1) three X marks draw, 6-frame stagger, as line 1 rises; (2) strike line draws through the row as "Three in a row." completes; (3) line 2 rises on the beat of "Zero".
- **Sound:** win jingle at the strike.

### Shot 8: The mark (26.80-30.00 s, frames 804-900)
- **On screen:** the overlapping X and O logo (O draws first, then X, exactly as the splash does, `src/components/Logo.tsx`) with the wordmark `Kaya Randomized` beneath in Fredoka 600, and one quiet URL line under the wordmark. Quiet, nothing else. Holds to the last frame (3.2 s, never under 2.0 s). The whole video ends on this still, no fade to black.
- **Text:** `Kaya Randomized`, then one line under it, exact text `tictactoe.kayarandomized.com` (Nunito 700, `--muted-foreground`, 44 px in 9:16 and 34 px in 1:1, inside the safe area). No other URL, no handle, no "visit" or "scan"; see section 7.
- **Narration:** "From Kaya Randomized." (27.0-28.7). Then about 1.3 s of music tail.
- **Motion:** (1) O draws, then X (about 20 frames); (2) the wordmark rises 12 px, starting at frame 834; (3) the URL line rises 12 px and fades in over 12 frames, starting at frame 846 (right after the wordmark settles), and is held to the last frame; (4) logo, wordmark and URL line ease down together by 4 px over the last 3 s (barely perceptible, so the hold does not look frozen).
- **Sound:** start cue (523, 784 Hz) as the X completes; music fades out from 28.5 s to 30.0 s.

---

## 4. Timing table: narration and bot to shot

Target times for the voice takes (the real mp3s will differ). Two voices, three files, all under `docs/promo/audio/`:
`narration.mp3` (narrator), `bot-01.mp3` and `bot-02.mp3` (the bot, one line each).

**Rules for the worker:**
1. Measure each sentence's start and end in its mp3. Place each narrated shot's start on its sentence's start minus 4 frames (shots 1 and 2 as in the table).
2. **The bot never overlaps the narrator.** `bot-01` starts at least 6 frames after "Now it talks back." ends, on the frame its bubble pops. `bot-02` starts on its bubble's pop, after the win jingle has ended, and ends before the toast's chime.
3. Growth budget: shot 2 may grow to at most 90 frames (it grew 36 over the first draft) and shot 3 to at most 120 (grew 18). If a real bot mp3 is longer than its target (1.2 s and 0.9 s), trim silence at its head and tail first; never speed the voice up. If it still does not fit, shorten the bubble hold, not the air before the first line.
4. **Shot 8 absorbs any remaining slack** (minimum 60 frames, i.e. 2.0 s, of the logo hold; now 96 frames). If more is needed, take it from shot 6. The narrator's silence from 5.3 s to 11.0 s is deliberate (shots 2 and 3 hold the bot's lines); if the narration take has no gap, place sentence 4a so it starts at 11.0 s. If the narrator's speech plus the gap exceeds 27.5 s, tighten wording in the script (allowed; keep every claim and the slogan) rather than speeding the voice. The slogan shot must end no later than 28.0 s (frame 840) so the hold stays at 2.0 s or more. Total must stay exactly 900 frames.

| # | Sentence (exact) | File | Target time | Shot | Shot frames |
|---|---|---|---|---|---|
| 1 | Tic-tac-toe. | narration.mp3 | 0.5-1.5 s | 1 | 0-114 |
| 2 | You learned it on a napkin. | narration.mp3 | 1.8-3.6 s | 1 | 0-114 |
| 3 | Now it talks back. | narration.mp3 | 3.9-5.3 s | 2 | 114-204 |
| bot 1 | I do this all day. | bot-01.mp3 | 5.5-6.7 s | 2 | 114-204 |
| bot 2 | Lucky square. | bot-02.mp3 | 8.0-8.93 s | 3 | 204-324 |
| gap | (no narrator; win, toast, music) | | 5.3-11.0 s | 2-3 | |
| 4a | Play a friend online with a room code, | narration.mp3 | 11.0-13.8 s | 4a | 324-411 |
| 4b | share one phone, | narration.mp3 | 13.8-15.4 s | 4b | 411-462 |
| 4c | or take on a bot that gets harder the more you win. | narration.mp3 | 15.4-18.2 s | 4c | 462-549 |
| 5 | Forty-one achievements to unlock. | narration.mp3 | 18.5-20.4 s | 5 | 549-618 |
| 6 | Installs as an app, works offline, and it's free. | narration.mp3 | 20.7-23.8 s | 6 | 618-720 |
| 7 | Three in a row. Zero excuses. | narration.mp3 | 24.2-26.6 s | 7 | 720-804 |
| 8 | From Kaya Randomized. | narration.mp3 | 27.0-28.7 s | 8 | 804-900 |

Totals (targets): narrator 20.5 s, bot 2.1 s (1.2 + 0.9), narrated plus bot 22.6 s of speech in a 30.0 s film.

Narrator voice: "Jeni", female, upbeat, conversational, warm, a little dry on "Now it talks back." (ElevenLabs, generated once as `narration.mp3`, committed under `docs/promo/audio/`). Voice-over is 0 dB reference, target about -14 LUFS integrated for the final mix, true peak at or below -1 dBTP.
Bot voice: "The Bureaucratic Automaton", male, monotone, expressionless (ElevenLabs, generated once as two short mp3s, `bot-01.mp3` and `bot-02.mp3`, same folder). It says only the two quoted lines, with no added words, no laugh, no breath effects.

## 5. Audio plan

- **Narrator:** as above, one mp3, never regenerated per format.
- Reference: the owner's benchmark reel keeps the music close under the voice and uses two music-only breaths (after the hook and after the name reveal); our win moment in shot 3 is that breath.
- **Bot voice:** two mp3s, never regenerated per format. Level **2 dB under the narrator**, same -14 LUFS target (true peak at or below -1 dBTP) for the final mix as a whole. A touch of narrowband EQ (a gentle band-limit for a speaker-box feel) or none is the worker's call; nothing that makes the line unintelligible (check it at phone-speaker level). No pitch-shift, no distortion, no reverb that smears the words.
- **Generation (worker):** the two voices are generated once through the ElevenLabs API by a small script in `promo/`. Environment variable names, read from `promo/.env` (git-ignored; never committed, never printed, never written into any file or the render):
  - `ELEVENLABS_API_KEY` (the key; its value is never recorded anywhere)
  - `ELEVENLABS_VOICE_NARRATOR`: Jeni, id `0AqGYCQmBK5Md93Th9nF` (data, not a secret)
  - `ELEVENLABS_VOICE_BOT`: The Bureaucratic Automaton, id `FcdNCa372eKyUhVenTHS` (data, not a secret)

  If `promo/.env` or a variable is missing, stop and report it; do not hard-code a key or fall back to another voice. Commit the generated mp3s, not the script's secrets.
- **Music bed:** one royalty-free track from Pixabay (no attribution required), calm, light, about 90-100 BPM, no vocals, no drop. Mixed about 9 dB under the narrator (about -23 LUFS alone), ducked a further 4 dB during narration and during both bot lines, fades in over 0.5 s, fades out 28.5-30.0 s. Record the track title, author and Pixabay URL in `docs/promo/audio/CREDITS.md` so the licence is traceable even though no on-screen credit is needed.
- **Game sounds:** **not found as files.** `public/` holds only icons, manifest, `og-image.png`, `sw.js`; no `.mp3/.wav/.ogg` anywhere in `public/` or `src/`. The app synthesises its sounds with triangle-wave oscillators (`src/platform/browserFeedback.ts:15-41`). The worker should render those exact notes offline to short wav files (triangle wave, short attack and release, about -12 dBFS, quieter than the voice):
  - move X 660 Hz / 0.07 s; move O 520 Hz / 0.07 s (`browserFeedback.ts:19`)
  - win: 523, 659, 784, 1047 Hz, 0.09 s apart, 0.16 s each (`:21`)
  - achievement: 784, 1175 Hz, 0.10 s apart, 0.18 s each (`:33`)
  - start: 523, 784 Hz, 0.08 s apart, 0.10 s each (`:27`)
  Mix them at roughly the level of the music bed or just above, never over either voice; keep them clear of the two bot lines (no cue starts inside frames 165-201 or 240-268).

## 6. Sound cue summary

| Time | Cue |
|---|---|
| 0.3 s | start |
| 2.2 s, 3.0 s | X move, O move |
| 3.9-5.3 s | narrator: "Now it talks back." |
| 5.5-6.7 s | bot voice: `I do this all day.` (with its bubble) |
| 6.9 s, 7.2 s, 7.5 s | X move, O move, X move |
| 7.53 s | win |
| 8.0-8.93 s | bot voice: `Lucky square.` (with its bubble) |
| 9.27 s | achievement |
| 10.8-18.3 s | ticks per card (4a, 4b, 4c) |
| 19.6 s | achievement (platinum chip) |
| 20.7, 21.8, 22.8 s | tick per pill |
| 24.8 s | win (strike) |
| 27.8 s | start (logo complete) |

## 7. Must not

1. No owner name, personal handle or email anywhere (on screen, file names, metadata, caption); the only domain allowed is `tictactoe.kayarandomized.com`, as the one line in shot 8 and in the caption; the owner's old domain in `design/og-image.svg` is not used.
2. No real room codes. The only code shown is `XOXO` (cannot exist). No QR code, no link, no invite URL; the one allowed exception is the `tictactoe.kayarandomized.com` line in shot 8.
3. No claims beyond the script: no player counts, ratings, "#1", "no ads", "no sign-up", store badges, prices beyond "Free", or the words "unbeatable", "AI" or "multiplayer".
4. No "Win three." tagline. The slogan is `Three in a row. Zero excuses.` only.
5. No third-party logos (Facebook, App Store, Google Play, Apple, Android), no phone brand.
6. No stock footage, no photographs, no emoji, no hands.
7. No copying another game's board skin, sounds or characters; sounds are the app's own synthesised tones.
8. No essential text or objects in the top 250 px or bottom 400 px of the 9:16 render.
9. No burned-in running subtitles (the on-screen text already covers each claim). If captions are wanted, export a separate `.srt` from section 4.
10. No fade to black, no end-card call to action; a URL is allowed only as the single quiet `tictactoe.kayarandomized.com` line in shot 8 (the post caption carries the same link; see section 9).
11. **The bot never says anything beyond the two quoted lines**, `I do this all day.` and `Lucky square.`: no greeting, no extra word, no laugh, no sound effect in its voice, and it never speaks over the narrator.
12. No API key, key fragment or `.env` content in any file, log, render or report; the voice ids are data and may be written.

## 8. Done when (checks a verifier can make by watching the renders)

1. Both renders exist: 1080x1920 and 1080x1080, 30 fps, exactly 900 frames (30.00 s) each, with audio.
2. Frame 0 to about 3 s shows a plain empty board, then the first X in the centre; the first frame is not black and not a title card.
3. Around 5.5 s a speech bubble reads exactly `I do this all day.` and the bot's O is visible on the board.
4. Around 7.5 s X completes the diagonal (top-right, centre, bottom-left), a strike line draws, and X/O-coloured confetti bursts once.
5. Around 9.3 s a toast reads `ACHIEVEMENT UNLOCKED` / `Beat the Machine` / `Beat the bot for the first time`, and the chime is audible at that moment.
6. Between 10.8 and 18.3 s three cards appear in order: Online with the code `XOXO`, One phone, The bot with `Easy`, `Medium`, `Hard`.
7. `41` appears with `achievements to unlock` and a chip wall (the chips visibly split into four tier colours) at about 18.3-20.6 s.
8. The three pills read exactly `Installs as an app`, `Works offline`, `Free`, in that order.
9. The slogan reads exactly `Three in a row.` / `Zero excuses.` at about 24-26.8 s; the video ends on the overlapping X and O logo with `Kaya Randomized` and, beneath it, the line `tictactoe.kayarandomized.com` (the final frame shows both; held at least 2.0 s), and the narrator's last words are "From Kaya Randomized."
10. In the 9:16 render, pause on five random frames: no text, board, toast, bubble or logo inside y 0-250 or y 1520-1920, and all text is at least 28 px tall; a search of every frame finds no owner name, no real-looking room code, and no URL other than `tictactoe.kayarandomized.com` in shot 8.
11. The bot's two lines are audible, in a voice clearly different from the narrator (male, monotone, expressionless), at the moments their bubbles show: `I do this all day.` from about 5.5 s and `Lucky square.` from about 8.0 s. Each plays with its own bubble, neither overlaps the narrator or a game sound, "Now it talks back." ends at least 6 frames before the first bot line starts, and the bot says nothing else anywhere in the film.

## 9. Resolved

Resolved (owner, 2026-10-01): viewers go to tictactoe.kayarandomized.com. It shows as one quiet line in shot 8, and the post caption carries the same link.
