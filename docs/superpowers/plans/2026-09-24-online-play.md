# Online Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two friends on different devices play each other by sharing a four-character room code or link, over Supabase Realtime, with no server code of our own.

**Architecture:** Pure modules (`lib/room.ts`, `state/online.ts`, reducer `SYNC`) carry every rule: codes, message validation, the host-as-referee reducer, lobby presence rules. A tiny `RoomConnection` interface hides the transport; `platform/supabaseRoom.ts` is the only file that imports Supabase, and an in-memory fake links two connections for component tests. `OnlineGame` orchestrates connection → lobby → `GameScreen`, which gains an optional online session.

**Tech Stack:** Vite 8, React 19, TypeScript 5, Tailwind 4, shadcn/ui, Vitest 4 + RTL, `@supabase/supabase-js` 2.x (Realtime broadcast + presence only).

**Spec:** `docs/superpowers/specs/2026-09-24-online-play-design.md`

## Global Constraints

- Project root: `/Volumes/Developer/Projects/Personal/KayaProjects/tic-tac-toe`. Paths are relative to it.
- Channel name: `ttt-room:<CODE>`. Broadcast event name: `msg`. Presence key: the member's own id.
- Room codes: exactly 4 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L). Input is case-insensitive with whitespace removed.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Blank in `.env.example`; never write `.env`. Missing → Online option shown but disabled with hint "Not set up".
- The host is seat `p1` and plays X in the first game. The host's `GameState` is the truth; the guest only changes its board via `SYNC` snapshots.
- Copy (exact): "Waiting for your friend…", "Your turn", "Friend's turn", "You win!", "Friend wins!", "Your friend left", "Room is full", "Couldn't connect", "Create room", "Join", "Share", "Wait", "Back", "Cancel", "New game", "Not set up", "Online".
- Each device saves finished online games with `mode: 'online'`, `difficulty: null`, `p1Symbol` = **its own** symbol. History labels them "Online". Bot stats ignore them.
- Online is never the remembered setup mode.
- `lib/` and `state/` never import React or touch the DOM. Dependency direction: components → state → lib. (Deviation from the spec: the referee reducer lives at `src/state/online.ts`, not `src/lib/online.ts`, because it must import the reducer.)
- `public/sw.js` is not touched and `CACHE` is not bumped.
- TDD every task. Commit after each green step, plain messages, no attribution trailer.
- Existing tests must stay green at every commit.

## Review Focus

1. A `?room=` link with a lowercase, padded, or garbage code: lowercase/padded joins the room; garbage is ignored and the app opens on setup. → Task 2 (`roomCodeFromUrl`) and Task 15 (App).
2. Malformed broadcast payloads (non-integer index, board of wrong length, unknown type) are dropped, not applied. → Task 3 (`isRoomMessage`).
3. Guest taps while it is the host's turn: the board is disabled, and if a request still arrives the host drops it. → Task 5 (`roomReducer`) and Task 11 (GameScreen).
4. The same finished snapshot arriving twice (rejoin) records history once. → Task 4 (`SYNC` keeps `recorded`) and Task 11.
5. Cancelling the lobby while still connecting: a connection that resolves later is closed, not leaked. → Task 13 (OnlineGame).

---

### Task 1: Shared types, history and setup accept `'online'`

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/state/reducer.ts:1-10`
- Modify: `src/lib/history.ts:18`
- Modify: `src/lib/setup.ts`
- Test: `src/lib/history.test.ts`, `src/lib/setup.test.ts`

**Interfaces:**
- Produces: `Mode = 'pvp' | 'bot' | 'online'`; `GameStatus` and `Score` exported from `@/lib/types` (and still re-exported from `@/state/reducer`).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/history.test.ts` (inside the top-level `describe`, reuse its `fakeStorage`/imports; if the file has no `botStats` import add it):

```ts
  it('accepts online entries and keeps them out of the bot record', () => {
    const storage = fakeStorage()
    saveGame(storage, { id: 'o1', timestamp: 1, mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'X' })
    const entries = loadHistory(storage)
    expect(entries).toHaveLength(1)
    expect(entries[0].mode).toBe('online')
    expect(botStats(entries)).toEqual({
      easy: { wins: 0, losses: 0, draws: 0 },
      medium: { wins: 0, losses: 0, draws: 0 },
      hard: { wins: 0, losses: 0, draws: 0 },
    })
  })
```

Append to `src/lib/setup.test.ts` inside `describe('setup memory')`:

```ts
  it('never remembers online as the mode', () => {
    const storage = fakeStorage()
    saveSetup(storage, { mode: 'bot', difficulty: 'hard', p1Symbol: 'O' })
    saveSetup(storage, { mode: 'online', difficulty: 'medium', p1Symbol: 'X' })
    expect(loadSetup(storage)).toEqual({ mode: 'bot', difficulty: 'hard', p1Symbol: 'O' })
  })

  it('opens on two player when the saved mode is online', () => {
    const raw = JSON.stringify({ mode: 'online', difficulty: 'easy', p1Symbol: 'X' })
    expect(loadSetup(fakeStorage({ [SETUP_KEY]: raw }))).toEqual({ mode: 'pvp', difficulty: 'easy', p1Symbol: 'X' })
  })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/history.test.ts src/lib/setup.test.ts`
Expected: FAIL. TypeScript-level errors on `'online'` are reported by `tsc`; at runtime the history test fails because `loadHistory` filters the entry out (`toHaveLength(1)` gets 0) and the setup test fails because the online setup overwrote the bot one.

- [ ] **Step 3: Implement**

`src/lib/types.ts`: change `Mode` and add two types:

```ts
export type Mode = 'pvp' | 'bot' | 'online'

export type GameStatus = 'playing' | 'won' | 'draw'
export type Score = { p1: number; p2: number; draws: number }
```

`src/state/reducer.ts`: replace the local declarations of `GameStatus` and `Score` with imports and re-exports:

```ts
import type { Board, GameStatus, Player, Score, Seat, Settings, WinLine } from '@/lib/types'

export type { Seat, GameStatus, Score }
```

(Delete the two `export type GameStatus = …` / `export type Score = …` lines.)

`src/lib/history.ts`: `const MODES: Mode[] = ['pvp', 'bot', 'online']`.

`src/lib/setup.ts`: `MODES` stays `['pvp', 'bot']` (so a saved `'online'` falls back to the default). In `saveSetup`, add as the first line:

```ts
  if (settings.mode === 'online') return
```

Update its doc comment: `/** Remembers the setup for next time. Online is a one-off, so it is never remembered. */`

- [ ] **Step 4: Run all tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/state/reducer.ts src/lib/history.ts src/lib/setup.ts src/lib/history.test.ts src/lib/setup.test.ts
git commit -m "feat: online mode type; history accepts it, setup never remembers it"
```

---

### Task 2: Room codes and links (`lib/room.ts`)

**Files:**
- Create: `src/lib/room.ts`
- Test: `src/lib/room.test.ts`

**Interfaces:**
- Produces: `ROOM_CODE_ALPHABET`, `ROOM_CODE_LENGTH`, `createRoomCode(random?: () => number): string`, `normalizeRoomCode(input: string): string | null`, `roomCodeFromUrl(url: string): string | null`, `roomLink(baseUrl: string, code: string): string`, `withoutRoomParam(url: string): string`.

- [ ] **Step 1: Write the failing tests**

`src/lib/room.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  ROOM_CODE_ALPHABET,
  createRoomCode,
  normalizeRoomCode,
  roomCodeFromUrl,
  roomLink,
  withoutRoomParam,
} from './room'

describe('room codes', () => {
  it('makes four characters from the unambiguous alphabet', () => {
    const code = createRoomCode()
    expect(code).toHaveLength(4)
    for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch)
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[0O1IL]/)
  })

  it('maps the random source onto the alphabet, clamping 1', () => {
    expect(createRoomCode(() => 0)).toBe('AAAA')
    expect(createRoomCode(() => 0.999999)).toBe('9999')
    expect(createRoomCode(() => 1)).toBe('9999')
  })

  it('normalizes case and whitespace', () => {
    expect(normalizeRoomCode(' ab 2c ')).toBe('AB2C')
    expect(normalizeRoomCode('AB2C')).toBe('AB2C')
  })

  it('rejects the wrong length or characters outside the alphabet', () => {
    expect(normalizeRoomCode('')).toBeNull()
    expect(normalizeRoomCode('ABC')).toBeNull()
    expect(normalizeRoomCode('ABCDE')).toBeNull()
    expect(normalizeRoomCode('AB0C')).toBeNull()
    expect(normalizeRoomCode('AB1C')).toBeNull()
    expect(normalizeRoomCode('ABIC')).toBeNull()
    expect(normalizeRoomCode('AB-C')).toBeNull()
  })
})

describe('room links', () => {
  it('reads and normalizes ?room= from a URL', () => {
    expect(roomCodeFromUrl('https://x.test/app/?room=ab2c')).toBe('AB2C')
    expect(roomCodeFromUrl('https://x.test/app/?room=%20ab2c')).toBe('AB2C')
  })

  it('ignores a missing, empty, or garbage room parameter', () => {
    expect(roomCodeFromUrl('https://x.test/app/')).toBeNull()
    expect(roomCodeFromUrl('https://x.test/app/?room=')).toBeNull()
    expect(roomCodeFromUrl('https://x.test/app/?room=<script>')).toBeNull()
    expect(roomCodeFromUrl('not a url')).toBeNull()
  })

  it('builds a link on the app URL, dropping any existing query or hash', () => {
    expect(roomLink('https://x.test/tic-tac-toe-react/', 'AB2C')).toBe('https://x.test/tic-tac-toe-react/?room=AB2C')
    expect(roomLink('https://x.test/app/?room=OLD1#top', 'AB2C')).toBe('https://x.test/app/?room=AB2C')
  })

  it('removes only the room parameter', () => {
    expect(withoutRoomParam('https://x.test/app/?room=AB2C')).toBe('https://x.test/app/')
    expect(withoutRoomParam('https://x.test/app/?a=1&room=AB2C')).toBe('https://x.test/app/?a=1')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/room.test.ts`
Expected: FAIL, cannot resolve `./room`.

- [ ] **Step 3: Implement**

`src/lib/room.ts`:

```ts
export const ROOM_CODE_LENGTH = 4
/** No 0/O or 1/I/L, so a code read aloud or typed from a photo is unambiguous. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function createRoomCode(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const at = Math.min(ROOM_CODE_ALPHABET.length - 1, Math.floor(random() * ROOM_CODE_ALPHABET.length))
    code += ROOM_CODE_ALPHABET[at]
  }
  return code
}

/** The code as typed or pasted: case-insensitive, whitespace ignored. Null when it cannot be a room code. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.replace(/\s+/g, '').toUpperCase()
  if (code.length !== ROOM_CODE_LENGTH) return null
  for (const ch of code) if (!ROOM_CODE_ALPHABET.includes(ch)) return null
  return code
}

export function roomCodeFromUrl(url: string): string | null {
  try {
    const raw = new URL(url).searchParams.get('room')
    return raw === null ? null : normalizeRoomCode(raw)
  } catch {
    return null
  }
}

/** A link that opens the app straight into the room. */
export function roomLink(baseUrl: string, code: string): string {
  const u = new URL(baseUrl)
  u.search = ''
  u.hash = ''
  u.searchParams.set('room', code)
  return u.toString()
}

export function withoutRoomParam(url: string): string {
  const u = new URL(url)
  u.searchParams.delete('room')
  return u.toString()
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/room.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room.ts src/lib/room.test.ts
git commit -m "feat: room codes and room links"
```

---

### Task 3: Room messages and validation

**Files:**
- Modify: `src/lib/room.ts`
- Test: `src/lib/room.test.ts`

**Interfaces:**
- Produces: `Snapshot`, `RoomMessage`, `isRoomMessage(value: unknown): value is RoomMessage`.

```ts
export type Snapshot = {
  board: Board
  p1Symbol: Player
  score: Score
  status: GameStatus
  winner: Player | null
  winningLine: WinLine | null
}
export type RoomMessage =
  | { type: 'move'; index: number }
  | { type: 'new-game' }
  | { type: 'state'; state: Snapshot }
```

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/room.test.ts` (add `isRoomMessage` and `type Snapshot` to the import):

```ts
const snapshot: Snapshot = {
  board: ['X', null, null, null, 'O', null, null, null, null],
  p1Symbol: 'X',
  score: { p1: 1, p2: 0, draws: 2 },
  status: 'playing',
  winner: null,
  winningLine: null,
}

describe('isRoomMessage', () => {
  it('accepts the three message shapes', () => {
    expect(isRoomMessage({ type: 'move', index: 4 })).toBe(true)
    expect(isRoomMessage({ type: 'new-game' })).toBe(true)
    expect(isRoomMessage({ type: 'state', state: snapshot })).toBe(true)
    expect(
      isRoomMessage({
        type: 'state',
        state: { ...snapshot, status: 'won', winner: 'X', winningLine: [0, 1, 2] },
      }),
    ).toBe(true)
  })

  it('rejects anything that is not a message', () => {
    expect(isRoomMessage(null)).toBe(false)
    expect(isRoomMessage('move')).toBe(false)
    expect(isRoomMessage({ type: 'chat', text: 'hi' })).toBe(false)
    expect(isRoomMessage({ type: 'move' })).toBe(false)
    expect(isRoomMessage({ type: 'move', index: '4' })).toBe(false)
    expect(isRoomMessage({ type: 'move', index: 4.5 })).toBe(false)
    expect(isRoomMessage({ type: 'move', index: 9 })).toBe(false)
    expect(isRoomMessage({ type: 'move', index: -1 })).toBe(false)
  })

  it('rejects malformed snapshots', () => {
    const bad = (patch: Record<string, unknown>) => isRoomMessage({ type: 'state', state: { ...snapshot, ...patch } })
    expect(isRoomMessage({ type: 'state' })).toBe(false)
    expect(bad({ board: snapshot.board.slice(0, 8) })).toBe(false)
    expect(bad({ board: [...snapshot.board.slice(0, 8), 'Z'] })).toBe(false)
    expect(bad({ p1Symbol: 'Z' })).toBe(false)
    expect(bad({ status: 'paused' })).toBe(false)
    expect(bad({ winner: 'draw' })).toBe(false)
    expect(bad({ winningLine: [0, 1] })).toBe(false)
    expect(bad({ winningLine: [0, 1, 9] })).toBe(false)
    expect(bad({ score: { p1: 1, p2: 0 } })).toBe(false)
    expect(bad({ score: { p1: -1, p2: 0, draws: 0 } })).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/room.test.ts`
Expected: FAIL, `isRoomMessage` is not exported.

- [ ] **Step 3: Implement**

Add to `src/lib/room.ts` (top import and appended code):

```ts
import type { Board, GameStatus, Player, Score, WinLine } from './types'

export type Snapshot = {
  board: Board
  p1Symbol: Player
  score: Score
  status: GameStatus
  winner: Player | null
  winningLine: WinLine | null
}

/** Guest → host: `move`, `new-game` (requests). Host → guest: `state` (the truth). */
export type RoomMessage =
  | { type: 'move'; index: number }
  | { type: 'new-game' }
  | { type: 'state'; state: Snapshot }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isCellIndex = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 8
const isPlayer = (v: unknown): v is Player => v === 'X' || v === 'O'
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0

function isSnapshot(v: unknown): v is Snapshot {
  if (!isObject(v)) return false
  const board = v.board
  if (!Array.isArray(board) || board.length !== 9 || !board.every((c) => c === null || isPlayer(c))) return false
  if (!isPlayer(v.p1Symbol)) return false
  if (v.status !== 'playing' && v.status !== 'won' && v.status !== 'draw') return false
  if (v.winner !== null && !isPlayer(v.winner)) return false
  const line = v.winningLine
  if (line !== null && !(Array.isArray(line) && line.length === 3 && line.every(isCellIndex))) return false
  const score = v.score
  return isObject(score) && isCount(score.p1) && isCount(score.p2) && isCount(score.draws)
}

/** Anything off the wire that is not exactly one of our messages is dropped. */
export function isRoomMessage(value: unknown): value is RoomMessage {
  if (!isObject(value)) return false
  switch (value.type) {
    case 'move':
      return isCellIndex(value.index)
    case 'new-game':
      return true
    case 'state':
      return isSnapshot(value.state)
    default:
      return false
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/room.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room.ts src/lib/room.test.ts
git commit -m "feat: room message types and validation"
```

---

### Task 4: Reducer `SYNC`, `snapshotOf`, `canSeatMove`

**Files:**
- Modify: `src/state/reducer.ts`
- Test: `src/state/reducer.test.ts`

**Interfaces:**
- Consumes: `Snapshot` from `@/lib/room`.
- Produces: `GameAction` gains `{ type: 'SYNC'; snapshot: Snapshot }`; `snapshotOf(state: GameState): Snapshot`; `canSeatMove(state: GameState, seat: Seat): boolean`.

- [ ] **Step 1: Write the failing tests**

Append to `src/state/reducer.test.ts` (import `canSeatMove`, `snapshotOf` from `./reducer`; the file already imports `createGameState`, `gameReducer`):

```ts
describe('online sync', () => {
  const settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' } as const

  it('snapshotOf carries exactly the shared fields', () => {
    const state = gameReducer(createGameState(settings), { type: 'MOVE', index: 4 })
    expect(snapshotOf(state)).toEqual({
      board: [null, null, null, null, 'X', null, null, null, null],
      p1Symbol: 'X',
      score: { p1: 0, p2: 0, draws: 0 },
      status: 'playing',
      winner: null,
      winningLine: null,
    })
    expect(snapshotOf(state)).not.toHaveProperty('settings')
    expect(snapshotOf(state)).not.toHaveProperty('recorded')
  })

  it('SYNC replaces the shared fields and keeps settings', () => {
    const host = gameReducer(createGameState(settings), { type: 'MOVE', index: 0 })
    const guest = gameReducer(createGameState(settings), { type: 'SYNC', snapshot: snapshotOf(host) })
    expect(guest.board).toEqual(host.board)
    expect(guest.settings).toEqual(settings)
    expect(guest.recorded).toBe(false)
  })

  it('SYNC of a changed board clears recorded; the same snapshot again keeps it', () => {
    let host = createGameState(settings)
    for (const i of [0, 3, 1, 4, 2]) host = gameReducer(host, { type: 'MOVE', index: i })
    expect(host.status).toBe('won')
    let guest = gameReducer(createGameState(settings), { type: 'SYNC', snapshot: snapshotOf(host) })
    expect(guest.recorded).toBe(false)
    guest = gameReducer(guest, { type: 'RECORDED' })
    guest = gameReducer(guest, { type: 'SYNC', snapshot: snapshotOf(host) })
    expect(guest.recorded).toBe(true)
    const next = gameReducer(host, { type: 'NEW_GAME' })
    guest = gameReducer(guest, { type: 'SYNC', snapshot: snapshotOf(next) })
    expect(guest.recorded).toBe(false)
    expect(guest.p1Symbol).toBe('X')
  })

  it('canSeatMove says whose turn it is and nothing when the game is over', () => {
    let state = createGameState(settings)
    expect(canSeatMove(state, 'p1')).toBe(true)
    expect(canSeatMove(state, 'p2')).toBe(false)
    state = gameReducer(state, { type: 'MOVE', index: 0 })
    expect(canSeatMove(state, 'p1')).toBe(false)
    expect(canSeatMove(state, 'p2')).toBe(true)
    for (const i of [3, 1, 4, 2]) state = gameReducer(state, { type: 'MOVE', index: i })
    expect(canSeatMove(state, 'p1')).toBe(false)
    expect(canSeatMove(state, 'p2')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/reducer.test.ts`
Expected: FAIL, `snapshotOf`/`canSeatMove` are not functions.

- [ ] **Step 3: Implement**

In `src/state/reducer.ts`:

```ts
import type { Snapshot } from '@/lib/room'
```

Extend the action union:

```ts
export type GameAction =
  | { type: 'MOVE'; index: number }
  | { type: 'NEW_GAME' }
  | { type: 'RECORDED' }
  | { type: 'SYNC'; snapshot: Snapshot }
```

Add helpers after `symbolOf`:

```ts
/** The fields the host shares with the guest. */
export function snapshotOf(state: GameState): Snapshot {
  const { board, p1Symbol, score, status, winner, winningLine } = state
  return { board, p1Symbol, score, status, winner, winningLine }
}

function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return (
    a.board.every((c, i) => c === b.board[i]) &&
    a.p1Symbol === b.p1Symbol &&
    a.status === b.status &&
    a.winner === b.winner &&
    a.score.p1 === b.score.p1 &&
    a.score.p2 === b.score.p2 &&
    a.score.draws === b.score.draws &&
    (a.winningLine === null ? b.winningLine === null : b.winningLine !== null && a.winningLine.every((n, i) => n === b.winningLine![i]))
  )
}

/** Whether the seat is to move right now. */
export function canSeatMove(state: GameState, seat: Seat): boolean {
  return state.status === 'playing' && seatOf(state, nextPlayer(state.board)) === seat
}
```

Add the case to `gameReducer`:

```ts
    case 'SYNC': {
      // A repeated snapshot (e.g. after a rejoin) must not record the same game twice.
      const same = sameSnapshot(snapshotOf(state), action.snapshot)
      return { ...state, ...action.snapshot, recorded: same ? state.recorded : false }
    }
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/reducer.ts src/state/reducer.test.ts
git commit -m "feat: SYNC action, snapshotOf, canSeatMove"
```

---

### Task 5: Referee reducer (`state/online.ts`)

**Files:**
- Create: `src/state/online.ts`
- Test: `src/state/online.test.ts`

**Interfaces:**
- Consumes: `gameReducer`, `canSeatMove`, `GameAction`, `GameState` from `./reducer`; `RoomMessage` from `@/lib/room`.
- Produces:

```ts
export type Role = 'host' | 'guest'
export type RoomAction = GameAction | { type: 'ROOM_MESSAGE'; message: RoomMessage }
export function roomReducer(role: Role | null): (state: GameState, action: RoomAction) => GameState
```

`Role` is defined in `src/lib/room.ts` (Task 6 adds it there); this task adds `export type Role = 'host' | 'guest'` to `lib/room.ts` now and `state/online.ts` re-exports it.

- [ ] **Step 1: Write the failing tests**

`src/state/online.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { roomReducer } from './online'
import { createGameState, gameReducer, snapshotOf } from './reducer'

const settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' } as const
const fresh = () => createGameState(settings)

describe('roomReducer host', () => {
  const host = roomReducer('host')

  it('plays its own moves on its turn only', () => {
    let s = host(fresh(), { type: 'MOVE', index: 0 })
    expect(s.board[0]).toBe('X')
    const again = host(s, { type: 'MOVE', index: 1 })
    expect(again).toBe(s)
  })

  it("applies a guest move on the guest's turn and drops it otherwise", () => {
    const early = host(fresh(), { type: 'ROOM_MESSAGE', message: { type: 'move', index: 4 } })
    expect(early.board.every((c) => c === null)).toBe(true)
    const afterHost = host(fresh(), { type: 'MOVE', index: 0 })
    const applied = host(afterHost, { type: 'ROOM_MESSAGE', message: { type: 'move', index: 4 } })
    expect(applied.board[4]).toBe('O')
    const taken = host(applied, { type: 'ROOM_MESSAGE', message: { type: 'move', index: 0 } })
    expect(taken).toBe(applied)
  })

  it('starts a new game on request and ignores state messages', () => {
    const s = host(fresh(), { type: 'MOVE', index: 0 })
    const next = host(s, { type: 'ROOM_MESSAGE', message: { type: 'new-game' } })
    expect(next.board.every((c) => c === null)).toBe(true)
    const other = gameReducer(fresh(), { type: 'MOVE', index: 8 })
    expect(host(s, { type: 'ROOM_MESSAGE', message: { type: 'state', state: snapshotOf(other) } })).toBe(s)
  })
})

describe('roomReducer guest', () => {
  const guest = roomReducer('guest')

  it('never changes its board from local moves or new game', () => {
    const s = fresh()
    expect(guest(s, { type: 'MOVE', index: 0 })).toBe(s)
    expect(guest(s, { type: 'NEW_GAME' })).toBe(s)
  })

  it('applies host state and ignores requests', () => {
    const hostState = gameReducer(fresh(), { type: 'MOVE', index: 0 })
    const synced = guest(fresh(), { type: 'ROOM_MESSAGE', message: { type: 'state', state: snapshotOf(hostState) } })
    expect(synced.board).toEqual(hostState.board)
    expect(guest(synced, { type: 'ROOM_MESSAGE', message: { type: 'move', index: 4 } })).toBe(synced)
    expect(guest(synced, { type: 'ROOM_MESSAGE', message: { type: 'new-game' } })).toBe(synced)
  })

  it('still records', () => {
    expect(guest(fresh(), { type: 'RECORDED' }).recorded).toBe(true)
  })
})

describe('roomReducer offline', () => {
  it('is the plain game reducer and ignores room messages', () => {
    const local = roomReducer(null)
    const s = local(fresh(), { type: 'MOVE', index: 0 })
    const t = local(s, { type: 'MOVE', index: 1 })
    expect(t.board.slice(0, 2)).toEqual(['X', 'O'])
    expect(local(t, { type: 'ROOM_MESSAGE', message: { type: 'new-game' } })).toBe(t)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/online.test.ts`
Expected: FAIL, cannot resolve `./online`.

- [ ] **Step 3: Implement**

Add to `src/lib/room.ts`:

```ts
export type Role = 'host' | 'guest'
```

`src/state/online.ts`:

```ts
import type { Role, RoomMessage } from '@/lib/room'
import { canSeatMove, gameReducer, type GameAction, type GameState } from './reducer'

export type { Role }

export type RoomAction = GameAction | { type: 'ROOM_MESSAGE'; message: RoomMessage }

/**
 * The host is the referee: its state is the truth, guest requests go through the ordinary
 * reducer, and a guest changes its own board only from the host's snapshots.
 * With no role this is the plain game reducer.
 */
export function roomReducer(role: Role | null): (state: GameState, action: RoomAction) => GameState {
  return (state, action) => {
    if (action.type === 'ROOM_MESSAGE') {
      const m = action.message
      if (role === 'host') {
        if (m.type === 'move') return canSeatMove(state, 'p2') ? gameReducer(state, { type: 'MOVE', index: m.index }) : state
        if (m.type === 'new-game') return gameReducer(state, { type: 'NEW_GAME' })
        return state
      }
      if (role === 'guest' && m.type === 'state') return gameReducer(state, { type: 'SYNC', snapshot: m.state })
      return state
    }
    if (role === 'guest' && (action.type === 'MOVE' || action.type === 'NEW_GAME')) return state
    if (role === 'host' && action.type === 'MOVE' && !canSeatMove(state, 'p1')) return state
    return gameReducer(state, action)
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state/online.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room.ts src/state/online.ts src/state/online.test.ts
git commit -m "feat: host referee reducer for online rooms"
```

---

### Task 6: Lobby presence rules and Supabase config reading

**Files:**
- Modify: `src/lib/room.ts`
- Test: `src/lib/room.test.ts`

**Interfaces:**
- Produces:

```ts
export type Member = { id: string; role: Role; joinedAt: number }
export type LobbyState = 'waiting' | 'playing' | 'full'
export function lobbyState(members: Member[], selfId: string): LobbyState
export type SupabaseConfig = { url: string; anonKey: string }
export function readSupabaseConfig(env: Record<string, unknown>): SupabaseConfig | null
```

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/room.test.ts` (import `lobbyState`, `readSupabaseConfig`, `type Member`):

```ts
describe('lobbyState', () => {
  const host: Member = { id: 'h', role: 'host', joinedAt: 1 }
  const g1: Member = { id: 'g1', role: 'guest', joinedAt: 2 }
  const g2: Member = { id: 'g2', role: 'guest', joinedAt: 3 }

  it('host waits alone and plays once any guest arrives', () => {
    expect(lobbyState([host], 'h')).toBe('waiting')
    expect(lobbyState([host, g1], 'h')).toBe('playing')
    expect(lobbyState([host, g1, g2], 'h')).toBe('playing')
  })

  it('guest waits without a host (empty or unknown code)', () => {
    expect(lobbyState([g1], 'g1')).toBe('waiting')
    expect(lobbyState([], 'g1')).toBe('waiting')
  })

  it('the first guest plays and any later guest finds the room full', () => {
    expect(lobbyState([host, g1, g2], 'g1')).toBe('playing')
    expect(lobbyState([host, g1, g2], 'g2')).toBe('full')
    expect(lobbyState([g2, host, g1], 'g1')).toBe('playing')
  })

  it('breaks a joinedAt tie by id', () => {
    const a: Member = { id: 'a', role: 'guest', joinedAt: 5 }
    const b: Member = { id: 'b', role: 'guest', joinedAt: 5 }
    expect(lobbyState([host, b, a], 'a')).toBe('playing')
    expect(lobbyState([host, b, a], 'b')).toBe('full')
  })

  it('after the first guest leaves, a new guest plays', () => {
    expect(lobbyState([host, g2], 'g2')).toBe('playing')
  })
})

describe('readSupabaseConfig', () => {
  it('reads both values', () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_ANON_KEY: 'key' })).toEqual({
      url: 'https://p.supabase.co',
      anonKey: 'key',
    })
  })

  it('is null when either is missing or blank', () => {
    expect(readSupabaseConfig({})).toBeNull()
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://p.supabase.co' })).toBeNull()
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_ANON_KEY: 'key' })).toBeNull()
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_ANON_KEY: 42 })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/room.test.ts`
Expected: FAIL, `lobbyState` is not a function.

- [ ] **Step 3: Implement**

Append to `src/lib/room.ts`:

```ts
export type Member = { id: string; role: Role; joinedAt: number }
export type LobbyState = 'waiting' | 'playing' | 'full'

const byArrival = (a: Member, b: Member) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * What the lobby shows this member. The host plays as soon as a guest is present. The first guest to
 * arrive plays; any later guest finds the room full. A guest with no host waits (an empty room and a
 * wrong code look the same without a server).
 */
export function lobbyState(members: Member[], selfId: string): LobbyState {
  const self = members.find((m) => m.id === selfId)
  const hostPresent = members.some((m) => m.role === 'host')
  const guests = members.filter((m) => m.role === 'guest').sort(byArrival)
  if (!self) return 'waiting'
  if (self.role === 'host') return guests.length > 0 ? 'playing' : 'waiting'
  if (!hostPresent) return 'waiting'
  return guests[0].id === selfId ? 'playing' : 'full'
}

export type SupabaseConfig = { url: string; anonKey: string }

/** Both values, or null when online play is not set up. The anon key is public by design. */
export function readSupabaseConfig(env: Record<string, unknown>): SupabaseConfig | null {
  const url = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  if (typeof url !== 'string' || typeof anonKey !== 'string') return null
  if (url.trim() === '' || anonKey.trim() === '') return null
  return { url: url.trim(), anonKey: anonKey.trim() }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/room.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room.ts src/lib/room.test.ts
git commit -m "feat: lobby presence rules and Supabase config reading"
```

---

### Task 7: `RoomConnection` interface and in-memory fake

**Files:**
- Create: `src/lib/roomConnection.ts`
- Test: `src/lib/roomConnection.test.ts`

**Interfaces:**
- Produces:

```ts
export type RoomConnection = {
  readonly selfId: string
  send(message: RoomMessage): void
  onMessage(handler: (message: RoomMessage) => void): () => void
  onPresence(handler: (members: Member[]) => void): () => void
  /** The members present right now. */
  members(): Member[]
  leave(): void
}
export type OpenRoom = (code: string, role: Role) => Promise<RoomConnection>
export type FakeRoom = { join(role: Role, id?: string): RoomConnection; members(): Member[] }
export function createFakeRoom(): FakeRoom
```

- [ ] **Step 1: Write the failing tests**

`src/lib/roomConnection.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createFakeRoom } from './roomConnection'
import type { Member, RoomMessage } from './room'

describe('fake room', () => {
  it('delivers messages to everyone else, not the sender', () => {
    const room = createFakeRoom()
    const host = room.join('host', 'h')
    const guest = room.join('guest', 'g')
    const seenByHost: RoomMessage[] = []
    const seenByGuest: RoomMessage[] = []
    host.onMessage((m) => seenByHost.push(m))
    guest.onMessage((m) => seenByGuest.push(m))
    guest.send({ type: 'move', index: 4 })
    expect(seenByHost).toEqual([{ type: 'move', index: 4 }])
    expect(seenByGuest).toEqual([])
  })

  it('tracks presence in join order and tells the others on join and leave', () => {
    const room = createFakeRoom()
    const host = room.join('host', 'h')
    const seen: Member[][] = []
    host.onPresence((members) => seen.push(members))
    const guest = room.join('guest', 'g')
    expect(host.members().map((m) => m.id)).toEqual(['h', 'g'])
    expect(host.members()[0].joinedAt).toBeLessThan(host.members()[1].joinedAt)
    expect(seen).toHaveLength(1)
    guest.leave()
    expect(host.members().map((m) => m.id)).toEqual(['h'])
    expect(seen).toHaveLength(2)
  })

  it('unsubscribes and stops delivering after leave', () => {
    const room = createFakeRoom()
    const host = room.join('host', 'h')
    const guest = room.join('guest', 'g')
    const handler = vi.fn()
    const off = host.onMessage(handler)
    off()
    guest.send({ type: 'new-game' })
    expect(handler).not.toHaveBeenCalled()
    const late = vi.fn()
    host.onMessage(late)
    host.leave()
    guest.send({ type: 'new-game' })
    expect(late).not.toHaveBeenCalled()
  })

  it('gives each member a distinct id when none is supplied', () => {
    const room = createFakeRoom()
    const a = room.join('host')
    const b = room.join('guest')
    expect(a.selfId).not.toBe(b.selfId)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/roomConnection.test.ts`
Expected: FAIL, cannot resolve `./roomConnection`.

- [ ] **Step 3: Implement**

`src/lib/roomConnection.ts`:

```ts
import type { Member, Role, RoomMessage } from './room'

/** One member's view of a room. Broadcast messages plus who is present. */
export type RoomConnection = {
  readonly selfId: string
  send(message: RoomMessage): void
  onMessage(handler: (message: RoomMessage) => void): () => void
  onPresence(handler: (members: Member[]) => void): () => void
  /** The members present right now. */
  members(): Member[]
  leave(): void
}

export type OpenRoom = (code: string, role: Role) => Promise<RoomConnection>

export type FakeRoom = { join(role: Role, id?: string): RoomConnection; members(): Member[] }

type Peer = {
  member: Member
  onMessage: Set<(m: RoomMessage) => void>
  onPresence: Set<(m: Member[]) => void>
}

/** Links connections in memory, synchronously. For tests. */
export function createFakeRoom(): FakeRoom {
  const peers: Peer[] = []
  let clock = 0
  let nextId = 0
  const members = () => peers.map((p) => p.member)
  const announce = () => {
    const snapshot = members()
    for (const p of peers) for (const h of p.onPresence) h(snapshot)
  }

  return {
    members,
    join(role, id = `member-${++nextId}`) {
      const peer: Peer = { member: { id, role, joinedAt: ++clock }, onMessage: new Set(), onPresence: new Set() }
      peers.push(peer)
      announce()
      return {
        selfId: id,
        send(message) {
          for (const p of peers) if (p !== peer) for (const h of p.onMessage) h(message)
        },
        onMessage(handler) {
          peer.onMessage.add(handler)
          return () => peer.onMessage.delete(handler)
        },
        onPresence(handler) {
          peer.onPresence.add(handler)
          return () => peer.onPresence.delete(handler)
        },
        members,
        leave() {
          const at = peers.indexOf(peer)
          if (at < 0) return
          peers.splice(at, 1)
          peer.onMessage.clear()
          peer.onPresence.clear()
          announce()
        },
      }
    },
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/roomConnection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roomConnection.ts src/lib/roomConnection.test.ts
git commit -m "feat: RoomConnection interface with an in-memory fake"
```

---

### Task 8: Share link helper (`platform/share.ts`)

**Files:**
- Create: `src/platform/share.ts`
- Test: `src/platform/share.test.ts`

**Interfaces:**
- Produces:

```ts
export type ShareResult = 'shared' | 'copied' | 'failed'
export type ShareLink = (link: string) => Promise<ShareResult>
export type ShareNavigator = {
  share?: (data: { url: string }) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
}
export function createShareLink(nav: ShareNavigator): ShareLink
```

- [ ] **Step 1: Write the failing tests**

`src/platform/share.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createShareLink } from './share'

describe('share link', () => {
  it('uses the share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const result = await createShareLink({ share })('https://x.test/?room=AB2C')
    expect(share).toHaveBeenCalledWith({ url: 'https://x.test/?room=AB2C' })
    expect(result).toBe('shared')
  })

  it('treats a dismissed share sheet as shared (nothing to report)', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'))
    expect(await createShareLink({ share })('https://x.test/?room=AB2C')).toBe('shared')
  })

  it('copies when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await createShareLink({ clipboard: { writeText } })('https://x.test/?room=AB2C')).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://x.test/?room=AB2C')
  })

  it('falls back to copying when sharing fails for another reason', async () => {
    const share = vi.fn().mockRejectedValue(new Error('not allowed'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await createShareLink({ share, clipboard: { writeText } })('https://x.test/')).toBe('copied')
  })

  it('reports failure when nothing works', async () => {
    expect(await createShareLink({})('https://x.test/')).toBe('failed')
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    expect(await createShareLink({ clipboard: { writeText } })('https://x.test/')).toBe('failed')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/platform/share.test.ts`
Expected: FAIL, cannot resolve `./share`.

- [ ] **Step 3: Implement**

`src/platform/share.ts`:

```ts
export type ShareResult = 'shared' | 'copied' | 'failed'
export type ShareLink = (link: string) => Promise<ShareResult>

export type ShareNavigator = {
  share?: (data: { url: string }) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
}

/** Web Share sheet where there is one, otherwise the clipboard. */
export function createShareLink(nav: ShareNavigator): ShareLink {
  return async (link) => {
    if (nav.share) {
      try {
        await nav.share({ url: link })
        return 'shared'
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'shared'
      }
    }
    try {
      await nav.clipboard?.writeText(link)
      return nav.clipboard ? 'copied' : 'failed'
    } catch {
      return 'failed'
    }
  }
}

export const shareLink: ShareLink = (link) =>
  createShareLink({
    share: typeof navigator !== 'undefined' && navigator.share ? (d) => navigator.share(d) : undefined,
    clipboard: typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : undefined,
  })(link)
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/platform/share.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/platform/share.ts src/platform/share.test.ts
git commit -m "feat: share a room link via the share sheet or clipboard"
```

---

### Task 9: `ScoreBar` and `StatusBar` online labels

**Files:**
- Modify: `src/components/ScoreBar.tsx`
- Modify: `src/components/StatusBar.tsx`
- Test: `src/components/StatusBar.test.tsx` (create), `src/components/ScoreBar.test.tsx` (create)

**Interfaces:**
- Produces: `ScoreBar` gains `youSeat?: Seat` (used when `mode === 'online'`); `statusText(state, youSeat?: Seat)`; `StatusBar` gains `youSeat?: Seat` and `message?: string` (overrides the text, no player mark).

- [ ] **Step 1: Write the failing tests**

`src/components/ScoreBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScoreBar } from './ScoreBar'

const score = { p1: 2, p2: 1, draws: 0 }
const label = (text: string) => screen.getByText(text, { selector: 'dt' })

describe('ScoreBar online', () => {
  it('reads You and Friend from the host', () => {
    render(<ScoreBar mode="online" score={score} p1Symbol="X" youSeat="p1" />)
    expect(label('You').nextElementSibling).toHaveTextContent('2')
    expect(label('Friend').nextElementSibling).toHaveTextContent('1')
  })

  it('reads You and Friend from the guest', () => {
    render(<ScoreBar mode="online" score={score} p1Symbol="X" youSeat="p2" />)
    expect(label('Friend').nextElementSibling).toHaveTextContent('2')
    expect(label('You').nextElementSibling).toHaveTextContent('1')
  })
})
```

`src/components/StatusBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBar, statusText } from './StatusBar'
import { createGameState, gameReducer } from '@/state/reducer'

const settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' } as const

describe('statusText online', () => {
  it('names the turn from each side', () => {
    const start = createGameState(settings)
    expect(statusText(start, 'p1')).toBe('Your turn')
    expect(statusText(start, 'p2')).toBe("Friend's turn")
    const after = gameReducer(start, { type: 'MOVE', index: 0 })
    expect(statusText(after, 'p1')).toBe("Friend's turn")
    expect(statusText(after, 'p2')).toBe('Your turn')
  })

  it('names the winner from each side', () => {
    let s = createGameState(settings)
    for (const i of [0, 3, 1, 4, 2]) s = gameReducer(s, { type: 'MOVE', index: i })
    expect(statusText(s, 'p1')).toBe('You win!')
    expect(statusText(s, 'p2')).toBe('Friend wins!')
  })
})

describe('StatusBar message override', () => {
  it('shows the message instead of the turn', () => {
    render(<StatusBar state={createGameState(settings)} youSeat="p1" message="Waiting for your friend…" />)
    expect(screen.getByText('Waiting for your friend…')).toBeInTheDocument()
    expect(screen.queryByText('Your turn')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/ScoreBar.test.tsx src/components/StatusBar.test.tsx`
Expected: FAIL. ScoreBar shows "Player 1"; `statusText` returns "Player 1's turn"; the message is not rendered.

- [ ] **Step 3: Implement**

`src/components/ScoreBar.tsx`:

```tsx
import type { Mode, Player, Seat } from '@/lib/types'

export type ScoreBarProps = {
  mode: Mode
  score: Score
  p1Symbol: Player
  /** Online: which seat this device holds, so the labels read You / Friend. */
  youSeat?: Seat
}

function seatLabels(mode: Mode, youSeat: Seat | undefined): [string, string] {
  if (mode === 'bot') return ['You', 'Bot']
  if (mode === 'online') return youSeat === 'p2' ? ['Friend', 'You'] : ['You', 'Friend']
  return ['Player 1', 'Player 2']
}

export function ScoreBar({ mode, score, p1Symbol, youSeat }: ScoreBarProps) {
  const p2Symbol: Player = p1Symbol === 'X' ? 'O' : 'X'
  const [one, two] = seatLabels(mode, youSeat)
  // …rest unchanged
```

`src/components/StatusBar.tsx`: replace `statusText` and the component signature:

```tsx
import type { Player, Seat } from '@/lib/types'

export function statusText(state: GameState, youSeat?: Seat): string {
  const mode = state.settings.mode
  if (state.status === 'draw') return "It's a draw"
  const player = state.status === 'won' && state.winner ? state.winner : nextPlayer(state.board)
  const seat = seatOf(state, player)
  if (mode === 'online') {
    const you = seat === (youSeat ?? 'p1')
    if (state.status === 'won') return you ? 'You win!' : 'Friend wins!'
    return you ? 'Your turn' : "Friend's turn"
  }
  if (state.status === 'won') {
    if (mode !== 'bot') return `${SEAT_NAME[seat]} wins!`
    return seat === 'p1' ? 'You win!' : 'Bot wins!'
  }
  if (mode !== 'bot') return `${SEAT_NAME[seat]}'s turn`
  return seat === 'p1' ? 'Your turn' : 'Bot is thinking…'
}

export function StatusBar({ state, youSeat, message }: { state: GameState; youSeat?: Seat; message?: string }) {
  const player = message ? null : statusPlayer(state)
  // …thinking/finished unchanged…
  // In the JSX: key={message ?? `${state.status}-${player ?? 'draw'}`} and render {message ?? statusText(state, youSeat)}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ScoreBar.tsx src/components/StatusBar.tsx src/components/ScoreBar.test.tsx src/components/StatusBar.test.tsx
git commit -m "feat: You / Friend labels for online games"
```

---

### Task 10: `SetupScreen` Online option, Create room, Join

**Files:**
- Modify: `src/components/SetupScreen.tsx`
- Test: `src/components/SetupScreen.test.tsx`

**Interfaces:**
- Produces:

```ts
export type OnlineSetup = { available: boolean; onCreate: () => void; onJoin: (code: string) => void }
// SetupScreenProps gains: online?: OnlineSetup   (default: { available: false, onCreate() {}, onJoin() {} })
```

- [ ] **Step 1: Write the failing tests**

Append to `src/components/SetupScreen.test.tsx`:

```tsx
describe('SetupScreen online', () => {
  const online = (over: Partial<{ available: boolean; onCreate: () => void; onJoin: (c: string) => void }> = {}) => ({
    available: true,
    onCreate: vi.fn(),
    onJoin: vi.fn(),
    ...over,
  })

  it('shows Online disabled with a hint when not set up', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} />)
    const item = screen.getByRole('button', { name: /online/i })
    expect(item).toBeDisabled()
    expect(screen.getByText('Not set up')).toBeInTheDocument()
  })

  it('replaces difficulty, symbol and Start with Create room and Join', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={online()} />)
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hard/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /your symbol/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /room code/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^join$/i })).toBeDisabled()
  })

  it('creates a room', () => {
    const o = online()
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={o} />)
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    expect(o.onCreate).toHaveBeenCalledTimes(1)
  })

  it('joins with a normalized code, by button or Enter', () => {
    const o = online()
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={o} />)
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    const input = screen.getByRole('textbox', { name: /room code/i })
    fireEvent.change(input, { target: { value: 'ab2' } })
    expect(screen.getByRole('button', { name: /^join$/i })).toBeDisabled()
    fireEvent.change(input, { target: { value: ' ab2c ' } })
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }))
    expect(o.onJoin).toHaveBeenCalledWith('AB2C')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(o.onJoin).toHaveBeenCalledTimes(2)
  })

  it('keeps the offline Start button for the other modes', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={online()} />)
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create room/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/SetupScreen.test.tsx`
Expected: FAIL, no button named Online.

- [ ] **Step 3: Implement**

In `src/components/SetupScreen.tsx`:

```tsx
import { normalizeRoomCode } from '@/lib/room'

export type OnlineSetup = { available: boolean; onCreate: () => void; onJoin: (code: string) => void }

const NO_ONLINE: OnlineSetup = { available: false, onCreate() {}, onJoin() {} }

export type SetupScreenProps = {
  initial?: Settings
  onStart: (settings: Settings) => void
  onOpenHistory: () => void
  /** Online play, when Supabase is configured. */
  online?: OnlineSetup
}
```

Component body additions:

```tsx
export function SetupScreen({ initial = DEFAULT_SETTINGS, onStart, onOpenHistory, online = NO_ONLINE }: SetupScreenProps) {
  const [mode, setMode] = useState<Mode>(initial.mode === 'online' && !online.available ? 'pvp' : initial.mode)
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty)
  const [symbol, setSymbol] = useState<Player>(initial.p1Symbol)
  const [codeInput, setCodeInput] = useState('')
  const joinCode = normalizeRoomCode(codeInput)
  const join = () => {
    if (joinCode) online.onJoin(joinCode)
  }
```

Mode toggle: `grid-cols-3`, add the third item:

```tsx
            <ToggleGroupItem
              value="online"
              className={cn(segmentItem, 'flex-col gap-0 leading-tight')}
              aria-label="Online"
              disabled={!online.available}
            >
              Online
              {!online.available && <span className="text-[11px] font-normal text-muted-foreground">Not set up</span>}
            </ToggleGroupItem>
```

Room field, rendered when `mode === 'online'` (after the bot fields):

```tsx
        {mode === 'online' && (
          <Field label="Room" hint="Play a friend on their phone" className="rise-in">
            <Button
              size="lg"
              className="min-h-14 w-full rounded-[18px] text-base font-semibold"
              onClick={online.onCreate}
            >
              Create room
            </Button>
            <div className="flex gap-2">
              <input
                aria-label="Room code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') join()
                }}
                placeholder="Code"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={8}
                inputMode="text"
                className="min-h-14 min-w-0 flex-1 rounded-[18px] border border-input bg-background px-4 text-center text-xl font-semibold uppercase tracking-[0.3em] outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                size="lg"
                variant="outline"
                className="min-h-14 rounded-[18px] px-6 text-base font-semibold"
                disabled={!joinCode}
                onClick={join}
              >
                Join
              </Button>
            </div>
          </Field>
        )}
```

Bottom buttons: wrap Start in `{mode !== 'online' && ( … )}`. Keep History always.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS (existing setup tests still use two-mode defaults).

- [ ] **Step 5: Commit**

```bash
git add src/components/SetupScreen.tsx src/components/SetupScreen.test.tsx
git commit -m "feat: Online option with Create room and Join on setup"
```

---

### Task 11: `GameScreen` online session

**Files:**
- Modify: `src/components/GameScreen.tsx`
- Test: `src/components/GameScreen.test.tsx`

**Interfaces:**
- Consumes: `roomReducer`, `RoomAction` from `@/state/online`; `snapshotOf`, `canSeatMove` from `@/state/reducer`; `RoomConnection`, `createFakeRoom` from `@/lib/roomConnection`.
- Produces:

```ts
export type OnlineSession = {
  role: Role
  code: string
  connection: RoomConnection
  /** Whether the other player is in the room right now. */
  friendPresent: boolean
}
// GameScreenProps gains: online?: OnlineSession
```

Behaviour: seat = host → `p1`, guest → `p2`. Guest taps send `{type:'move'}`; guest New game sends `{type:'new-game'}`. Host dispatches locally and broadcasts `snapshotOf(state)` after every state change while the friend is present. Both dispatch `ROOM_MESSAGE` for incoming messages. Board disabled when not your turn or the friend is absent. When `friendPresent` is false: guest sees "Your friend left" + Back; host sees "Your friend left" + Wait + Back; after Wait, the status reads "Waiting for your friend…" until the friend returns. Header badge `Online · CODE`. History saves `p1Symbol` as your own symbol.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/GameScreen.test.tsx`:

```tsx
import { createFakeRoom } from '@/lib/roomConnection'

const onlineSettings: Settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' }

/** Two GameScreens in one fake room; `host` and `guest` scope queries to each. */
function renderPair(storage = { host: fakeStorage(), guest: fakeStorage() }) {
  const room = createFakeRoom()
  const hostConn = room.join('host', 'h')
  const guestConn = room.join('guest', 'g')
  const onBack = { host: vi.fn(), guest: vi.fn() }
  const view = render(
    <>
      <div data-testid="host">
        <GameScreen
          settings={onlineSettings}
          storage={storage.host}
          feedback={recorder()}
          onBack={onBack.host}
          online={{ role: 'host', code: 'AB2C', connection: hostConn, friendPresent: true }}
        />
      </div>
      <div data-testid="guest">
        <GameScreen
          settings={onlineSettings}
          storage={storage.guest}
          feedback={recorder()}
          onBack={onBack.guest}
          online={{ role: 'guest', code: 'AB2C', connection: guestConn, friendPresent: true }}
        />
      </div>
    </>,
  )
  const within = (id: string) => screen.getByTestId(id)
  const cellIn = (id: string, n: number) =>
    Array.from(within(id).querySelectorAll('button')).find((b) => b.getAttribute('aria-label')?.startsWith(`Cell ${n},`))!
  return { view, room, hostConn, guestConn, onBack, within, cellIn, storage }
}

describe('GameScreen online', () => {
  it('labels the header and the seats from each side', () => {
    const { within } = renderPair()
    expect(within('host')).toHaveTextContent('Online · AB2C')
    expect(within('host')).toHaveTextContent('Your turn')
    expect(within('guest')).toHaveTextContent("Friend's turn")
  })

  it('host moves show on both boards; guest taps go through the host', () => {
    const { within, cellIn } = renderPair()
    expect(cellIn('guest', 1)).toBeDisabled()
    fireEvent.click(cellIn('host', 1))
    expect(cellIn('host', 1)).toHaveAccessibleName('Cell 1, X')
    expect(cellIn('guest', 1)).toHaveAccessibleName('Cell 1, X')
    expect(within('guest')).toHaveTextContent('Your turn')
    expect(cellIn('host', 2)).toBeDisabled()
    fireEvent.click(cellIn('guest', 5))
    expect(cellIn('host', 5)).toHaveAccessibleName('Cell 5, O')
    expect(cellIn('guest', 5)).toHaveAccessibleName('Cell 5, O')
  })

  it('a stale guest move request is dropped by the host', () => {
    const { guestConn, cellIn } = renderPair()
    guestConn.send({ type: 'move', index: 4 })
    expect(cellIn('host', 4)).toHaveAccessibleName('Cell 4, empty')
  })

  it('either side can start a new game', () => {
    const { within, cellIn } = renderPair()
    fireEvent.click(cellIn('host', 1))
    fireEvent.click(Array.from(within('guest').querySelectorAll('button')).find((b) => /new game/i.test(b.textContent ?? ''))!)
    expect(cellIn('host', 1)).toHaveAccessibleName('Cell 1, empty')
    expect(cellIn('guest', 1)).toHaveAccessibleName('Cell 1, empty')
  })

  it('records the finished game once on each device with its own symbol', () => {
    const { cellIn, storage } = renderPair()
    for (const [side, n] of [['host', 1], ['guest', 4], ['host', 2], ['guest', 5], ['host', 3]] as const) {
      fireEvent.click(cellIn(side, n))
    }
    expect(storage.host.entries()).toEqual([
      expect.objectContaining({ mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'X' }),
    ])
    expect(storage.guest.entries()).toEqual([
      expect.objectContaining({ mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'O' }),
    ])
  })

  it('does not record twice when the host resends the finished snapshot', () => {
    const { cellIn, storage, hostConn } = renderPair()
    for (const [side, n] of [['host', 1], ['guest', 4], ['host', 2], ['guest', 5], ['host', 3]] as const) {
      fireEvent.click(cellIn(side, n))
    }
    // Simulate the host's re-send on a rejoin: a second identical snapshot.
    const snapshot = JSON.parse(JSON.stringify(storage.guest)) // placeholder to keep TS quiet; replaced below
    void snapshot
    act(() => {
      hostConn.send({
        type: 'state',
        state: {
          board: ['X', 'X', 'X', 'O', 'O', null, null, null, null],
          p1Symbol: 'X',
          score: { p1: 1, p2: 0, draws: 0 },
          status: 'won',
          winner: 'X',
          winningLine: [0, 1, 2],
        },
      })
    })
    expect(storage.guest.entries()).toHaveLength(1)
  })

  it('the host sees Wait and Back when the guest leaves, and play resumes on return', () => {
    const room = createFakeRoom()
    const hostConn = room.join('host', 'h')
    const onBack = vi.fn()
    const base = { settings: onlineSettings, storage: fakeStorage(), feedback: recorder(), onBack }
    const view = render(
      <GameScreen {...base} online={{ role: 'host', code: 'AB2C', connection: hostConn, friendPresent: true }} />,
    )
    fireEvent.click(cell(1))
    view.rerender(<GameScreen {...base} online={{ role: 'host', code: 'AB2C', connection: hostConn, friendPresent: false }} />)
    expect(screen.getByText('Your friend left')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^wait$/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^wait$/i }))
    expect(screen.getByText('Waiting for your friend…')).toBeInTheDocument()
    expect(cell(2)).toBeDisabled()
    view.rerender(<GameScreen {...base} online={{ role: 'host', code: 'AB2C', connection: hostConn, friendPresent: true }} />)
    expect(screen.queryByText('Waiting for your friend…')).not.toBeInTheDocument()
    expect(cell(1)).toHaveAccessibleName('Cell 1, X')
    expect(screen.getByText("Friend's turn")).toBeInTheDocument()
  })

  it('the guest sees only Back when the host leaves', () => {
    const room = createFakeRoom()
    const guestConn = room.join('guest', 'g')
    const onBack = vi.fn()
    const base = { settings: onlineSettings, storage: fakeStorage(), feedback: recorder(), onBack }
    render(<GameScreen {...base} online={{ role: 'guest', code: 'AB2C', connection: guestConn, friendPresent: false }} />)
    expect(screen.getByText('Your friend left')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^wait$/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /^back$/i })[1] ?? screen.getAllByRole('button', { name: /back/i })[0])
    expect(onBack).toHaveBeenCalled()
  })

  it('the host sends its state to a friend who arrives', () => {
    const room = createFakeRoom()
    const hostConn = room.join('host', 'h')
    const base = { settings: onlineSettings, storage: fakeStorage(), feedback: recorder(), onBack: () => {} }
    const view = render(
      <GameScreen {...base} online={{ role: 'host', code: 'AB2C', connection: hostConn, friendPresent: false }} />,
    )
    const guestConn = room.join('guest', 'g')
    const seen: unknown[] = []
    guestConn.onMessage((m) => seen.push(m))
    view.rerender(<GameScreen {...base} online={{ role: 'host', code: 'AB2C', connection: hostConn, friendPresent: true }} />)
    expect(seen).toEqual([expect.objectContaining({ type: 'state' })])
  })
})
```

Remove the two `snapshot` placeholder lines from the "does not record twice" test before running (they are not needed; the hand-written snapshot below them is the fixture).

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/GameScreen.test.tsx`
Expected: FAIL. Header lacks `Online · AB2C`, guest board is enabled, etc.

- [ ] **Step 3: Implement**

`src/components/GameScreen.tsx`:

```tsx
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { RoomConnection } from '@/lib/roomConnection'
import type { Role } from '@/lib/room'
import type { Board as BoardModel, Outcome, Seat, Settings } from '@/lib/types'
import { roomReducer } from '@/state/online'
import { canSeatMove, createGameState, seatOf, snapshotOf, symbolOf } from '@/state/reducer'

export type OnlineSession = {
  role: Role
  code: string
  connection: RoomConnection
  /** Whether the other player is in the room right now. */
  friendPresent: boolean
}

export type GameScreenProps = {
  settings: Settings
  storage: HistoryStorage
  feedback: Feedback
  onBack: () => void
  online?: OnlineSession
}

export function GameScreen({ settings, storage, feedback, onBack, online }: GameScreenProps) {
  const role = online?.role ?? null
  const reducer = useMemo(() => roomReducer(role), [role])
  const [state, dispatch] = useReducer(reducer, settings, createGameState)
  const recordedBoard = useRef<BoardModel | null>(null)
  const previousBoard = useRef(state.board)
  const [waiting, setWaiting] = useState(false)

  const seat: Seat = role === 'guest' ? 'p2' : 'p1'
  const friendPresent = online ? online.friendPresent : true
  const connection = online?.connection

  // Incoming room messages, from either side.
  useEffect(() => {
    if (!connection) return
    return connection.onMessage((message) => dispatch({ type: 'ROOM_MESSAGE', message }))
  }, [connection])

  // The host shares its state after every change and whenever the friend (re)joins.
  useEffect(() => {
    if (role !== 'host' || !connection || !friendPresent) return
    connection.send({ type: 'state', state: snapshotOf(state) })
  }, [role, connection, friendPresent, state])

  // The friend came back: drop the waiting notice.
  useEffect(() => {
    if (friendPresent) setWaiting(false)
  }, [friendPresent])

  const play = (index: number) => {
    if (role === 'guest') connection?.send({ type: 'move', index })
    else dispatch({ type: 'MOVE', index })
  }
  const newGame = () => {
    if (role === 'guest') connection?.send({ type: 'new-game' })
    else dispatch({ type: 'NEW_GAME' })
  }
```

Keep the bot, feedback, and history effects. In the history effect change `p1Symbol: state.p1Symbol` to `p1Symbol: online ? symbolOf(state, seat) : state.p1Symbol` and add `online`/`seat` to the deps. Derived values:

```tsx
  const finished = state.status !== 'playing'
  const myTurn = online ? canSeatMove(state, seat) : true
  const friendLeft = online !== undefined && !friendPresent
  const badge =
    settings.mode === 'bot' ? `Bot · ${DIFFICULTY_LABEL[settings.difficulty]}` : settings.mode === 'online' ? `Online · ${online?.code ?? ''}` : 'Two player'
```

JSX changes: badge text → `{badge}`; `ScoreBar` gets `youSeat={online ? seat : undefined}`; `StatusBar` gets `youSeat={online ? seat : undefined}` and `message={friendLeft && waiting ? 'Waiting for your friend…' : undefined}`; `Board` `disabled={finished || isBotTurn || !myTurn || friendLeft}` and `onSelect={play}`; New game `onClick={newGame}`. Insert the friend-left panel above the board area (inside the `my-auto` column, before `StatusBar`):

```tsx
        {friendLeft && !waiting && (
          <div role="alert" className="rise-in flex flex-col items-center gap-4 rounded-[18px] bg-muted/70 p-5 text-center dark:bg-muted/50">
            <p className="text-lg font-semibold">Your friend left</p>
            <div className="flex w-full gap-2">
              {role === 'host' && (
                <Button variant="outline" className="min-h-12 flex-1 rounded-[16px] text-base" onClick={() => setWaiting(true)}>
                  Wait
                </Button>
              )}
              <Button className="min-h-12 flex-1 rounded-[16px] text-base font-semibold" onClick={onBack}>
                Back
              </Button>
            </div>
          </div>
        )}
```

- [ ] **Step 4: Run all tests**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GameScreen.tsx src/components/GameScreen.test.tsx
git commit -m "feat: GameScreen plays over a room connection"
```

---

### Task 12: `OnlineLobby`

**Files:**
- Create: `src/components/OnlineLobby.tsx`
- Test: `src/components/OnlineLobby.test.tsx`

**Interfaces:**
- Consumes: `ShareLink` from `@/platform/share`; `Role` from `@/lib/room`.
- Produces:

```ts
export type LobbyStatus = 'connecting' | 'waiting' | 'full' | 'error'
export type OnlineLobbyProps = {
  code: string
  role: Role
  status: LobbyStatus
  link: string
  share: ShareLink
  onCancel: () => void
}
```

- [ ] **Step 1: Write the failing tests**

`src/components/OnlineLobby.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OnlineLobby } from './OnlineLobby'

const base = { code: 'AB2C', link: 'https://x.test/?room=AB2C', onCancel: () => {} }

describe('OnlineLobby', () => {
  it('shows the code, waits, and lets the host share', async () => {
    const share = vi.fn().mockResolvedValue('copied')
    render(<OnlineLobby {...base} role="host" status="waiting" share={share} />)
    expect(screen.getByText('AB2C')).toBeInTheDocument()
    expect(screen.getByText('Waiting for your friend…')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    expect(share).toHaveBeenCalledWith('https://x.test/?room=AB2C')
    await waitFor(() => expect(screen.getByText('Link copied')).toBeInTheDocument())
  })

  it('tells the host when sharing failed', async () => {
    render(<OnlineLobby {...base} role="host" status="waiting" share={vi.fn().mockResolvedValue('failed')} />)
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    await waitFor(() => expect(screen.getByText(/couldn't share/i)).toBeInTheDocument())
  })

  it('the guest has no Share button and can cancel', () => {
    const onCancel = vi.fn()
    render(<OnlineLobby {...base} role="guest" status="waiting" share={vi.fn()} onCancel={onCancel} />)
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows connecting, full and error states with Back', () => {
    const { rerender } = render(<OnlineLobby {...base} role="guest" status="connecting" share={vi.fn()} />)
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
    rerender(<OnlineLobby {...base} role="guest" status="full" share={vi.fn()} />)
    expect(screen.getByText('Room is full')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    rerender(<OnlineLobby {...base} role="host" status="error" share={vi.fn()} />)
    expect(screen.getByText("Couldn't connect")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/OnlineLobby.test.tsx`
Expected: FAIL, cannot resolve `./OnlineLobby`.

- [ ] **Step 3: Implement**

`src/components/OnlineLobby.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Role } from '@/lib/room'
import type { ShareLink, ShareResult } from '@/platform/share'
import { cn } from '@/lib/utils'

export type LobbyStatus = 'connecting' | 'waiting' | 'full' | 'error'

export type OnlineLobbyProps = {
  code: string
  role: Role
  status: LobbyStatus
  link: string
  share: ShareLink
  onCancel: () => void
}

const STATUS_TEXT: Record<LobbyStatus, string> = {
  connecting: 'Connecting…',
  waiting: 'Waiting for your friend…',
  full: 'Room is full',
  error: "Couldn't connect",
}

const SHARE_NOTE: Record<ShareResult, string> = {
  shared: '',
  copied: 'Link copied',
  failed: "Couldn't share. Read the code aloud instead.",
}

export function OnlineLobby({ code, role, status, link, share, onCancel }: OnlineLobbyProps) {
  const [note, setNote] = useState('')
  const canShare = role === 'host' && status === 'waiting'
  const settled = status === 'full' || status === 'error'

  return (
    <section className="flex flex-1 flex-col gap-8">
      <header className="flex items-center">
        <Button variant="ghost" size="sm" onClick={onCancel} className="-ml-2 min-h-11 rounded-xl px-2.5 text-[15px]">
          ← Back
        </Button>
      </header>

      <div className="my-auto flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Room code</p>
        <p aria-label="Room code" className="text-[4rem] font-bold leading-none tracking-[0.25em]">
          {code}
        </p>
        <p
          aria-live="polite"
          className={cn('text-lg font-semibold', settled ? 'text-foreground' : 'text-muted-foreground', status === 'waiting' && 'status-thinking')}
        >
          {STATUS_TEXT[status]}
        </p>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {canShare && (
          <Button
            size="lg"
            className="min-h-14 w-full rounded-[18px] text-base font-semibold"
            onClick={() => {
              void share(link).then((result) => setNote(SHARE_NOTE[result]))
            }}
          >
            Share
          </Button>
        )}
        <Button
          size="lg"
          variant={canShare ? 'outline' : 'default'}
          className="min-h-14 w-full rounded-[18px] text-base font-semibold"
          onClick={onCancel}
        >
          {settled ? 'Back' : 'Cancel'}
        </Button>
      </div>
    </section>
  )
}
```

Note the header Back and the bottom button both call `onCancel`; tests for "Back" use `getByRole('button', { name: /^back$/i })`, which only matches the bottom button because the header button's name is "← Back".

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/OnlineLobby.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/OnlineLobby.tsx src/components/OnlineLobby.test.tsx
git commit -m "feat: online lobby with code, share, and status"
```

---

### Task 13: `OnlineGame` orchestration

**Files:**
- Create: `src/components/OnlineGame.tsx`
- Test: `src/components/OnlineGame.test.tsx`

**Interfaces:**
- Consumes: `OpenRoom`, `RoomConnection` from `@/lib/roomConnection`; `lobbyState`, `roomLink`, `Member`, `Role` from `@/lib/room`; `OnlineLobby`; `GameScreen` with `online`.
- Produces:

```ts
export type OnlineGameProps = {
  code: string
  role: Role
  openRoom: OpenRoom
  storage: HistoryStorage
  feedback: Feedback
  share: ShareLink
  /** The app's own URL, for the share link. */
  baseUrl: string
  onBack: () => void
}
```

Behaviour: on mount open the room. Until it resolves: lobby `connecting`. Rejection: lobby `error`. Connected: `lobbyState(members, selfId)`. Guest `full` before ever playing: lobby `full`, leave the room. First `playing`: mount `GameScreen` and keep it mounted; `friendPresent = lobby === 'playing'`. Unmount or Back: leave. A connection resolving after unmount is closed.

- [ ] **Step 1: Write the failing tests**

`src/components/OnlineGame.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OnlineGame } from './OnlineGame'
import type { Feedback } from '@/lib/feedback'
import type { HistoryStorage } from '@/lib/history'
import type { Role } from '@/lib/room'
import { createFakeRoom, type FakeRoom, type OpenRoom, type RoomConnection } from '@/lib/roomConnection'

const storage: HistoryStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const feedback: Feedback = { play: () => {} }
const share = vi.fn().mockResolvedValue('copied')

const immediate = (room: FakeRoom): OpenRoom => (_code, role) => Promise.resolve(room.join(role))

function renderSide(room: FakeRoom, role: Role, open: OpenRoom = immediate(room), onBack = vi.fn()) {
  const view = render(
    <div data-testid={role}>
      <OnlineGame code="AB2C" role={role} openRoom={open} storage={storage} feedback={feedback} share={share} baseUrl="https://x.test/app/" onBack={onBack} />
    </div>,
  )
  return { view, onBack, el: () => screen.getByTestId(role) }
}

const flush = () => act(async () => {})

describe('OnlineGame', () => {
  it('host waits, then both play when the guest arrives', async () => {
    const room = createFakeRoom()
    const host = renderSide(room, 'host')
    expect(host.el()).toHaveTextContent('Connecting…')
    await flush()
    expect(host.el()).toHaveTextContent('Waiting for your friend…')
    expect(host.el()).toHaveTextContent('AB2C')
    const guest = renderSide(room, 'guest')
    await flush()
    expect(host.el()).toHaveTextContent('Your turn')
    expect(guest.el()).toHaveTextContent("Friend's turn")
    expect(room.members()).toHaveLength(2)
  })

  it('a third player finds the room full and is disconnected', async () => {
    const room = createFakeRoom()
    renderSide(room, 'host')
    renderSide(room, 'guest')
    await flush()
    const third = renderSide(room, 'guest')
    await flush()
    expect(third.el()).toHaveTextContent('Room is full')
    expect(room.members()).toHaveLength(2)
    fireEvent.click(Array.from(third.el().querySelectorAll('button')).find((b) => b.textContent === 'Back')!)
    expect(third.onBack).toHaveBeenCalled()
  })

  it('a guest with no host waits and can cancel', async () => {
    const room = createFakeRoom()
    const guest = renderSide(room, 'guest')
    await flush()
    expect(guest.el()).toHaveTextContent('Waiting for your friend…')
    fireEvent.click(Array.from(guest.el().querySelectorAll('button')).find((b) => b.textContent === 'Cancel')!)
    expect(guest.onBack).toHaveBeenCalled()
    guest.view.unmount()
    expect(room.members()).toHaveLength(0)
  })

  it('shows Couldn\'t connect when the room cannot be opened', async () => {
    const room = createFakeRoom()
    const host = renderSide(room, 'host', () => Promise.reject(new Error('offline')))
    await flush()
    expect(host.el()).toHaveTextContent("Couldn't connect")
  })

  it('the host stays in the game when the guest leaves and resumes when one returns', async () => {
    const room = createFakeRoom()
    const host = renderSide(room, 'host')
    const guest = renderSide(room, 'guest')
    await flush()
    const hostCell = (n: number) =>
      Array.from(host.el().querySelectorAll('button')).find((b) => b.getAttribute('aria-label')?.startsWith(`Cell ${n},`))!
    fireEvent.click(hostCell(1))
    guest.view.unmount()
    await flush()
    expect(host.el()).toHaveTextContent('Your friend left')
    fireEvent.click(Array.from(host.el().querySelectorAll('button')).find((b) => b.textContent === 'Wait')!)
    const again = renderSide(room, 'guest')
    await flush()
    expect(host.el()).toHaveTextContent("Friend's turn")
    const guestCell = (n: number) =>
      Array.from(again.el().querySelectorAll('button')).find((b) => b.getAttribute('aria-label')?.startsWith(`Cell ${n},`))!
    expect(guestCell(1)).toHaveAccessibleName('Cell 1, X')
  })

  it('the guest sees the friend-left notice when the host leaves', async () => {
    const room = createFakeRoom()
    const host = renderSide(room, 'host')
    const guest = renderSide(room, 'guest')
    await flush()
    host.view.unmount()
    await flush()
    expect(guest.el()).toHaveTextContent('Your friend left')
    expect(Array.from(guest.el().querySelectorAll('button')).some((b) => b.textContent === 'Wait')).toBe(false)
  })

  it('closes a connection that resolves after cancelling', async () => {
    const room = createFakeRoom()
    let resolve!: (c: RoomConnection) => void
    const late: OpenRoom = () => new Promise((r) => (resolve = r))
    const host = renderSide(room, 'host', late)
    host.view.unmount()
    resolve(room.join('host'))
    await flush()
    expect(room.members()).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/OnlineGame.test.tsx`
Expected: FAIL, cannot resolve `./OnlineGame`.

- [ ] **Step 3: Implement**

`src/components/OnlineGame.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { GameScreen } from './GameScreen'
import { OnlineLobby, type LobbyStatus } from './OnlineLobby'
import type { Feedback } from '@/lib/feedback'
import type { HistoryStorage } from '@/lib/history'
import { lobbyState, roomLink, type Member, type Role } from '@/lib/room'
import type { OpenRoom, RoomConnection } from '@/lib/roomConnection'
import type { Settings } from '@/lib/types'
import type { ShareLink } from '@/platform/share'

export type OnlineGameProps = {
  code: string
  role: Role
  openRoom: OpenRoom
  storage: HistoryStorage
  feedback: Feedback
  share: ShareLink
  /** The app's own URL, for the share link. */
  baseUrl: string
  onBack: () => void
}

/** The host is p1 and plays X in the first game; after that the usual seat rules apply. */
const ONLINE_SETTINGS: Settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' }

export function OnlineGame({ code, role, openRoom, storage, feedback, share, baseUrl, onBack }: OnlineGameProps) {
  const [connection, setConnection] = useState<RoomConnection | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [failed, setFailed] = useState(false)
  const [started, setStarted] = useState(false)
  const live = useRef<RoomConnection | null>(null)

  useEffect(() => {
    let cancelled = false
    let unsubscribe = () => {}
    openRoom(code, role).then(
      (conn) => {
        if (cancelled) {
          conn.leave()
          return
        }
        live.current = conn
        unsubscribe = conn.onPresence(setMembers)
        setMembers(conn.members())
        setConnection(conn)
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
      unsubscribe()
      live.current?.leave()
      live.current = null
    }
  }, [openRoom, code, role])

  const lobby = connection ? lobbyState(members, connection.selfId) : 'waiting'
  const full = !started && lobby === 'full'

  useEffect(() => {
    if (lobby === 'playing') setStarted(true)
  }, [lobby])

  // A latecomer is told the room is full and disconnected straight away.
  useEffect(() => {
    if (full) {
      live.current?.leave()
      live.current = null
    }
  }, [full])

  if (started && connection) {
    return (
      <GameScreen
        settings={ONLINE_SETTINGS}
        storage={storage}
        feedback={feedback}
        onBack={onBack}
        online={{ role, code, connection, friendPresent: lobby === 'playing' }}
      />
    )
  }

  const status: LobbyStatus = failed ? 'error' : !connection ? 'connecting' : full ? 'full' : 'waiting'
  return <OnlineLobby code={code} role={role} status={status} link={roomLink(baseUrl, code)} share={share} onCancel={onBack} />
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/OnlineGame.tsx src/components/OnlineGame.test.tsx
git commit -m "feat: OnlineGame connects, waits in the lobby, then plays"
```

---

### Task 14: Supabase transport, dependency, env template

**Files:**
- Create: `src/platform/supabaseRoom.ts`
- Create: `.env.example`
- Modify: `.gitignore`, `package.json` (via npm)
- Test: `src/platform/supabaseRoom.test.ts` (one test: members are read from presence state)

**Interfaces:**
- Produces: `createSupabaseOpenRoom(config: SupabaseConfig): OpenRoom`; exported helper `membersFromPresence(state: Record<string, { role?: unknown; joinedAt?: unknown }[]>): Member[]`.

- [ ] **Step 1: Install the client**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: Write the failing test**

`src/platform/supabaseRoom.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { membersFromPresence } from './supabaseRoom'

describe('membersFromPresence', () => {
  it('turns presence state into members and drops malformed entries', () => {
    const members = membersFromPresence({
      h: [{ role: 'host', joinedAt: 10 }],
      g: [{ role: 'guest', joinedAt: 20 }, { role: 'guest', joinedAt: 25 }],
      junk: [{ role: 'spectator', joinedAt: 1 }],
      noTime: [{ role: 'guest' }],
    })
    expect(members).toEqual([
      { id: 'h', role: 'host', joinedAt: 10 },
      { id: 'g', role: 'guest', joinedAt: 20 },
    ])
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/platform/supabaseRoom.test.ts`
Expected: FAIL, cannot resolve `./supabaseRoom`.

- [ ] **Step 4: Implement**

`src/platform/supabaseRoom.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { newEntryId } from '@/lib/history'
import { isRoomMessage, type Member, type Role, type RoomMessage, type SupabaseConfig } from '@/lib/room'
import type { OpenRoom, RoomConnection } from '@/lib/roomConnection'

const CONNECT_TIMEOUT_MS = 10_000
const EVENT = 'msg'

type PresenceMeta = { role?: unknown; joinedAt?: unknown }

/** One member per presence key; the first tracked meta wins. */
export function membersFromPresence(state: Record<string, PresenceMeta[]>): Member[] {
  const members: Member[] = []
  for (const [id, metas] of Object.entries(state)) {
    const meta = metas[0]
    if (!meta) continue
    if ((meta.role !== 'host' && meta.role !== 'guest') || typeof meta.joinedAt !== 'number') continue
    members.push({ id, role: meta.role, joinedAt: meta.joinedAt })
  }
  return members
}

/** Realtime broadcast + presence on channel `ttt-room:<CODE>`. No tables, no auth. */
export function createSupabaseOpenRoom(config: SupabaseConfig): OpenRoom {
  return (code: string, role: Role) =>
    new Promise<RoomConnection>((resolve, reject) => {
      const client = createClient(config.url, config.anonKey, { auth: { persistSession: false } })
      const selfId = newEntryId()
      const channel = client.channel(`ttt-room:${code}`, {
        config: { broadcast: { self: false }, presence: { key: selfId } },
      })
      const messageHandlers = new Set<(m: RoomMessage) => void>()
      const presenceHandlers = new Set<(m: Member[]) => void>()
      let members: Member[] = []
      let settled = false

      channel.on('presence', { event: 'sync' }, () => {
        members = membersFromPresence(channel.presenceState<PresenceMeta>())
        for (const h of presenceHandlers) h(members)
      })
      channel.on('broadcast', { event: EVENT }, ({ payload }) => {
        if (isRoomMessage(payload)) for (const h of messageHandlers) h(payload)
      })

      const connection: RoomConnection = {
        selfId,
        send: (message) => {
          void channel.send({ type: 'broadcast', event: EVENT, payload: message })
        },
        onMessage: (h) => {
          messageHandlers.add(h)
          return () => messageHandlers.delete(h)
        },
        onPresence: (h) => {
          presenceHandlers.add(h)
          return () => presenceHandlers.delete(h)
        },
        members: () => members,
        leave: () => {
          void client.removeChannel(channel)
        },
      }

      const timer = setTimeout(() => fail(new Error('Timed out connecting to the room')), CONNECT_TIMEOUT_MS)
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        connection.leave()
        reject(error)
      }

      channel.subscribe(async (status, error) => {
        if (status === 'SUBSCRIBED') {
          if (settled) return
          settled = true
          clearTimeout(timer)
          await channel.track({ role, joinedAt: Date.now() })
          resolve(connection)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          fail(error ?? new Error(status))
        }
      })
    })
}
```

`.env.example`:

```
# Online play with friends (Supabase Realtime). Leave blank to disable the Online option.
# Project URL and anon (public) key from Supabase → Project Settings → API.
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.gitignore`: add a line `.env` (keeps the owner's real values out of git; `*.local` already covers `.env.local`).

Check `import.meta.env` typing: run `grep -rn "vite/client" src tsconfig*.json`. If nothing is found, create `src/vite-env.d.ts` containing `/// <reference types="vite/client" />`.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/platform/supabaseRoom.ts src/platform/supabaseRoom.test.ts .env.example .gitignore
git commit -m "feat: Supabase Realtime room transport"
```

(Add `src/vite-env.d.ts` to the commit if it was created.)

---

### Task 15: App wiring and `?room=` links

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `App` accepts optional `deps?: { openRoom?: OpenRoom | null; share?: ShareLink; url?: string; replaceUrl?: (url: string) => void }`. Defaults: `openRoom` from `readSupabaseConfig(import.meta.env)` → `createSupabaseOpenRoom` or `null`; `share` = `shareLink`; `url` = `window.location.href`; `replaceUrl` = `history.replaceState(null, '', url)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/App.test.tsx` (add imports `act`, `createFakeRoom`, `type OpenRoom`):

```tsx
import { createFakeRoom, type OpenRoom } from '@/lib/roomConnection'

describe('App online', () => {
  const flush = () => act(async () => {})

  it('disables Online when Supabase is not configured', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /online/i })).toBeDisabled()
  })

  it('creates a room and shows the lobby, then returns to setup on cancel', async () => {
    const room = createFakeRoom()
    const openRoom: OpenRoom = (_c, role) => Promise.resolve(room.join(role))
    render(<App deps={{ openRoom, share: async () => 'copied', url: 'https://x.test/app/' }} />)
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    await flush()
    expect(screen.getByText('Waiting for your friend…')).toBeInTheDocument()
    expect(room.members()).toEqual([expect.objectContaining({ role: 'host' })])
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
    expect(room.members()).toHaveLength(0)
  })

  it('opens straight into joining from a ?room= link and cleans the address bar', async () => {
    const room = createFakeRoom()
    room.join('host', 'h')
    const joined: string[] = []
    const openRoom: OpenRoom = (code, role) => {
      joined.push(`${role}:${code}`)
      return Promise.resolve(room.join(role))
    }
    const replaceUrl = vi.fn()
    render(<App deps={{ openRoom, share: async () => 'copied', url: 'https://x.test/app/?room=ab2c', replaceUrl }} />)
    await flush()
    expect(joined).toEqual(['guest:AB2C'])
    expect(replaceUrl).toHaveBeenCalledWith('https://x.test/app/')
    expect(screen.getByText("Friend's turn")).toBeInTheDocument()
  })

  it('ignores a garbage ?room= link', () => {
    const openRoom: OpenRoom = () => Promise.reject(new Error('should not be called'))
    render(<App deps={{ openRoom, share: async () => 'copied', url: 'https://x.test/app/?room=zz' }} />)
    expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
  })

  it('does not remember Online as the setup mode', async () => {
    const room = createFakeRoom()
    const openRoom: OpenRoom = (_c, role) => Promise.resolve(room.join(role))
    const first = render(<App deps={{ openRoom, share: async () => 'copied', url: 'https://x.test/app/' }} />)
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    await flush()
    first.unmount()
    render(<App deps={{ openRoom, share: async () => 'copied', url: 'https://x.test/app/' }} />)
    expect(screen.getByRole('button', { name: /two player/i })).toHaveAttribute('aria-pressed', 'true')
  })
})
```

Add `vi` to the vitest import in `App.test.tsx`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL. No Online button / `deps` prop unknown.

- [ ] **Step 3: Implement**

`src/App.tsx`:

```tsx
import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { GameScreen } from '@/components/GameScreen'
import { HistorySheet } from '@/components/HistorySheet'
import { OnlineGame } from '@/components/OnlineGame'
import { SetupScreen } from '@/components/SetupScreen'
import type { HistoryStorage } from '@/lib/history'
import { createRoomCode, readSupabaseConfig, roomCodeFromUrl, withoutRoomParam, type Role } from '@/lib/room'
import type { OpenRoom } from '@/lib/roomConnection'
import { loadSetup, saveSetup } from '@/lib/setup'
import type { Settings } from '@/lib/types'
import { createBrowserFeedback } from '@/platform/browserFeedback'
import { shareLink, type ShareLink } from '@/platform/share'
import { createSupabaseOpenRoom } from '@/platform/supabaseRoom'

// …noopStorage / browserStorage / storage / feedback unchanged…

export type AppDeps = {
  /** Null when online play is not configured. */
  openRoom?: OpenRoom | null
  share?: ShareLink
  /** The page URL at load, for `?room=` links. */
  url?: string
  replaceUrl?: (url: string) => void
}

function defaultOpenRoom(): OpenRoom | null {
  const config = readSupabaseConfig(import.meta.env as Record<string, unknown>)
  return config ? createSupabaseOpenRoom(config) : null
}

type Screen = { kind: 'setup' } | { kind: 'game'; settings: Settings } | { kind: 'online'; role: Role; code: string }

export default function App({ deps = {} }: { deps?: AppDeps }) {
  const [openRoom] = useState<OpenRoom | null>(() => (deps.openRoom === undefined ? defaultOpenRoom() : deps.openRoom))
  const share = deps.share ?? shareLink
  const url = deps.url ?? window.location.href
  const replaceUrl = deps.replaceUrl ?? ((next: string) => window.history.replaceState(null, '', next))

  const [screen, setScreen] = useState<Screen>(() => {
    const code = roomCodeFromUrl(url)
    if (code && openRoom) {
      replaceUrl(withoutRoomParam(url))
      return { kind: 'online', role: 'guest', code }
    }
    return { kind: 'setup' }
  })
  const [historyOpen, setHistoryOpen] = useState(false)
  const toSetup = () => setScreen({ kind: 'setup' })

  return (
    <AppShell>
      {screen.kind === 'game' && (
        <GameScreen settings={screen.settings} storage={storage} feedback={feedback} onBack={toSetup} />
      )}
      {screen.kind === 'online' && openRoom && (
        <OnlineGame
          code={screen.code}
          role={screen.role}
          openRoom={openRoom}
          storage={storage}
          feedback={feedback}
          share={share}
          baseUrl={url}
          onBack={toSetup}
        />
      )}
      {screen.kind === 'setup' && (
        <SetupScreen
          initial={loadSetup(storage)}
          onStart={(next) => {
            saveSetup(storage, next)
            setScreen({ kind: 'game', settings: next })
          }}
          onOpenHistory={() => setHistoryOpen(true)}
          online={{
            available: openRoom !== null,
            onCreate: () => setScreen({ kind: 'online', role: 'host', code: createRoomCode() }),
            onJoin: (code) => setScreen({ kind: 'online', role: 'guest', code }),
          }}
        />
      )}
      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} storage={storage} />
    </AppShell>
  )
}
```

- [ ] **Step 4: Run all tests, typecheck, build**

Run: `npm test && npm run build`
Expected: PASS; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: online rooms from setup and ?room= links"
```

---

### Task 16: History sheet labels online games

**Files:**
- Modify: `src/components/HistorySheet.tsx:40-45,79-83`
- Test: `src/components/HistorySheet.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/components/HistorySheet.test.tsx` (reuse the file's storage helper; if it seeds entries via `STORAGE_KEY`, follow that pattern):

```tsx
  it('labels online games from your point of view', () => {
    const storage = fakeStorage()
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'a', timestamp: 1, mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'X' },
        { id: 'b', timestamp: 2, mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'O' },
      ]),
    )
    render(<HistorySheet open onOpenChange={() => {}} storage={storage} />)
    expect(screen.getByText('You win')).toBeInTheDocument()
    expect(screen.getByText('Friend wins')).toBeInTheDocument()
    expect(screen.getAllByText('Online')).toHaveLength(2)
    expect(screen.queryByRole('table', { name: /record against the bot/i })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/HistorySheet.test.tsx`
Expected: FAIL: "Friend wins" not found (renders "Bot wins").

- [ ] **Step 3: Implement**

```tsx
function outcomeLabel(e: HistoryEntry): string {
  const seat = winnerSeat(e)
  if (seat === null) return 'Draw'
  if (e.mode === 'pvp') return seat === 'p1' ? 'Player 1 wins' : 'Player 2 wins'
  if (e.mode === 'online') return seat === 'p1' ? 'You win' : 'Friend wins'
  return seat === 'p1' ? 'You win' : 'Bot wins'
}

function modeLabel(e: HistoryEntry): string {
  if (e.mode === 'pvp') return 'Two player'
  if (e.mode === 'online') return 'Online'
  const d = e.difficulty ?? 'medium'
  return `Bot · ${d.charAt(0).toUpperCase()}${d.slice(1)}`
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/HistorySheet.tsx src/components/HistorySheet.test.tsx
git commit -m "feat: history labels online games"
```

---

### Task 17: Deploy secrets and docs

**Files:**
- Modify: `.github/workflows/deploy.yml`, `CLAUDE.md`, `README.md`, `docs/superpowers/specs/2026-09-23-tic-tac-toe-design.md`

- [ ] **Step 1: Pass the secrets to the build**

In `deploy.yml`, the `npm run build` step's `env` becomes:

```yaml
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

- [ ] **Step 2: CLAUDE.md**

Description line: "Two-player local, versus bot (easy / medium / hard), or online with a friend over Supabase Realtime." Layout additions:

```
- `src/lib/room.ts` — room codes, links, message validation, lobby presence rules, Supabase config. Fully tested.
- `src/lib/roomConnection.ts` — the `RoomConnection` interface plus an in-memory fake for tests.
- `src/state/online.ts` — `roomReducer(role)`: the host is the referee; the guest only syncs. Fully tested.
- `src/platform/supabaseRoom.ts` — the only file that imports `@supabase/supabase-js`. Broadcast + presence, no tables.
- `src/platform/share.ts` — Web Share / clipboard behind `ShareLink`.
- `src/components/OnlineGame.tsx`, `OnlineLobby.tsx` — connect → lobby → `GameScreen` with an online session.
```

Conventions additions:

```
- Online: the host is seat `p1` and plays X in the first game; its `GameState` is the truth. Guests send `move` / `new-game` requests and apply `state` snapshots via `SYNC`. History stores your own symbol as `p1Symbol`. Online is never the remembered setup mode.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.example`). Missing → Online is shown disabled.
```

Replace "Scope is fixed by the specs; replay, undo, and online play are out." with "Scope is fixed by the specs; replay, undo, matchmaking, accounts, and chat are out."

- [ ] **Step 3: README**

Add to the intro: "Or play a friend online: create a room, share the four-letter code or link, and play from two phones." Add a section after "Install it":

```markdown
## Play online

Choose **Online** on the setup screen. **Create room** gives you a code and a
**Share** button; your friend types the code or opens the link. The host plays
X first; after that the winner takes X. Either player can start a new game.

Online play runs over [Supabase Realtime](https://supabase.com/docs/guides/realtime)
(broadcast + presence, no database). To enable it:

1. Create a free Supabase project.
2. Copy the Project URL and anon key from Project Settings → API.
3. Locally: copy `.env.example` to `.env` and fill both values.
4. Deploys: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository
   secrets; the deploy workflow passes them to the build.

Without them the Online option shows as "Not set up".
```

Add `src/lib/room.ts`, `src/state/online.ts`, `src/platform/supabaseRoom.ts` bullets under "How it's put together".

- [ ] **Step 4: Original spec**

In `docs/superpowers/specs/2026-09-23-tic-tac-toe-design.md`, find the out-of-scope line mentioning online/multiplayer and replace it with: "Online play with friends: see `2026-09-24-online-play-design.md`. Random matchmaking stays out."

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run build`

```bash
git add .github/workflows/deploy.yml CLAUDE.md README.md docs/superpowers/specs/2026-09-23-tic-tac-toe-design.md
git commit -m "docs: online play setup, layout, and deploy secrets"
```

---

### Task 18: Ship

- [ ] **Step 1: Full verification**

Run: `npm test && npm run build`. Expected: all green, `dist/` built.

- [ ] **Step 2: Manual smoke in the browser**

Run `npm run dev`, open two tabs (no env → Online disabled; confirm the hint). Then run once with the fake by setting `VITE_SUPABASE_URL=https://example.invalid VITE_SUPABASE_ANON_KEY=x npm run dev` and confirm Create room shows the lobby, then "Couldn't connect" within ~10 s. (Real two-device play needs the owner's Supabase values.)

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/online-play
gh pr create --title "feat: online play with friends over Supabase Realtime" --body "…summary, test plan, note that repository secrets VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY must be added for Online to be enabled on the live site…"
```

- [ ] **Step 4: Merge and watch the deploy**

```bash
gh pr merge --merge --delete-branch
gh run watch
```

Expected: the Pages workflow passes and the live site updates. Without the secrets the site ships with Online disabled ("Not set up"); once the owner adds the two secrets, re-run the workflow (`gh workflow run deploy.yml`) to enable it.
