# Tic-Tac-Toe (React) — Design Spec

Date: 2026-09-23
Location: `/Volumes/Developer/Projects/Personal/KayaProjects/tic-tac-toe`

## Goal

A browser tic-tac-toe game with two play modes (local two-player and human vs
bot), three bot difficulty levels, and a persistent history of finished games
stored in the browser's `localStorage`.

This is a fresh project. It does not share code with the older vanilla-JS
tic-tac-toe under `Personal/tic-tac-toe`.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- shadcn/ui components (Button, Card, RadioGroup or ToggleGroup, Sheet or
  Dialog, ScrollArea) copied into `src/components/ui/`
- Vitest + React Testing Library + jsdom for tests
- No router, no global state library, no backend

## Scope

In scope:

- Setup screen: pick mode (Two Player / Versus Bot), pick difficulty when bot
  is selected (Easy / Medium / Hard), Start button, History button.
- Game screen: 3×3 board, status line, New Game button, Back to Setup button.
- Bot opponent with three strategies.
- Game history persisted in `localStorage`, viewable. (Clearing was dropped later; the list caps itself.)
- Visual polish pass using the Impeccable skill after functionality is done.

Out of scope (do not add without updating this spec):

- Win streaks (a session score and symbol choice were added later; see
  `2026-09-23-gameplay-enhancements-design.md`)
- Move-by-move replay of past games
- Online play with friends: see `2026-09-24-online-play-design.md`. Random matchmaking stays out.
- Undo

## Architecture

Three layers with strict dependency direction: `ui → bot → game`,
`ui → history`. `game`, `bot`, and `history` never import React or touch the
DOM.

```
src/
  lib/
    game.ts        pure board logic
    bot.ts         bot strategies (depends on game.ts)
    history.ts     history persistence (depends on a Storage-like interface)
  state/
    reducer.ts     game state reducer (depends on game.ts)
  components/
    ui/            shadcn components (generated)
    SetupScreen.tsx
    GameScreen.tsx
    Board.tsx
    Cell.tsx
    StatusBar.tsx
    HistorySheet.tsx
  App.tsx          screen switching: setup | game
  main.tsx
  **/*.test.ts(x)  tests live next to the code they cover
```

## Data model

```ts
type Player = 'X' | 'O'
type Cell = Player | null
type Board = Cell[]            // length 9, row-major, index 0–8

type Mode = 'pvp' | 'bot'
type Difficulty = 'easy' | 'medium' | 'hard'

type Settings = { mode: Mode; difficulty: Difficulty }   // difficulty ignored in pvp

type Outcome = 'X' | 'O' | 'draw'

type HistoryEntry = {
  id: string            // crypto.randomUUID()
  timestamp: number     // Date.now(), epoch ms
  mode: Mode
  difficulty: Difficulty | null   // null when mode === 'pvp'
  outcome: Outcome
}
```

## `lib/game.ts` — pure logic

All functions are pure. They never mutate their inputs.

- `createBoard(): Board` — nine `null`s.
- `makeMove(board, index, player): Board` — returns a new board. Throws
  `RangeError` if index is out of 0–8, `Error` if the cell is occupied or the
  game is already over.
- `getWinner(board): { player: Player; line: [number, number, number] } | null`
  — checks the 8 winning lines.
- `isDraw(board): boolean` — board full and no winner.
- `isGameOver(board): boolean` — winner or draw.
- `availableMoves(board): number[]` — indices of empty cells.
- `nextPlayer(board): Player` — X if counts are equal, otherwise O. (X always
  moves first.)

## `lib/bot.ts` — strategies

`chooseMove(board, difficulty, rng = Math.random): number`

- `easy` — uniformly random among `availableMoves`.
- `medium` — if the bot can win this turn, take it; else if the human can win
  next turn, block it; else random. When several cells qualify, pick with
  `rng`.
- `hard` — minimax from O's perspective; never loses. Ties broken by first
  index found (deterministic). Prefer faster wins / slower losses by including
  depth in the score.

`rng` is injectable so tests are deterministic. The bot always plays `O`.

## `lib/history.ts` — persistence

Takes a `Storage`-like dependency (`getItem`, `setItem`, `removeItem`) so
tests use an in-memory fake and the UI passes `window.localStorage`.

- `const STORAGE_KEY = 'tic-tac-toe:history'`
- `loadHistory(storage): HistoryEntry[]` — parses JSON; returns `[]` on
  missing key, invalid JSON, or non-array. Filters out entries that fail a
  basic shape check.
- `saveGame(storage, entry): HistoryEntry[]` — prepends the entry (newest
  first), caps the list at 100 entries, writes it back, returns the new list.

The UI wraps `localStorage` access in `try/catch`; if storage throws (private
mode, quota), history silently behaves as empty and saving is a no-op.

## `state/reducer.ts` — game state

```ts
type GameState = {
  settings: Settings
  board: Board
  status: 'playing' | 'won' | 'draw'
  winner: Player | null
  winningLine: [number, number, number] | null
  recorded: boolean     // true once this game has been written to history
}

type Action =
  | { type: 'MOVE'; index: number }
  | { type: 'NEW_GAME' }             // same settings, fresh board
  | { type: 'RECORDED' }             // mark history write done
```

`MOVE` is ignored (state returned unchanged) when the game is over or the cell
is occupied. After each move the reducer recomputes `status`, `winner`,
`winningLine`.

## UI flow

1. **SetupScreen** — Card with mode toggle, difficulty toggle (only visible /
   enabled when mode is `bot`), Start button, History button. Defaults:
   `pvp`, `medium`.
2. **GameScreen** — `useReducer` with the chosen settings.
   - Board renders 9 Cells. A Cell is a button; disabled when occupied, game
     over, or it's the bot's turn.
   - In bot mode, when `status === 'playing'` and `nextPlayer(board) === 'O'`,
     a `useEffect` schedules `chooseMove` after a ~400 ms delay and dispatches
     `MOVE`. The timeout is cleared on cleanup so New Game / unmount cancel it.
   - StatusBar text: "X's turn" / "O's turn" / "Bot is thinking…" /
     "X wins!" / "O wins!" / "Bot wins!" / "Draw". Winning cells get a
     highlight.
   - When `status` becomes `won` or `draw` and `recorded` is false, a
     `useEffect` calls `saveGame` and dispatches `RECORDED`. This guarantees
     exactly one history entry per finished game.
   - New Game → `NEW_GAME`. Back → return to SetupScreen.
3. **HistorySheet** — shadcn Sheet opened from SetupScreen. Lists entries
   newest first: formatted local date/time, mode label, difficulty label (bot
   only), outcome label. Empty state message when no entries. "Clear history"
   button with a confirm step (shadcn AlertDialog).

`App.tsx` holds `screen: 'setup' | 'game'` and the current `Settings`.

## Testing

TDD throughout (red → green → refactor). Test files sit next to the code as
`*.test.ts(x)`.

- `game.test.ts` — every function; all 8 win lines; draw; invalid moves.
- `bot.test.ts` — easy uses rng over available cells; medium takes wins,
  blocks threats, falls back to random; hard never loses (exhaustive play
  against every possible human sequence from an empty board) and wins when
  the human blunders.
- `history.test.ts` — load empty / corrupt / valid; save prepends and caps at
  100; clear removes the key.
- `reducer.test.ts` — move updates board and status; ignores illegal moves;
  NEW_GAME resets board but keeps settings; RECORDED flips the flag.
- `Board.test.tsx` (light) — renders 9 cells, click dispatches, occupied cell
  disabled, winning cells highlighted.
- `GameScreen.test.tsx` (light) — in bot mode the bot moves after the timer
  (fake timers); finishing a game writes exactly one history entry.

Not unit tested: shadcn components, SetupScreen layout, HistorySheet visuals.
These are verified in the browser.

## Visual design

**Mobile-first, phone layout everywhere.** The game is designed for a phone
screen and keeps that layout on desktop browsers too: a single centred column
capped at roughly 420 px wide, full viewport height, no side-by-side desktop
layout. On wide screens the column sits centred on a subtle backdrop so it
reads as an app, not a stretched web page.

Rules:

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- Layout uses `100dvh` and respects safe-area insets (`env(safe-area-inset-*)`)
  so nothing hides behind notches or the home indicator.
- The board is a square that fills the column width minus padding; cells are
  therefore large touch targets (well above 44 px). All buttons meet a 44 px
  minimum height.
- Feedback works on touch: use `active:` / pressed states and the winning
  highlight; never rely on `hover:` alone.
- `touch-action: manipulation` on the board to remove tap delay; disable text
  selection on cells.
- Setup, Game, and History all fit without horizontal scrolling at 360 px
  wide. History content scrolls inside the Sheet, not the page.
- Test in the browser at 360, 390, and 1280 px widths before calling the UI
  done.

After all tests pass, run the Impeccable skill for the polish pass within
these constraints: typography, spacing, board proportions, cell press
feedback, winning-line highlight, dark mode via Tailwind `dark:` classes and
shadcn's theme tokens. No behaviour changes in that pass.

## Commands

- `npm run dev` — Vite dev server
- `npm test` — Vitest once
- `npm run test:watch` — Vitest watch
- `npm run build` — production build

## Deployment (added 2026-09-23, moved to Cloudflare Pages 2026-09-24)

The app is a static build hosted on Cloudflare Pages, connected to the GitHub
repository: every push to `main` deploys and every pull request gets a
preview URL. The Pages project runs `npm run build` and serves `dist/`, with
the Node version taken from `.node-version`. The site is served from the root,
so Vite's `base` stays `/`; `BASE_PATH` remains available for hosting under a
sub-path. GitHub Actions (`ci.yml`) runs `npm test` and `npm run build` on
pull requests and pushes but does not deploy.

Until 2026-09-24 the site was published to GitHub Pages by a workflow that
built with `BASE_PATH=/<repo-name>/` and deployed `dist/` with
`actions/deploy-pages`.

## Sound and haptics (added 2026-09-23)

Every new mark, the player's or the bot's, plays feedback. A move plays a
short tick (X and O at different pitches) and a short vibration. The mark that
wins the game plays a rising four-note chime and a longer vibration pattern
instead. A draw plays one low tone and a double buzz. Starting a new game plays nothing.

- `lib/feedback.ts` is pure. `feedbackForChange(prev, next)` maps a board
  change to `move | win | draw | null`.
- `platform/browserFeedback.ts` is the only code that touches the browser for
  this. Tones are generated with Web Audio (no audio files), and haptics use
  `navigator.vibrate`. Either API can be missing; iPhone Safari has no
  vibration. `play()` degrades quietly and never throws.
- `GameScreen` takes a `feedback` prop, injected the same way as `storage`.
- Sound is always on. There is deliberately no mute control; players use the
  device volume or silent switch.
