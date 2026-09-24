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
- The rung is saved to `localStorage` under `tic-tac-toe:ladder` together with
  the badge (below): `{ rung: number | null, topHeldAt: number | null }`.
  Missing or invalid data reads as `{ rung: null, topHeldAt: null }`.
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
| 11–20 | 100 | 100 | 0 → 90 (+10 per rung) |
| 21–29 | 100 | 100 | 91 → 97 (+1 to 25, then +0.5 to 29) |
| 30 | 100 | 100 | 100 |

Rung 1 is today's Easy, rung 11 today's Medium, rung 30 today's Hard: nothing
regresses. **Rungs 21–29 can lose; rung 30 cannot.** The P values for 21–29 are
placeholders pinned by the simulation test below and may be retuned; the
anchors and the monotonic shape are the contract.

## The moments

Computed as a pure function of (rung before, rung after, result, badge held):

- **Promoted** — the rung crosses up into Medium or Hard by playing, and the
  new rung is below 30. The status line gains a second line, "Promoted to
  Hard", and the start cue plays. Crossing down changes the chip only.
- **Top of the pack** — the rung reaches 30 (a win at 29). Second line:
  "Top of the pack." / "Nobody's above you now." Start cue. Shown every time
  the rung arrives at 30. Nothing hints that 30 cannot be beaten.
- **Top held** — a draw at rung 30 while the badge is not yet held. Confetti
  (the same burst as a win) and a card over the board:
  "That was the unbeatable bot." / "Holding it to a draw is as good as it
  gets." with **Share** and **Keep playing**. Sets `topHeldAt`. Shown once ever.
  Later draws at 30 get nothing extra.

Share opens the phone's share sheet with the text
"I held the unbeatable tic-tac-toe bot to a draw. Your move." and the site URL,
falling back to the clipboard as room links do. `ShareLink` gains an optional
`text`.

Losing at 30 drops to 29. The relabel after a nudged first game is never a
moment.

## The badge

While `topHeldAt` is set, the History sheet shows a badge above the bot record:
**Top of the pack** with the date held, and its own Share button with the same
text. Device-local, like all history.

## History

`HistoryEntry` gains optional `rung?: number` (integer 1..30), stored on bot
games. `difficulty` keeps recording the band the game was labelled with, so the
record table is unchanged. Old entries stay valid.

## Copy

Difficulty descriptions on setup, replacing "Makes mistakes" / "Blocks and
pounces" / "Unbeatable":

- Easy — **Go on, warm up.**
- Medium — **Blocks. Bites back.**
- Hard — **Bring your best. It won't matter.**

## Modules

- `src/lib/ladder.ts` — rungs, bands, `rungAfter`, `rungForSelection`,
  `momentAfter`, load/save over `HistoryStorage`. No React.
- `src/lib/bot.ts` — `chancesFor(rung)`, `chooseMove(board, rung, rng)`,
  memoised minimax with random tie-breaks.
- `src/components/GameScreen.tsx` — owns the rung for the session: resolves it
  on mount from the saved ladder and the picked band, feeds it to the bot,
  advances it after each finished bot game, saves ladder and setup band,
  records the rung in history, shows moments.
- `src/components/StatusBar.tsx` — optional second line.
- `src/components/TopCard.tsx` — the once-only card.
- `src/components/HistorySheet.tsx` — the badge.
- `src/platform/share.ts` — text alongside the URL.

## Tests

- Ladder: band edges, `rungAfter` clamping, `rungForSelection` for every case
  in the table plus same-band and first-game, `momentAfter` for promoted / top /
  top held / held again / demotion, load/save round trip and bad data.
- Bot: `chancesFor` at every anchor and monotonic between them; rung 1 is
  uniform random; rung 11 always wins and blocks; rung 30 never loses in
  exhaustive play (existing test, now against rung 30); random tie-breaks
  vary the opening; **simulation** — a rung-30 player versus rung 29 over
  2000 games wins between 3% and 20% and never loses, and versus rung 30
  never wins.
- Components: chip shows the picked band for the first game and the real band
  after; promotion and top lines appear; the card appears once and Share is
  called with the text; the badge shows in History with Share; setup shows the
  new descriptions and preselects the band.

## Out of scope / deferred

- **Account-based badge.** When the rooms work lands its device identity and
  Supabase tables, the badge can live there and show beside a nickname.
- **Level graph in History**, drawn from the stored rungs.
- Showing the rung on the chip. Deliberately hidden: the top is a surprise.
