# Adaptive bot — Design Spec

Date: 2026-09-25
Branch: `feat/adaptive-bot`
Amends: `2026-09-23-tic-tac-toe-design.md` (the three fixed bot strategies
become anchors on a 30-rung ladder) and `2026-09-23-gameplay-enhancements-design.md`
(history entries gain a rung; the bot record table is unchanged).

Agreed with the owner in conversation. Ships in one pull request to `develop`.

## Goal

Keep bot games close. The bot gets a little harder after every win and a little
easier after every loss, so most players hover where they win about as often as
they lose. The three visible levels stay; a hidden ladder does the work.

## The ladder

- Thirty rungs, 1 to 30. **Easy** is 1–10, **Medium** 11–20, **Hard** 21–30.
  Band middles are 5, 15, 25.
- After each finished bot game: **win up one, loss down one, draw stays**.
  Clamped to 1..30. Two-player and online games never touch the ladder.
- **Streaks.** From the third win in a row each win moves two rungs; likewise
  from the third loss in a row. A draw breaks the streak.
- **Sticky bands.** A loss only drops the rung into a lower band when it is
  the second loss in a row; before that it stops at the band's bottom rung.
  Any win that crosses up promotes at once.
- Saved to `localStorage` under `tic-tac-toe:ladder`:
  `{ rung: number | null, streak: number, updatedAt: number }`. Ladders saved
  with the old `topHeldAt` / `topHeldCount` fields load without them.
  `streak` is consecutive wins (positive) or losses (negative). Missing or
  invalid data reads as the empty ladder.
- New players have no rung. Their **first bot game starts at the bottom** of the
  band they picked: 1, 11, or 21.

### Picking a band from setup

Setup keeps its three buttons and preselects the band the saved rung is in
(via the remembered setup, which is updated whenever the band changes).

- Picking the band the rung is already in: the rung is unchanged. Pressing
  Start every day must not drift the rung.
- Picking any other band: the new rung is **halfway between the current rung
  and the middle of the picked band, rounded down**. The buttons nudge; they do
  not teleport.
- The nudge is applied when the game screen opens (the bot plays it from the
  first move) but is **only saved once that game finishes**, moved by its
  result. Backing out before the end leaves the saved rung untouched.

| Rung | Picks | Halfway to | Lands on |
|------|-------|-----------:|---------:|
| 25 | Easy | 5 | 15 |
| 25 | Medium | 15 | 20 |
| 3 | Hard | 25 | 14 |
| 3 | Medium | 15 | 9 |
| 30 | Easy | 5 | 17 |

So a rung-3 player who picks Hard gets a rung-14 bot. The chip over the board
says **Bot · Hard** for that first game (what they pressed), and from the second
game on says the band the rung is really in. That relabel is silent.

## The bot

`chooseMove(board, rung, rng)` replaces `chooseMove(board, difficulty, rng)`.
Each move the bot rolls, in order:

1. **W** — if it can win this move, the chance it does.
2. **B** — if the opponent can win next move, the chance it blocks.
3. **P** — otherwise, the chance it plays a minimax-best move. On a failed
   roll it plays a uniformly random legal square, which may lose.

Among equally good minimax moves the bot picks at random (today's Hard always
took the first, so its games repeated). Minimax is memoised on the board, so
whole-game simulations are cheap.

| Rung | W | B | P |
|-----:|--:|--:|--:|
| 1 | 0 | 0 | 0 |
| 2–6 | 20 → 100 (+20 per rung) | 10 → 50 (+10 per rung) | 0 |
| 7–10 | 100 | 60 → 90 (+10 per rung) | 0 |
| 11–20 | 100 | 100 | 0 → 63 (+7 per rung) |
| 21–29 | 100 | 100 | 75 → 91 (+2 per rung) |
| 30 | 100 | 100 | 100 |

Rung 1 is today's Easy, rung 11 today's Medium, rung 30 today's Hard: nothing
regresses. **Rungs 21–29 can lose; rung 30 cannot.** The P ramp was set by
simulation: a perfect player wins about 11% of games at 75% and 4% at 91%,
so the climb from 21 to 30 is nine wins spread over roughly a hundred games
for someone who never slips, far fewer for the bot's usual opponents. The
anchors, the monotonic shape, and the simulation bounds are the contract.

## Moments (removed)

The ladder no longer has moments. Promotion, reaching rung 30, and holding it to
draws are achievements (Moving Up, Top of the Pack, The Immovable): the unlock
toast is the fanfare, the achievements sheet is the record, and the badge worn
online replaces the History badge. The last moment, "Take it back" after a loss
at rung 30, is gone too: the button always reads New game. The ladder no longer
keeps `topHeldAt` / `topHeldCount`; the `ladders` columns stay in the database,
and `save_ladder` is sent null and 0 until a cleanup migration drops them.

## History

`HistoryEntry` gains optional `rung?: number` (integer 1..30), stored on bot
games. `difficulty` keeps recording the band the game was labelled with, so the
record table is unchanged. Old entries stay valid.

**The climb** (`src/lib/climb.ts`, `components/ClimbGraph.tsx`): in bot
History, above the record table, a sparkline of the rung over the last 30 bot
games with a rung, oldest first, over three shaded lanes labelled Easy, Medium,
Hard. No rung numbers are printed. Shown once two such games exist.

## Copy

All bot copy lives in `src/lib/banter.ts` in two tones. `friendly` is the
default, for kids; `cocky` is the **Aggressive bot** switch in Settings
(`src/lib/tone.ts`, key `tic-tac-toe:tone`, off unless switched on).

**Settings** (`components/SettingsSheet.tsx`): a gear at the top right of the
setup screen, and nowhere else, opens a sheet with the nickname (same rules
and save path as the online nickname sheet; prefilled with the random
suggestion until one is chosen) and the Aggressive bot switch.

Difficulty descriptions on setup:

- Easy — **Go on, warm up.** (cocky: the same)
- Medium — **I block. Can you?** (cocky: *Blocks. Bites back.*)
- Hard — **My best game. Ready?** (cocky: *Bring your best. It won't matter.*)

**Banter.** After every finished bot game the second status line carries one
line from the bot, picked at random from ten per band and result (the band the
game was played at).
Voided and two-player games get none. New game clears it.

**Streak pill.** From the third straight win, a pill beside the chip reads
`🔥 N in a row`. Losing streaks are never shown.

## Modules

- `src/lib/ladder.ts` — rungs, bands, `rungAfter`, `rungForSelection`,
  load/save over `HistoryStorage`. No React.
- `src/lib/bot.ts` — `chancesFor(rung)`, `chooseMove(board, rung, rng)`,
  memoised minimax with random tie-breaks.
- `src/components/GameScreen.tsx` — owns the rung for the session: resolves it
  on mount from the saved ladder and the picked band, feeds it to the bot,
  advances it after each finished bot game, saves ladder and setup band,
  records the rung in history.
- `src/components/StatusBar.tsx` — optional second line (now only the banter).

## Tests

- Ladder: band edges, `rungAfter` clamping, `rungForSelection` for every case
  in the table plus same-band and first-game, load/save round trip and bad data.
- Bot: `chancesFor` at every anchor and monotonic between them; rung 1 is
  uniform random; rung 11 always wins and blocks; rung 30 never loses in
  exhaustive play (existing test, now against rung 30); random tie-breaks
  vary the opening; **simulation** — a rung-30 player versus rung 29 over
  2000 games wins between 3% and 20% and never loses, and versus rung 30
  never wins.
- Components: chip shows the picked band for the first game and the real band
  after; a loss at 30 offers a plain New game; achievement events carry the rungs;
  setup shows the
  new descriptions and preselects the band.

## Out of scope / deferred

- **Daily decay.** Each day without a bot game drops the rung by one.
- Seeding a new ladder from past history. Considered and declined: newcomers
  and old hands alike start at the bottom of the band they pick.
- Showing the rung on the chip. Deliberately hidden: the top is a surprise.

The account-based badge and achievements shipped: see
`2026-09-26-achievements-design.md`.
