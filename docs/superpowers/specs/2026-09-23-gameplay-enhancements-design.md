# Gameplay enhancements — Design Spec

Date: 2026-09-23
Branch: `feat/gameplay-enhancements`
Amends: `2026-09-23-tic-tac-toe-design.md` (score tallies and symbol choice
move from out-of-scope to in-scope; undo, replay, and online play stay out).

Agreed with the owner by voice before implementation. Everything here ships in
one pull request. The installable app and keyboard navigation ship separately
(see `2026-09-23-pwa-keyboard-design.md`).

## Players and seats

A game has two seats, `p1` and `p2`. In bot mode `p1` is you and `p2` is the
bot. In two-player mode they are Player 1 and Player 2. **X always moves
first**; what changes between games is which seat holds X.

- `Settings` gains `p1Symbol: Player`, the symbol `p1` plays in the first
  game. The setup screen offers X or O only in bot mode. Two-player always
  starts with Player 1 as X.
- **Winner takes X.** After a win, the winning seat plays X (and so moves
  first) next game. **A draw swaps** the symbols. Pressing New game
  mid-game abandons it with no swap and no score change.
- The bot plays whichever side it is on. `chooseMove` plays for the player to
  move (`nextPlayer(board)`), so the bot can open as X.

## Session score

The game screen shows `You · Draws · Bot` (or `Player 1 · Draws · Player 2`)
for the games played since leaving setup. It lives in the reducer and resets
when you go back to setup. It is not persisted.

The status line names seats rather than symbols in two-player mode
("Player 2's turn", "Player 1 wins!"). The accent mark still shows the symbol.

## History

- Entries gain optional `p1Symbol`. Old entries without it are read as `X`,
  which is what they were. Labels use it: "You win" / "Bot wins" in bot mode,
  "Player 1 wins" / "Player 2 wins" in two-player mode.
- A stats row at the top shows wins, losses, and draws per bot difficulty,
  computed from the stored games (capped at 100).
- The list shows the 10 most recent games. **View more** reveals 10 more at a
  time.
- The list scrolls inside the sheet (the scroll area needed `min-h-0` to be
  allowed to shrink in the flex column). A **Back** button at the bottom
  closes the sheet, alongside the existing corner close button.

## Remember last setup

Mode, difficulty, and symbol are saved to `localStorage`
(`tic-tac-toe:setup`) when a game starts, and preselected on the next visit.
Invalid or missing data falls back to the defaults.

## Sound and celebration

- A distinct descending "lose" sound plays when the bot wins, instead of the
  win chime.
- A short confetti burst plays **only when you beat the bot**. Not in
  two-player mode, not when the bot wins. It is decorative
  (`aria-hidden`) and hidden entirely under `prefers-reduced-motion`.

## Testing

TDD throughout. Pure logic (seat rotation, score, stats, setup persistence,
feedback mapping, bot as X) is unit tested in `lib/` and `state/`. Component
tests cover the setup picker, score display, celebration visibility, history
paging and Back. Layout (scrolling) is checked in a real browser.
