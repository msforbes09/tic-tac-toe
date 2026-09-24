# Rooms, Challenges, and Spectators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace join-by-code online play with persistent rooms where members challenge each other to first-to-6 series that everyone else in the room can watch.

**Architecture:** Three Supabase Realtime channel kinds (lobby, room, game) over one generic `Connection<Meta>` interface with an in-memory fake; two Postgres tables (`rooms`, `results`) behind a `RoomDirectory` interface with a fake. Pure modules carry every rule: `names.ts` (themed names), `identity.ts` (device id, nickname, owner tokens, SHA-256), `series.ts` (series state and rules over the existing `gameReducer`), `state/online.ts` (referee/player/watcher reducer over `SeriesState`). Components: `OnlinePanel` (nickname + room list on setup), `RoomScreen`, `SeriesScreen`, `Interstitial`.

**Tech Stack:** Vite 8, React 19, TypeScript 5, Tailwind 4, shadcn/ui (Sheet, AlertDialog, Button), Vitest 4 + RTL, `@supabase/supabase-js` 2.x (Realtime broadcast + presence, Postgres REST, `postgres_changes`).

**Spec:** `docs/superpowers/specs/2026-09-24-rooms-and-challenges-design.md`

## Global Constraints

- Root: `/Volumes/Developer/Projects/Personal/KayaProjects/tic-tac-toe`. Branch `feat/rooms` off `develop`.
- Channels: lobby `ttt-lobby`; room `ttt-room:<roomId>`; game `ttt-game:<gameId>`. Broadcast event name `msg`. Presence key = `deviceId`.
- localStorage keys: `tic-tac-toe:device`, `tic-tac-toe:nickname`, `tic-tac-toe:rooms-owned`.
- Series: first to **6**; **10** games then sudden death; game 1 the **challenged** player is X; first move alternates; **Next game** enabled only when the current game is finished; resign = loss; grace **30 s**.
- Copy (exact): "No open rooms yet. Create one!", "Waiting for {name}…", "{name} challenges you", "Accept", "Decline", "Cancel", "Challenge", "Leave", "Delete room", "Next game", "Resign", "Back to room", "Watching", "Tie breaker", "Watch", "Dismiss", "The room was deleted", "Save".
- Nickname: trimmed, 2–20 chars, else the random one.
- Status text: players "Your turn" / "{name}'s turn" / "You win!" / "You lost" / "It's a draw"; watchers "{name}'s turn" / "{name} wins!" / "It's a draw".
- `lib/` and `state/` never import React or touch the DOM. Dependency direction components → state → lib.
- Only `src/platform/supabase*.ts` import `@supabase/supabase-js`.
- TDD every task. Plain commit messages, no attribution trailer. Never write `.env`.
- Existing offline behaviour (bot, two player, history, splash, install nudge) must not change.

## Review Focus

1. Two devices both believe they are referee after a reconnect: the lower `deviceId` keeps the role, the other demotes and re-syncs. → Task 5 (`resolveRole`) and Task 13.
2. Series decision edge: 5–5 after 10 games then a draw in game 11 keeps going; a win ends it; 6–4 ends at game 10; 6–0 ends at game 6. → Task 4.
3. A challenge arriving for a member who is now playing or watching-then-accepted-elsewhere is auto-declined and never shows a sheet. → Task 12.
4. Room deleted while people are inside: everyone returns to the list with "The room was deleted", and the lobby presence is cleared. → Task 12.
5. A result inserted twice (referee retries) is not shown twice: the referee inserts once per series, keyed by `gameId`; the fake and the SQL use `gameId` as the results primary key. → Task 7 and Task 15.

---

### Task 1: Themed names (`lib/names.ts`)

**Files:** Create `src/lib/names.ts`; Test `src/lib/names.test.ts`.

**Interfaces:** Produces `ADJECTIVES: readonly string[]` (30), `TERMS: readonly string[]` (12), `randomName(random?: () => number): string`, `uniqueName(existing: Iterable<string>, random?: () => number): string`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest'
import { ADJECTIVES, TERMS, randomName, uniqueName } from './names'

describe('themed names', () => {
  it('pairs an adjective with a board term', () => {
    expect(randomName(() => 0)).toBe(`${ADJECTIVES[0]} ${TERMS[0]}`)
    expect(randomName(() => 0.999)).toBe(`${ADJECTIVES[ADJECTIVES.length - 1]} ${TERMS[TERMS.length - 1]}`)
    expect(ADJECTIVES.length).toBeGreaterThanOrEqual(30)
    expect(TERMS).toContain('Diagonal')
  })

  it('adds a two-digit suffix when the name is taken', () => {
    const base = randomName(() => 0)
    const name = uniqueName([base], () => 0)
    expect(name).toMatch(new RegExp(`^${base} \\d\\d$`))
    expect(uniqueName([], () => 0)).toBe(base)
  })

  it('keeps trying when the suffixed name is taken too', () => {
    const base = randomName(() => 0)
    const taken = [base, `${base} 10`]
    const name = uniqueName(taken, () => 0)
    expect(taken).not.toContain(name)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/lib/names.test.ts` → FAIL, cannot resolve `./names`.
- [ ] **Step 3: Implement**

```ts
export const ADJECTIVES = [
  'Bold', 'Sly', 'Quiet', 'Lucky', 'Iron', 'Swift', 'Calm', 'Clever', 'Brave', 'Sharp',
  'Golden', 'Silver', 'Cosmic', 'Gentle', 'Wild', 'Steady', 'Bright', 'Merry', 'Nimble', 'Proud',
  'Rusty', 'Shadow', 'Sunny', 'Tidy', 'Velvet', 'Witty', 'Zesty', 'Humble', 'Jolly', 'Keen',
] as const
export const TERMS = [
  'Corner', 'Edge', 'Center', 'Diagonal', 'Row', 'Column', 'Fork', 'Block', 'Line', 'Square', 'Cross', 'Nought',
] as const

const pick = <T,>(list: readonly T[], random: () => number): T =>
  list[Math.min(list.length - 1, Math.floor(random() * list.length))]

/** "Sly Diagonal": the same theme for rooms and nicknames. */
export function randomName(random: () => number = Math.random): string {
  return `${pick(ADJECTIVES, random)} ${pick(TERMS, random)}`
}

/** A name not already in `existing`; a two-digit suffix breaks ties. */
export function uniqueName(existing: Iterable<string>, random: () => number = Math.random): string {
  const taken = new Set(existing)
  const base = randomName(random)
  if (!taken.has(base)) return base
  for (let i = 0; i < 90; i++) {
    const candidate = `${base} ${10 + Math.floor(random() * 90)}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base} ${Date.now() % 100}`
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat: themed names for rooms and nicknames`.

---

### Task 2: Identity (`lib/identity.ts`)

**Files:** Create `src/lib/identity.ts`; Test `src/lib/identity.test.ts`.

**Interfaces:** Produces `DEVICE_KEY`, `NICKNAME_KEY`, `OWNED_KEY`, `loadDeviceId(storage): string` (creates and saves when missing), `normalizeNickname(input: string): string | null`, `loadNickname(storage): string | null`, `saveNickname(storage, name)`, `loadOwnedRooms(storage): Record<string, string>`, `saveOwnedRoom(storage, roomId, token)`, `removeOwnedRoom(storage, roomId)`, `newToken(): string`, `sha256Hex(text: string): Promise<string>` (WebCrypto when available, pure-JS fallback for plain-HTTP LAN testing).

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest'
import type { HistoryStorage } from './history'
import {
  DEVICE_KEY, NICKNAME_KEY, OWNED_KEY, loadDeviceId, loadNickname, loadOwnedRooms, normalizeNickname,
  removeOwnedRoom, saveNickname, saveOwnedRoom, sha256Hex, sha256HexFallback,
} from './identity'

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const s: HistoryStorage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) }
  return s
}

describe('identity', () => {
  it('creates a device id once and keeps it', () => {
    const s = fakeStorage()
    const id = loadDeviceId(s)
    expect(id.length).toBeGreaterThanOrEqual(8)
    expect(s.getItem(DEVICE_KEY)).toBe(id)
    expect(loadDeviceId(s)).toBe(id)
  })

  it('normalizes nicknames to 2–20 trimmed characters', () => {
    expect(normalizeNickname('  Sly Diagonal ')).toBe('Sly Diagonal')
    expect(normalizeNickname('a')).toBeNull()
    expect(normalizeNickname('x'.repeat(21))).toBeNull()
    expect(normalizeNickname('   ')).toBeNull()
  })

  it('round-trips the nickname', () => {
    const s = fakeStorage()
    expect(loadNickname(s)).toBeNull()
    saveNickname(s, 'Bold Corner')
    expect(s.getItem(NICKNAME_KEY)).toBe('Bold Corner')
    expect(loadNickname(s)).toBe('Bold Corner')
  })

  it('remembers owner tokens per room', () => {
    const s = fakeStorage()
    saveOwnedRoom(s, 'r1', 't1')
    saveOwnedRoom(s, 'r2', 't2')
    expect(loadOwnedRooms(s)).toEqual({ r1: 't1', r2: 't2' })
    removeOwnedRoom(s, 'r1')
    expect(loadOwnedRooms(s)).toEqual({ r2: 't2' })
    expect(loadOwnedRooms(fakeStorage({ [OWNED_KEY]: '{bad' }))).toEqual({})
  })

  it('hashes with SHA-256 (known vector) in both paths', async () => {
    const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    expect(sha256HexFallback('abc')).toBe(expected)
    expect(await sha256Hex('abc')).toBe(expected)
  })
})
```

- [ ] **Step 2: Run** → FAIL, cannot resolve `./identity`.
- [ ] **Step 3: Implement**

```ts
import type { HistoryStorage } from './history'
import { newEntryId } from './history'

export const DEVICE_KEY = 'tic-tac-toe:device'
export const NICKNAME_KEY = 'tic-tac-toe:nickname'
export const OWNED_KEY = 'tic-tac-toe:rooms-owned'

const read = (storage: HistoryStorage, key: string): string | null => {
  try { return storage.getItem(key) } catch { return null }
}
const write = (storage: HistoryStorage, key: string, value: string): void => {
  try { storage.setItem(key, value) } catch { /* best-effort */ }
}

/** A random id for this device, made once. Presence keys and ownership hang off it. */
export function loadDeviceId(storage: HistoryStorage): string {
  const saved = read(storage, DEVICE_KEY)
  if (saved && saved.length >= 8) return saved
  const id = newEntryId()
  write(storage, DEVICE_KEY, id)
  return id
}

export function normalizeNickname(input: string): string | null {
  const name = input.trim().replace(/\s+/g, ' ')
  return name.length >= 2 && name.length <= 20 ? name : null
}
export const loadNickname = (storage: HistoryStorage): string | null => read(storage, NICKNAME_KEY)
export const saveNickname = (storage: HistoryStorage, name: string): void => write(storage, NICKNAME_KEY, name)

export function loadOwnedRooms(storage: HistoryStorage): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(read(storage, OWNED_KEY) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'string')) as Record<string, string>
  } catch { return {} }
}
export function saveOwnedRoom(storage: HistoryStorage, roomId: string, token: string): void {
  write(storage, OWNED_KEY, JSON.stringify({ ...loadOwnedRooms(storage), [roomId]: token }))
}
export function removeOwnedRoom(storage: HistoryStorage, roomId: string): void {
  const { [roomId]: _gone, ...rest } = loadOwnedRooms(storage)
  write(storage, OWNED_KEY, JSON.stringify(rest))
}
export const newToken = (): string => `${newEntryId()}${newEntryId()}`.replace(/-/g, '')

/** SHA-256 hex. WebCrypto needs a secure context; plain-HTTP LAN testing takes the JS path. */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return sha256HexFallback(text)
}

// Compact SHA-256 (FIPS 180-4) for contexts without WebCrypto.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])
export function sha256HexFallback(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const bitLen = bytes.length * 8
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  new DataView(padded.buffer).setUint32(padded.length - 4, bitLen >>> 0)
  new DataView(padded.buffer).setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000))
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const w = new Uint32Array(64)
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))
  for (let off = 0; off < padded.length; off += 64) {
    const view = new DataView(padded.buffer, off, 64)
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0
  }
  return Array.from(h, (n) => n.toString(16).padStart(8, '0')).join('')
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat: device identity, nickname, owner tokens, SHA-256`.

---

### Task 3: Channel names, presence shapes, room events, game messages (`lib/room.ts`)

**Files:** Modify `src/lib/room.ts`, `src/lib/room.test.ts`, and every importer of `RoomMessage`/`isRoomMessage`/`Member`/`lobbyState` (`src/lib/roomConnection.ts`, `src/platform/supabaseRoom.ts`, `src/state/online.ts`, `src/components/GameScreen.tsx`, tests). Tasks 6, 13, 14 rewrite those importers; in this task only rename types so `tsc` stays green.

**Interfaces:** Produces

```ts
export const LOBBY_CHANNEL = 'ttt-lobby'
export const roomChannel = (roomId: string) => `ttt-room:${roomId}`
export const gameChannel = (gameId: string) => `ttt-game:${gameId}`
export function createId(length: number, random?: () => number): string   // ROOM_CODE_ALPHABET
export type MemberStatus = 'idle' | 'playing' | 'watching'
export type RoomPresence = { deviceId: string; nickname: string; status: MemberStatus; gameId: string | null }
export type LobbyPresence = { roomId: string; nickname: string }
export type GameRole = 'referee' | 'player' | 'watcher'
export type GamePresence = { deviceId: string; role: GameRole }
export type SeriesPlayer = { deviceId: string; nickname: string }
export type SeriesResult = {
  gameId: string; roomId: string; winner: SeriesPlayer; loser: SeriesPlayer
  winnerScore: number; loserScore: number; games: number
  reason: 'decided' | 'resigned' | 'left'; endedAt: number
}
export type RoomEvent =
  | { type: 'challenge'; gameId: string; from: SeriesPlayer; to: string }
  | { type: 'accept'; gameId: string; from: string }
  | { type: 'decline'; gameId: string; from: string }
  | { type: 'cancel'; gameId: string; from: string }
  | { type: 'series-ended'; result: SeriesResult }
  | { type: 'room-deleted' }
export function isRoomEvent(v: unknown): v is RoomEvent
export type GameMessage =
  | { type: 'move'; index: number; from: string }
  | { type: 'next-game'; from: string }
  | { type: 'resign'; from: string }
  | { type: 'hello'; from: string }
  | { type: 'state'; state: unknown }        // validated by isSeriesSnapshot in series.ts (Task 4)
export function isGameMessage(v: unknown): v is GameMessage
export function isRoomPresence(v: unknown): v is RoomPresence
export function isGamePresence(v: unknown): v is GamePresence
export function isLobbyPresence(v: unknown): v is LobbyPresence
export function isSeriesResult(v: unknown): v is SeriesResult
export function pairsInProgress(members: RoomPresence[]): { gameId: string; players: SeriesPlayer[] }[]  // playing members grouped by gameId, only groups of 2
```

Remove: `Snapshot` moves to `series.ts` re-export (keep `Snapshot` here, it is the game snapshot used by the reducer); remove old `RoomMessage`, `isRoomMessage`, `Member`, `Role`, `LobbyState`, `lobbyState`, `normalizeRoomCode`'s use for join input stays (links). Keep `createRoomCode` as `createId(4)` alias for links compatibility? No: room ids are `createId(6)`; `roomCodeFromUrl` accepts 4–8 chars from the alphabet (update `normalizeRoomCode` to a length range).

- [ ] **Step 1: Failing tests** (replace the `isRoomMessage`, `lobbyState` blocks in `room.test.ts`)

```ts
describe('ids and channels', () => {
  it('makes ids of any length and names channels', () => {
    expect(createId(6, () => 0)).toBe('AAAAAA')
    expect(roomChannel('AB2CDE')).toBe('ttt-room:AB2CDE')
    expect(gameChannel('G1')).toBe('ttt-game:G1')
    expect(LOBBY_CHANNEL).toBe('ttt-lobby')
    expect(normalizeRoomCode('ab2cde')).toBe('AB2CDE')
    expect(normalizeRoomCode('ab2cdefgh')).toBeNull()
  })
})

const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const result = { gameId: 'g', roomId: 'r', winner: alice, loser: bob, winnerScore: 6, loserScore: 4, games: 10, reason: 'decided', endedAt: 1 }

describe('isRoomEvent', () => {
  it('accepts every event and rejects junk', () => {
    expect(isRoomEvent({ type: 'challenge', gameId: 'g', from: alice, to: 'b' })).toBe(true)
    expect(isRoomEvent({ type: 'accept', gameId: 'g', from: 'b' })).toBe(true)
    expect(isRoomEvent({ type: 'decline', gameId: 'g', from: 'b' })).toBe(true)
    expect(isRoomEvent({ type: 'cancel', gameId: 'g', from: 'a' })).toBe(true)
    expect(isRoomEvent({ type: 'series-ended', result })).toBe(true)
    expect(isRoomEvent({ type: 'room-deleted' })).toBe(true)
    expect(isRoomEvent({ type: 'challenge', gameId: 'g', from: 'a', to: 'b' })).toBe(false)
    expect(isRoomEvent({ type: 'series-ended', result: { ...result, reason: 'quit' } })).toBe(false)
    expect(isRoomEvent({ type: 'kick' })).toBe(false)
  })
})

describe('isGameMessage', () => {
  it('accepts moves, next-game, resign, hello, state', () => {
    expect(isGameMessage({ type: 'move', index: 4, from: 'a' })).toBe(true)
    expect(isGameMessage({ type: 'next-game', from: 'a' })).toBe(true)
    expect(isGameMessage({ type: 'resign', from: 'b' })).toBe(true)
    expect(isGameMessage({ type: 'hello', from: 'b' })).toBe(true)
    expect(isGameMessage({ type: 'state', state: {} })).toBe(true)
    expect(isGameMessage({ type: 'move', index: 9, from: 'a' })).toBe(false)
    expect(isGameMessage({ type: 'move', index: 1 })).toBe(false)
    expect(isGameMessage({ type: 'new-game' })).toBe(false)
  })
})

describe('presence shapes', () => {
  it('validates room, game and lobby presence', () => {
    expect(isRoomPresence({ deviceId: 'a', nickname: 'Alice', status: 'idle', gameId: null })).toBe(true)
    expect(isRoomPresence({ deviceId: 'a', nickname: 'Alice', status: 'playing', gameId: 'g' })).toBe(true)
    expect(isRoomPresence({ deviceId: 'a', nickname: 'Alice', status: 'asleep', gameId: null })).toBe(false)
    expect(isGamePresence({ deviceId: 'a', role: 'referee' })).toBe(true)
    expect(isGamePresence({ deviceId: 'a', role: 'coach' })).toBe(false)
    expect(isLobbyPresence({ roomId: 'r', nickname: 'Alice' })).toBe(true)
    expect(isLobbyPresence({ roomId: 'r' })).toBe(false)
  })

  it('pairs playing members by game', () => {
    const members = [
      { deviceId: 'a', nickname: 'Alice', status: 'playing', gameId: 'g1' },
      { deviceId: 'b', nickname: 'Bob', status: 'playing', gameId: 'g1' },
      { deviceId: 'c', nickname: 'Cat', status: 'watching', gameId: 'g1' },
      { deviceId: 'd', nickname: 'Dan', status: 'playing', gameId: 'g2' },
      { deviceId: 'e', nickname: 'Eve', status: 'idle', gameId: null },
    ] as const
    expect(pairsInProgress([...members])).toEqual([{ gameId: 'g1', players: [alice, bob] }])
  })
})
```

- [ ] **Step 2: Run** → FAIL (missing exports).
- [ ] **Step 3: Implement** in `room.ts`: `createId(length, random)` (generalize `createRoomCode`, keep `createRoomCode = () => createId(4)` only if still referenced, otherwise delete); `normalizeRoomCode` accepts 4–8 alphabet chars; the types above; validators built from the existing `isObject`/`isCellIndex` helpers plus `isPlayerRef = (v) => isObject(v) && typeof v.deviceId === 'string' && typeof v.nickname === 'string'`; `isSeriesResult` checks both players, non-negative integer scores/games, reason in the three values, numeric `endedAt`; `pairsInProgress` groups `status === 'playing'` by `gameId` and keeps groups of exactly two, in the order first seen. Delete `Member`, `Role`, `LobbyState`, `lobbyState`, `RoomMessage`, `isRoomMessage`. Update importers minimally so `tsc` passes: in `roomConnection.ts`, `supabaseRoom.ts`, `state/online.ts`, `GameScreen.tsx`, `GameScreen.test.tsx`, `OnlineGame*.tsx`, `OnlineLobby*.tsx`, `App.tsx`, `App.test.tsx` — these are rewritten or deleted in Tasks 6, 13–15. For this task, delete `OnlineGame.tsx`, `OnlineGame.test.tsx`, `OnlineLobby.tsx`, `OnlineLobby.test.tsx`, remove the `online` prop and its tests from `GameScreen`, remove `roomReducer` and `state/online.ts` + test (rewritten in Task 5), and stub `App.tsx` online wiring to `online={{ available: false, onCreate() {}, onJoin() {} }}` with the online App tests removed (rewritten in Task 15). Delete `supabaseRoom.ts` and its test (rewritten in Task 14) and `roomConnection.ts` + test (rewritten in Task 6). Run `npm test && npx tsc --noEmit` green.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit` → PASS. **Step 5: Commit** `refactor: room events, game messages, presence shapes; drop join-by-code`.

---

### Task 4: Series rules (`lib/series.ts`)

**Files:** Create `src/lib/series.ts`; Test `src/lib/series.test.ts`.

**Interfaces:** Consumes `gameReducer`, `createGameState`, `snapshotOf`, `canSeatMove`, `seatOf`, `symbolOf` from `@/state/reducer` — **no**: `lib` must not import `state`. Therefore `series.ts` lives at **`src/state/series.ts`** (same ruling as `state/online.ts`). Produces:

```ts
export const SERIES_TARGET = 6
export const SERIES_GAMES = 10
export const GRACE_MS = 30_000
export type SeriesSide = 'challenger' | 'challenged'
export type SeriesState = {
  gameId: string; roomId: string
  challenger: SeriesPlayer; challenged: SeriesPlayer     // challenger is p1, challenged is p2 in `game`
  score: { challenger: number; challenged: number; draws: number }
  gameNumber: number
  game: GameState
  result: SeriesResult | null
}
export type SeriesSnapshot = Omit<SeriesState, 'game'> & { game: Snapshot }
export type SeriesAction =
  | { type: 'MOVE'; index: number; by: string }
  | { type: 'NEXT_GAME' }
  | { type: 'RESIGN'; by: string; reason: 'resigned' | 'left'; at: number }
  | { type: 'RECORDED' }
  | { type: 'SYNC'; snapshot: SeriesSnapshot }
export function firstMoveP1Symbol(gameNumber: number): Player   // game 1 → 'O' (challenged is X), game 2 → 'X', …
export function startSeries(roomId, gameId, challenger, challenged): SeriesState
export function sideOf(state, deviceId): SeriesSide | null
export function seatOfSide(side): Seat                          // challenger → p1
export type SeriesPhase = 'playing' | 'between' | 'over'
export function seriesPhase(state): SeriesPhase
export function isTieBreak(state): boolean                      // gameNumber > SERIES_GAMES
export function seriesReducer(state, action, now?: number): SeriesState
export function snapshotOfSeries(state): SeriesSnapshot
export function isSeriesSnapshot(v: unknown): v is SeriesSnapshot
export function seriesStatusText(state, viewer: string | null): string   // players You/…; watchers names
```

Decision rule after a game ends (win or draw): `decided = max(score) >= 6 || (gameNumber >= 10 && challengerScore !== challengedScore)`. Result `games = gameNumber`.

- [ ] **Step 1: Failing tests** (`src/state/series.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import {
  SERIES_TARGET, firstMoveP1Symbol, isSeriesSnapshot, isTieBreak, seriesPhase, seriesReducer, seriesStatusText,
  snapshotOfSeries, startSeries, type SeriesState,
} from './series'

const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const fresh = () => startSeries('r', 'g', alice, bob)

/** X wins on the top row: X plays 0,1,2; O plays 3,4. Whoever is X wins. */
function playXWins(s: SeriesState): SeriesState {
  const xId = s.game.p1Symbol === 'X' ? 'a' : 'b'
  const oId = xId === 'a' ? 'b' : 'a'
  for (const [who, i] of [[xId, 0], [oId, 3], [xId, 1], [oId, 4], [xId, 2]] as const) s = seriesReducer(s, { type: 'MOVE', index: i, by: who })
  return s
}
/** A draw: X 0,1,5,6,7 · O 2,3,4,8. */
function playDraw(s: SeriesState): SeriesState {
  const xId = s.game.p1Symbol === 'X' ? 'a' : 'b'
  const oId = xId === 'a' ? 'b' : 'a'
  for (const [who, i] of [[xId, 0], [oId, 2], [xId, 1], [oId, 3], [xId, 5], [oId, 4], [xId, 6], [oId, 8], [xId, 7]] as const)
    s = seriesReducer(s, { type: 'MOVE', index: i, by: who })
  return s
}
const next = (s: SeriesState) => seriesReducer(s, { type: 'NEXT_GAME' })

describe('series start and turn order', () => {
  it('the challenged player is X in game 1, then it alternates', () => {
    const s = fresh()
    expect(s.gameNumber).toBe(1)
    expect(s.game.p1Symbol).toBe('O')
    expect(firstMoveP1Symbol(1)).toBe('O')
    expect(firstMoveP1Symbol(2)).toBe('X')
    expect(firstMoveP1Symbol(3)).toBe('O')
    expect(seriesPhase(s)).toBe('playing')
  })

  it('only the player to move can move, by device id', () => {
    const s = fresh()
    expect(seriesReducer(s, { type: 'MOVE', index: 0, by: 'a' })).toBe(s)      // Alice is O, Bob (X) moves first
    const after = seriesReducer(s, { type: 'MOVE', index: 0, by: 'b' })
    expect(after.game.board[0]).toBe('X')
    expect(seriesReducer(after, { type: 'MOVE', index: 1, by: 'zzz' })).toBe(after)
  })
})

describe('scoring and decision', () => {
  it('a win scores a point and Next game starts the next with swapped first move', () => {
    let s = playXWins(fresh())
    expect(s.score).toEqual({ challenger: 0, challenged: 1, draws: 0 })
    expect(seriesPhase(s)).toBe('between')
    expect(seriesReducer(s, { type: 'MOVE', index: 5, by: 'a' })).toBe(s)
    s = next(s)
    expect(s.gameNumber).toBe(2)
    expect(s.game.p1Symbol).toBe('X')
    expect(s.game.board.every((c) => c === null)).toBe(true)
  })

  it('Next game does nothing mid-game', () => {
    const s = seriesReducer(fresh(), { type: 'MOVE', index: 0, by: 'b' })
    expect(next(s)).toBe(s)
  })

  it('first to 6 wins, even before game 10', () => {
    let s = fresh()
    for (let g = 0; g < 6; g++) {
      s = playXWins(s)
      if (g < 5) s = next(s)
    }
    // Alternating X means wins alternate: after 6 games it is 3–3. Play until someone has 6.
    while (!s.result) s = playXWins(next(s))
    expect(Math.max(s.score.challenger, s.score.challenged)).toBe(SERIES_TARGET)
    expect(seriesPhase(s)).toBe('over')
    expect(s.result?.reason).toBe('decided')
    expect(next(s)).toBe(s)
  })

  it('a lead after 10 games decides; level after 10 goes to a tie breaker until someone wins', () => {
    // 5 draws, then wins alternate: after game 10 it is 2–3 → decided at game 10? No: 5 draws + 5 games = 10 games, wins alternate X → 3 for the game-6/8/10 X … make it level instead.
    let s = fresh()
    for (let g = 0; g < 10; g++) {
      s = g % 2 === 0 ? playDraw(s) : playXWins(s)
      if (g < 9) s = next(s)
    }
    // Games 2,4,6,8,10 were won by X; X alternates so Bob (X in odd games) never won: challenger a is X in even games → 5–0 for Alice
    expect(s.result).not.toBeNull()
    expect(s.result?.winner).toEqual(alice)
    expect(s.result?.games).toBe(10)

    // Level after 10: draws only, then a tie-break draw keeps going, a win ends it.
    let t = fresh()
    for (let g = 0; g < 10; g++) {
      t = playDraw(t)
      if (g < 9) t = next(t)
    }
    expect(t.result).toBeNull()
    t = next(t)
    expect(isTieBreak(t)).toBe(true)
    expect(t.gameNumber).toBe(11)
    t = playDraw(t)
    expect(t.result).toBeNull()
    t = playXWins(next(t))
    expect(t.result?.reason).toBe('decided')
    expect(t.result?.games).toBe(12)
  })

  it('resigning loses whatever the score', () => {
    let s = playXWins(fresh())            // Bob leads 1–0
    s = seriesReducer(s, { type: 'RESIGN', by: 'b', reason: 'resigned', at: 99 })
    expect(s.result).toEqual({
      gameId: 'g', roomId: 'r', winner: alice, loser: bob, winnerScore: 0, loserScore: 1, games: 1, reason: 'resigned', endedAt: 99,
    })
    expect(seriesReducer(s, { type: 'MOVE', index: 5, by: 'a' })).toBe(s)
  })

  it('a drop after the grace period is a loss with reason left, counting the unfinished game', () => {
    const s = seriesReducer(next(playXWins(fresh())), { type: 'RESIGN', by: 'a', reason: 'left', at: 5 })
    expect(s.result?.loser).toEqual(alice)
    expect(s.result?.reason).toBe('left')
    expect(s.result?.games).toBe(1)
  })
})

describe('snapshots and status text', () => {
  it('round-trips through a snapshot and validates it', () => {
    const s = seriesReducer(fresh(), { type: 'MOVE', index: 4, by: 'b' })
    const snap = snapshotOfSeries(s)
    expect(isSeriesSnapshot(snap)).toBe(true)
    expect(isSeriesSnapshot({ ...snap, score: { challenger: -1 } })).toBe(false)
    const synced = seriesReducer(fresh(), { type: 'SYNC', snapshot: snap })
    expect(synced.game.board).toEqual(s.game.board)
    expect(synced.gameNumber).toBe(1)
    expect(synced.game.settings.mode).toBe('online')
  })

  it('reads the status from each side and for watchers', () => {
    const s = fresh()
    expect(seriesStatusText(s, 'b')).toBe('Your turn')
    expect(seriesStatusText(s, 'a')).toBe("Bob's turn")
    expect(seriesStatusText(s, null)).toBe("Bob's turn")
    const won = playXWins(s)
    expect(seriesStatusText(won, 'b')).toBe('You win!')
    expect(seriesStatusText(won, 'a')).toBe('You lost')
    expect(seriesStatusText(won, null)).toBe('Bob wins!')
    expect(seriesStatusText(playDraw(fresh()), null)).toBe("It's a draw")
  })
})
```

- [ ] **Step 2: Run** → FAIL, cannot resolve `./series`.
- [ ] **Step 3: Implement** `src/state/series.ts`

```ts
import type { SeriesPlayer, SeriesResult, Snapshot } from '@/lib/room'
import { isSeriesResult } from '@/lib/room'
import type { Player, Seat } from '@/lib/types'
import { nextPlayer } from '@/lib/game'
import { canSeatMove, createGameState, gameReducer, seatOf, snapshotOf, type GameState } from './reducer'

export const SERIES_TARGET = 6
export const SERIES_GAMES = 10
export const GRACE_MS = 30_000

export type SeriesSide = 'challenger' | 'challenged'
export type SeriesState = {
  gameId: string
  roomId: string
  challenger: SeriesPlayer
  challenged: SeriesPlayer
  score: { challenger: number; challenged: number; draws: number }
  gameNumber: number
  game: GameState
  result: SeriesResult | null
}
export type SeriesSnapshot = Omit<SeriesState, 'game'> & { game: Snapshot }
export type SeriesAction =
  | { type: 'MOVE'; index: number; by: string }
  | { type: 'NEXT_GAME' }
  | { type: 'RESIGN'; by: string; reason: 'resigned' | 'left'; at: number }
  | { type: 'RECORDED' }
  | { type: 'SYNC'; snapshot: SeriesSnapshot }
export type SeriesPhase = 'playing' | 'between' | 'over'

const ONLINE = { mode: 'online', difficulty: 'medium' } as const

/** The challenged player is X in game 1; first move alternates. The challenger is always p1. */
export const firstMoveP1Symbol = (gameNumber: number): Player => (gameNumber % 2 === 1 ? 'O' : 'X')

export function startSeries(roomId: string, gameId: string, challenger: SeriesPlayer, challenged: SeriesPlayer): SeriesState {
  return {
    gameId, roomId, challenger, challenged,
    score: { challenger: 0, challenged: 0, draws: 0 },
    gameNumber: 1,
    game: createGameState({ ...ONLINE, p1Symbol: firstMoveP1Symbol(1) }),
    result: null,
  }
}

export const seatOfSide = (side: SeriesSide): Seat => (side === 'challenger' ? 'p1' : 'p2')
export function sideOf(state: SeriesState, deviceId: string): SeriesSide | null {
  if (deviceId === state.challenger.deviceId) return 'challenger'
  if (deviceId === state.challenged.deviceId) return 'challenged'
  return null
}
const playerOf = (state: SeriesState, side: SeriesSide) => (side === 'challenger' ? state.challenger : state.challenged)
const other = (side: SeriesSide): SeriesSide => (side === 'challenger' ? 'challenged' : 'challenger')

export function seriesPhase(state: SeriesState): SeriesPhase {
  if (state.result) return 'over'
  return state.game.status === 'playing' ? 'playing' : 'between'
}
export const isTieBreak = (state: SeriesState): boolean => state.gameNumber > SERIES_GAMES

function decide(state: SeriesState, at: number): SeriesState {
  const { challenger: a, challenged: b } = state.score
  const decided = Math.max(a, b) >= SERIES_TARGET || (state.gameNumber >= SERIES_GAMES && a !== b)
  if (!decided) return state
  const winner: SeriesSide = a > b ? 'challenger' : 'challenged'
  return { ...state, result: buildResult(state, winner, 'decided', at) }
}
function buildResult(state: SeriesState, winner: SeriesSide, reason: SeriesResult['reason'], at: number): SeriesResult {
  const loser = other(winner)
  return {
    gameId: state.gameId, roomId: state.roomId,
    winner: playerOf(state, winner), loser: playerOf(state, loser),
    winnerScore: state.score[winner], loserScore: state.score[loser],
    games: state.gameNumber, reason, endedAt: at,
  }
}

export function seriesReducer(state: SeriesState, action: SeriesAction, now: number = Date.now()): SeriesState {
  switch (action.type) {
    case 'MOVE': {
      if (state.result) return state
      const side = sideOf(state, action.by)
      if (!side || !canSeatMove(state.game, seatOfSide(side))) return state
      const game = gameReducer(state.game, { type: 'MOVE', index: action.index })
      if (game === state.game) return state
      let score = state.score
      if (game.status === 'won' && game.winner) {
        const winnerSide: SeriesSide = seatOf(game, game.winner) === 'p1' ? 'challenger' : 'challenged'
        score = { ...score, [winnerSide]: score[winnerSide] + 1 }
      } else if (game.status === 'draw') {
        score = { ...score, draws: score.draws + 1 }
      }
      const next = { ...state, game, score }
      return game.status === 'playing' ? next : decide(next, now)
    }
    case 'NEXT_GAME': {
      if (seriesPhase(state) !== 'between') return state
      const gameNumber = state.gameNumber + 1
      return { ...state, gameNumber, game: createGameState({ ...ONLINE, p1Symbol: firstMoveP1Symbol(gameNumber) }) }
    }
    case 'RESIGN': {
      if (state.result) return state
      const side = sideOf(state, action.by)
      if (!side) return state
      return { ...state, result: buildResult(state, other(side), action.reason, action.at) }
    }
    case 'RECORDED':
      return { ...state, game: gameReducer(state.game, { type: 'RECORDED' }) }
    case 'SYNC': {
      const { game, ...rest } = action.snapshot
      // Fresh series object from the wire, but the game goes through the game reducer's SYNC so
      // `recorded` and `settings` follow the same rules as before.
      const base = rest.gameNumber === state.gameNumber ? state.game : createGameState({ ...ONLINE, p1Symbol: game.p1Symbol })
      return { ...rest, game: gameReducer(base, { type: 'SYNC', snapshot: game }) }
    }
  }
}

export function snapshotOfSeries(state: SeriesState): SeriesSnapshot {
  const { game, ...rest } = state
  return { ...rest, game: snapshotOf(game) }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isCount = (v: unknown) => Number.isInteger(v) && (v as number) >= 0
const isPlayerRef = (v: unknown) => isObj(v) && typeof v.deviceId === 'string' && typeof v.nickname === 'string'
export function isSeriesSnapshot(v: unknown): v is SeriesSnapshot {
  if (!isObj(v)) return false
  if (typeof v.gameId !== 'string' || typeof v.roomId !== 'string') return false
  if (!isPlayerRef(v.challenger) || !isPlayerRef(v.challenged)) return false
  const score = v.score
  if (!isObj(score) || !isCount(score.challenger) || !isCount(score.challenged) || !isCount(score.draws)) return false
  if (!Number.isInteger(v.gameNumber) || (v.gameNumber as number) < 1) return false
  if (v.result !== null && !isSeriesResult(v.result)) return false
  return isGameSnapshotShape(v.game)
}
// The reducer's SYNC re-validates nothing, so the shape check here is the gate for the game part.
function isGameSnapshotShape(v: unknown): boolean {
  return isGameMessageState(v)
}
```

`isGameMessageState` is `isSnapshot` from `lib/room.ts`; export it there as `isGameSnapshot` and import it. Replace the two helper lines above with `import { isGameSnapshot } from '@/lib/room'` and `return isGameSnapshot(v.game)`.

```ts
export function seriesStatusText(state: SeriesState, viewer: string | null): string {
  const g = state.game
  if (g.status === 'draw') return "It's a draw"
  const player = g.status === 'won' && g.winner ? g.winner : nextPlayer(g.board)
  const side: SeriesSide = seatOf(g, player) === 'p1' ? 'challenger' : 'challenged'
  const name = playerOf(state, side).nickname
  const you = viewer !== null && sideOf(state, viewer) === side
  const viewerPlays = viewer !== null && sideOf(state, viewer) !== null
  if (g.status === 'won') {
    if (!viewerPlays) return `${name} wins!`
    return you ? 'You win!' : 'You lost'
  }
  return you ? 'Your turn' : `${name}'s turn`
}
```

- [ ] **Step 4: Run** `npx vitest run src/state/series.test.ts && npx tsc --noEmit` → PASS. Fix the "lead after 10" test's arithmetic if the alternating-X assumption is off: assert on `s.result` non-null and `games === 10` only, and derive the expected winner from `s.score`.
- [ ] **Step 5: Commit** `feat: series rules: first to 6, tie breaker, resign, snapshots`.

---

### Task 5: Referee / player / watcher reducer and role resolution (`state/online.ts`)

**Files:** Create `src/state/online.ts` (rewritten), Test `src/state/online.test.ts`.

**Interfaces:**

```ts
export type SeriesRole = 'referee' | 'player' | 'watcher'
export type OnlineAction = SeriesAction | { type: 'GAME_MESSAGE'; message: GameMessage }
export function onlineReducer(role: SeriesRole): (state: SeriesState, action: OnlineAction) => SeriesState
/** Two referees after a reconnect: the lower deviceId keeps it. Returns the role this device should hold. */
export function resolveRole(self: string, current: SeriesRole, members: GamePresence[]): SeriesRole
```

Rules: referee applies local `MOVE`/`NEXT_GAME`/`RESIGN`/`RECORDED`; on `GAME_MESSAGE`: `move` → `MOVE {by: from}`, `next-game` → `NEXT_GAME`, `resign` → `RESIGN {by: from, reason:'resigned'}`, `hello`/`state` → unchanged (the screen answers hello). Player: local `RECORDED` only; `GAME_MESSAGE state` → `SYNC` when `isSeriesSnapshot`; everything else unchanged. Watcher: `state` → `SYNC` only. `resolveRole`: if `current === 'referee'` and another member has `role: 'referee'` with a smaller `deviceId` → `'player'`; if `current === 'player'` and no member has `role: 'referee'` → still `'player'` (promotion is time-based in the screen, not here); otherwise `current`.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { onlineReducer, resolveRole } from './online'
import { snapshotOfSeries, startSeries } from './series'

const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const fresh = () => startSeries('r', 'g', alice, bob)

describe('onlineReducer referee', () => {
  const ref = onlineReducer('referee')
  it('applies opponent moves by id and drops out-of-turn ones', () => {
    const s = ref(fresh(), { type: 'GAME_MESSAGE', message: { type: 'move', index: 0, from: 'b' } })
    expect(s.game.board[0]).toBe('X')
    expect(ref(s, { type: 'GAME_MESSAGE', message: { type: 'move', index: 1, from: 'b' } })).toBe(s)
    const t = ref(s, { type: 'MOVE', index: 1, by: 'a' })
    expect(t.game.board[1]).toBe('O')
  })
  it('handles resign and next-game requests, ignores hello and state', () => {
    const s = ref(fresh(), { type: 'GAME_MESSAGE', message: { type: 'resign', from: 'b' } })
    expect(s.result?.loser).toEqual(bob)
    const f = fresh()
    expect(ref(f, { type: 'GAME_MESSAGE', message: { type: 'hello', from: 'b' } })).toBe(f)
    expect(ref(f, { type: 'GAME_MESSAGE', message: { type: 'state', state: snapshotOfSeries(s) } })).toBe(f)
  })
})

describe('onlineReducer player and watcher', () => {
  it('only sync from state messages; local moves are requests, not changes', () => {
    const player = onlineReducer('player')
    const watcher = onlineReducer('watcher')
    const truth = onlineReducer('referee')(fresh(), { type: 'GAME_MESSAGE', message: { type: 'move', index: 4, from: 'b' } })
    const msg = { type: 'GAME_MESSAGE', message: { type: 'state', state: snapshotOfSeries(truth) } } as const
    expect(player(fresh(), msg).game.board[4]).toBe('X')
    expect(watcher(fresh(), msg).game.board[4]).toBe('X')
    const f = fresh()
    expect(player(f, { type: 'MOVE', index: 0, by: 'b' })).toBe(f)
    expect(player(f, { type: 'NEXT_GAME' })).toBe(f)
    expect(watcher(f, { type: 'GAME_MESSAGE', message: { type: 'move', index: 0, from: 'b' } })).toBe(f)
    expect(player(f, { type: 'GAME_MESSAGE', message: { type: 'state', state: { nope: true } } })).toBe(f)
  })
})

describe('resolveRole', () => {
  it('lets the lower id keep referee when two claim it', () => {
    const members = [{ deviceId: 'a', role: 'referee' }, { deviceId: 'b', role: 'referee' }] as const
    expect(resolveRole('a', 'referee', [...members])).toBe('referee')
    expect(resolveRole('b', 'referee', [...members])).toBe('player')
    expect(resolveRole('b', 'player', [...members])).toBe('player')
    expect(resolveRole('c', 'watcher', [...members])).toBe('watcher')
  })
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** per the rules. **Step 4: Run** `npm test && npx tsc --noEmit` → PASS. **Step 5: Commit** `feat: referee, player and watcher reducer over the series`.

---

### Task 6: Generic realtime connection and fake (`lib/realtime.ts`)

**Files:** Create `src/lib/realtime.ts`; Test `src/lib/realtime.test.ts`.

**Interfaces:**

```ts
export type Presence<Meta> = { id: string; meta: Meta }
export type Connection<Meta> = {
  readonly selfId: string
  send(message: unknown): void
  onMessage(handler: (message: unknown) => void): () => void
  track(meta: Meta): void
  onPresence(handler: (members: Presence<Meta>[]) => void): () => void
  members(): Presence<Meta>[]
  leave(): void
}
export type OpenChannel = <Meta>(name: string, selfId: string) => Promise<Connection<Meta>>
export type FakeRealtime = {
  open: OpenChannel
  /** Members currently on a channel, for assertions. */
  membersOf(name: string): Presence<unknown>[]
  /** Simulate a network drop for one member of one channel (presence gone, messages stop). */
  drop(name: string, selfId: string): void
}
export function createFakeRealtime(): FakeRealtime
```

Semantics: `track` replaces the member's meta and announces to everyone on the channel (including self). `members()` lists only members who have tracked. `send` delivers synchronously to every other connection on the channel. `leave` removes and announces. `drop` is leave without the leaver knowing (its handlers stay registered but receive nothing).

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createFakeRealtime } from './realtime'

describe('fake realtime', () => {
  it('delivers messages to the others on the same channel only', async () => {
    const rt = createFakeRealtime()
    const a = await rt.open<{ n: number }>('room:1', 'a')
    const b = await rt.open<{ n: number }>('room:1', 'b')
    const c = await rt.open<{ n: number }>('room:2', 'c')
    const seenB = vi.fn(); const seenC = vi.fn(); const seenA = vi.fn()
    a.onMessage(seenA); b.onMessage(seenB); c.onMessage(seenC)
    a.send({ hi: 1 })
    expect(seenB).toHaveBeenCalledWith({ hi: 1 })
    expect(seenC).not.toHaveBeenCalled()
    expect(seenA).not.toHaveBeenCalled()
  })

  it('tracks presence with metadata and announces changes', async () => {
    const rt = createFakeRealtime()
    const a = await rt.open<{ status: string }>('room:1', 'a')
    const seen = vi.fn()
    a.onPresence(seen)
    expect(a.members()).toEqual([])
    a.track({ status: 'idle' })
    const b = await rt.open<{ status: string }>('room:1', 'b')
    b.track({ status: 'playing' })
    expect(a.members()).toEqual([{ id: 'a', meta: { status: 'idle' } }, { id: 'b', meta: { status: 'playing' } }])
    a.track({ status: 'watching' })
    expect(a.members()[0].meta).toEqual({ status: 'watching' })
    b.leave()
    expect(a.members().map((m) => m.id)).toEqual(['a'])
    expect(seen).toHaveBeenCalledTimes(4)
  })

  it('drop removes a member without telling it', async () => {
    const rt = createFakeRealtime()
    const a = await rt.open<{}>('room:1', 'a'); a.track({})
    const b = await rt.open<{}>('room:1', 'b'); b.track({})
    const seenB = vi.fn(); b.onMessage(seenB)
    rt.drop('room:1', 'b')
    expect(rt.membersOf('room:1').map((m) => m.id)).toEqual(['a'])
    a.send({ x: 1 })
    expect(seenB).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the fake with a `Map<channelName, Peer[]>`, `Peer = { id, meta: Meta | undefined, onMessage: Set, onPresence: Set, alive: boolean }`. **Step 4: Run** → PASS. **Step 5: Commit** `feat: generic realtime connection with an in-memory fake`.

---

### Task 7: Room directory interface and fake (`lib/roomDirectory.ts`)

**Files:** Create `src/lib/roomDirectory.ts`; Test `src/lib/roomDirectory.test.ts`.

**Interfaces:**

```ts
export type RoomRecord = { id: string; name: string; creatorId: string; createdAt: number }
export type RoomDirectory = {
  listRooms(): Promise<RoomRecord[]>
  onRoomsChange(handler: (rooms: RoomRecord[]) => void): () => void       // calls with the current list first
  createRoom(room: { id: string; name: string; creatorId: string; ownerHash: string }): Promise<RoomRecord>
  deleteRoom(id: string, token: string): Promise<boolean>
  listResults(roomId: string): Promise<SeriesResult[]>                    // newest first
  onResultsChange(roomId: string, handler: (results: SeriesResult[]) => void): () => void
  addResult(result: SeriesResult): Promise<void>                          // idempotent by gameId
}
export function createFakeDirectory(hash: (token: string) => Promise<string>): RoomDirectory & { rooms(): RoomRecord[] }
```

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createFakeDirectory } from './roomDirectory'

const hash = async (t: string) => `h:${t}`
const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const result = (gameId: string) => ({ gameId, roomId: 'r1', winner: alice, loser: bob, winnerScore: 6, loserScore: 2, games: 8, reason: 'decided' as const, endedAt: 10 })

describe('fake room directory', () => {
  it('creates, lists (newest first) and notifies', async () => {
    const dir = createFakeDirectory(hash)
    const seen = vi.fn()
    dir.onRoomsChange(seen)
    expect(seen).toHaveBeenLastCalledWith([])
    await dir.createRoom({ id: 'r1', name: 'Sly Diagonal', creatorId: 'a', ownerHash: await hash('t1') })
    await dir.createRoom({ id: 'r2', name: 'Bold Corner', creatorId: 'b', ownerHash: await hash('t2') })
    expect((await dir.listRooms()).map((r) => r.id)).toEqual(['r2', 'r1'])
    expect(seen).toHaveBeenCalledTimes(3)
  })

  it('deletes only with the right token, cascading results', async () => {
    const dir = createFakeDirectory(hash)
    await dir.createRoom({ id: 'r1', name: 'Sly Diagonal', creatorId: 'a', ownerHash: await hash('t1') })
    await dir.addResult(result('g1'))
    expect(await dir.deleteRoom('r1', 'wrong')).toBe(false)
    expect(await dir.deleteRoom('r1', 't1')).toBe(true)
    expect(await dir.listRooms()).toEqual([])
    expect(await dir.listResults('r1')).toEqual([])
  })

  it('lists results newest first, once per gameId, and notifies the room', async () => {
    const dir = createFakeDirectory(hash)
    await dir.createRoom({ id: 'r1', name: 'Sly Diagonal', creatorId: 'a', ownerHash: await hash('t1') })
    const seen = vi.fn()
    dir.onResultsChange('r1', seen)
    await dir.addResult(result('g1'))
    await dir.addResult({ ...result('g2'), endedAt: 20 })
    await dir.addResult(result('g1'))
    expect((await dir.listResults('r1')).map((r) => r.gameId)).toEqual(['g2', 'g1'])
    expect(seen).toHaveBeenCalledTimes(3)
  })
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** with arrays and handler sets; `createdAt = Date.now()` incremented by insertion order for stable sorting. **Step 4: Run** → PASS. **Step 5: Commit** `feat: room directory interface with an in-memory fake`.

---

### Task 8: `NicknameSheet` and `Interstitial`

**Files:** Create `src/components/NicknameSheet.tsx`, `src/components/Interstitial.tsx`; Tests `src/components/NicknameSheet.test.tsx`, `src/components/Interstitial.test.tsx`.

**Interfaces:**

```ts
export function NicknameSheet(props: { open: boolean; initial: string; onSave: (name: string) => void }): JSX.Element
export function Interstitial(props: {
  title: string; subtitle?: string
  actions?: { label: string; onClick: () => void; primary?: boolean }[]
  /** Auto-dismiss after this many ms when there are no actions. */
  durationMs?: number; onDone?: () => void
}): JSX.Element
export const INTERSTITIAL_MS = 2000
```

- [ ] **Step 1: Failing tests**

```tsx
// NicknameSheet.test.tsx
it('prefills the random name and saves a normalized edit', () => {
  const onSave = vi.fn()
  render(<NicknameSheet open initial="Sly Diagonal" onSave={onSave} />)
  const input = screen.getByRole('textbox', { name: /nickname/i })
  expect(input).toHaveValue('Sly Diagonal')
  fireEvent.change(input, { target: { value: '  Bob  ' } })
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
  expect(onSave).toHaveBeenCalledWith('Bob')
})
it('falls back to the random name when the edit is too short', () => {
  const onSave = vi.fn()
  render(<NicknameSheet open initial="Sly Diagonal" onSave={onSave} />)
  fireEvent.change(screen.getByRole('textbox', { name: /nickname/i }), { target: { value: 'x' } })
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
  expect(onSave).toHaveBeenCalledWith('Sly Diagonal')
})

// Interstitial.test.tsx (fake timers)
it('shows title and subtitle and dismisses itself after the duration', () => {
  const onDone = vi.fn()
  render(<Interstitial title="Alice vs Bob" subtitle="Series starts" onDone={onDone} />)
  expect(screen.getByRole('status')).toHaveTextContent('Alice vs Bob')
  act(() => vi.advanceTimersByTime(INTERSTITIAL_MS))
  expect(onDone).toHaveBeenCalled()
})
it('waits for a tap when it has actions', () => {
  const watch = vi.fn(); const onDone = vi.fn()
  render(<Interstitial title="Alice vs Bob" actions={[{ label: 'Watch', onClick: watch, primary: true }, { label: 'Dismiss', onClick: onDone }]} onDone={onDone} />)
  act(() => vi.advanceTimersByTime(INTERSTITIAL_MS * 3))
  expect(onDone).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Watch' }))
  expect(watch).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** `NicknameSheet` uses shadcn `Sheet` (side bottom, like `HistorySheet`) with title "Your nickname", description "Others in a room see this name.", a styled `<input aria-label="Nickname">`, and a Save button that calls `onSave(normalizeNickname(value) ?? initial)`. `Interstitial` reuses the splash look: fixed, phone column, `role="status"`, title `text-4xl font-bold`, subtitle muted, buttons row; `useEffect` timer only when `!actions?.length`. Add `.interstitial-in` (reuse `splash-rise`) styles. **Step 4: Run** → PASS. **Step 5: Commit** `feat: nickname sheet and interstitial splash`.

---

### Task 9: `OnlinePanel` on setup (nickname + room list + create)

**Files:** Create `src/components/OnlinePanel.tsx`; Test `src/components/OnlinePanel.test.tsx`; Modify `src/components/SetupScreen.tsx` (+test) so its `online` prop becomes `online?: { available: boolean; panel: ReactNode }` and the panel renders under the mode toggle when `mode === 'online'` (the old Create room / code / Join UI is removed; Start game stays hidden in online mode).

**Interfaces:**

```ts
export type OnlinePanelProps = {
  nickname: string | null
  suggestedNickname: string
  onSaveNickname: (name: string) => void
  rooms: RoomRecord[]
  counts: Record<string, number>               // roomId → members present, from lobby presence
  ownedRoomId: string | null
  onCreate: () => void                          // App handles the one-room prompt
  onEnter: (room: RoomRecord) => void
}
```

Renders: `NicknameSheet` open when `nickname === null`; a header line "Playing as **{nickname}**" with a pencil button (`aria-label="Edit nickname"`) that reopens the sheet; **Create room** (label "Your room" badge on the row you own); the list (`role="list"`, each row a button "{name} · {n} in room"); empty state "No open rooms yet. Create one!".

- [ ] **Step 1: Failing tests** — nickname sheet shows when missing and saves; list shows rooms with counts and calls `onEnter`; empty state; Create calls `onCreate`; pencil reopens the sheet; owned room shows "Your room". Write them in the style of `SetupScreen.test.tsx` (RTL, `fireEvent`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm test && npx tsc --noEmit` → PASS. **Step 5: Commit** `feat: online panel with nickname and live room list`.

---

### Task 10: `SeriesScreen` (players and watchers)

**Files:** Create `src/components/SeriesScreen.tsx`; Test `src/components/SeriesScreen.test.tsx`.

**Interfaces:**

```ts
export type SeriesScreenProps = {
  self: SeriesPlayer
  role: SeriesRole                              // initial role; the screen may promote/demote itself
  initial: SeriesState                          // referee: startSeries(...); player/watcher: a placeholder from the room's knowledge, replaced on first state
  open: OpenChannel
  storage: HistoryStorage
  feedback: Feedback
  /** Called once with the result when the series is over and the person taps Back to room; watchers call it with null on Back. */
  onExit: (result: SeriesResult | null) => void
  /** Referee only: persist the result. */
  addResult: (result: SeriesResult) => Promise<void>
  now?: () => number
}
```

Behaviour:
- On mount: `open(gameChannel(gameId), self.deviceId)` → `track({ deviceId, role })`; referee also broadcasts `state` and answers every `hello` with `state`; player and watcher send `hello` once connected.
- Reducer: `useReducer(onlineReducer(role), initial)`; role in state, `resolveRole` applied on every presence change.
- Player moves: `send({type:'move', index, from})`; referee: `dispatch MOVE by self`. Next game / Resign likewise (`next-game`, `resign` messages vs local actions). Resign asks `AlertDialog` "Resign the series? It counts as a loss." with **Resign** / **Keep playing**.
- **Grace**: players: if the opponent's `deviceId` is missing from presence for `GRACE_MS`, referee dispatches `RESIGN {by: opponent, reason:'left'}`; a player whose referee is missing for `GRACE_MS` promotes itself to referee (tracks `role:'referee'`, broadcasts state) and then starts the same timer for the missing opponent. Status shows "Waiting for {name}…" meanwhile and the board is locked.
- Referee broadcasts `state` after every state change. When `result` appears the referee calls `addResult(result)` once (guard with a ref).
- **Interstitials**: entering `gameNumber === SERIES_GAMES + 1` shows "Tie breaker" (players and watchers, auto-dismiss); `result` shows "{winner} wins the series {ws}–{ls}" (or "{loser} resigned" subtitle) with **Back to room** → `onExit(result)`.
- Layout: header **Resign** (players) or **← Back** (watchers, `onExit(null)`) and a **Watching** badge for watchers; series bar "{You|name} {a} · {b} {You|name} · Game {n} of 10" or "Tie breaker · Game {n}"; `Board` with `disabled` when not your turn / watcher / waiting / over; `StatusBar` with `message={seriesStatusText(state, viewer)}` where viewer is `self.deviceId` for players and `null` for watchers; **Next game** button `disabled={seriesPhase(state) !== 'between'}`; `Celebration` when you won the game.
- History: players save each finished game to local history (`mode:'online'`, own symbol) with the same once-only guard as `GameScreen`. Watchers save nothing.
- Feedback: `feedbackForChange(prev, board, opponentSymbol)` for players; watchers hear moves only (`opponent = null`).

- [ ] **Step 1: Failing tests** with `createFakeRealtime()`, three screens (referee Alice, player Bob, watcher Cat) rendered in `data-testid` wrappers, `await act(async () => {})` to flush opens, fake timers for grace. Cover: header/series bar text per side; Bob's tap goes through Alice; a full game to X's win updates both scores and "Game 2 of 10" after Next game; Next game disabled mid-game; Resign confirm → result interstitial on all three with the loser's name; Cat sees names and Watching badge, cannot tap, Back calls `onExit(null)`; drop Bob (`rt.drop`) → Alice sees "Waiting for Bob…", after `GRACE_MS` result reason `left`; drop Alice → after `GRACE_MS` Bob's presence role is `referee` and Cat still receives state after Bob moves; tie breaker interstitial at game 11; each device records finished games once, Cat records none; `addResult` called once.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat: series screen with referee handover, grace, watching`.

---

### Task 11: `RoomScreen`

**Files:** Create `src/components/RoomScreen.tsx`; Test `src/components/RoomScreen.test.tsx`.

**Interfaces:**

```ts
export type RoomScreenProps = {
  room: RoomRecord
  self: SeriesPlayer
  ownerToken: string | null                     // set when this device created the room
  open: OpenChannel
  directory: RoomDirectory
  storage: HistoryStorage
  feedback: Feedback
  onLeave: (notice?: string) => void            // notice shown on the list, e.g. "The room was deleted"
  newId?: () => string
  now?: () => number
}
```

Behaviour:
- Mount: open `roomChannel(room.id)` and `LOBBY_CHANNEL`; track `{deviceId, nickname, status:'idle', gameId:null}` and `{roomId, nickname}`. Unmount: leave both.
- Blocks: **Games in progress** from `pairsInProgress(members)` with a live score pulled from the game channel? No — the room shows "Alice vs Bob" only (score is on the series screen; keeping it simple, YAGNI). Tap → activity `watching`.
  **People**: every member; status label Idle / Playing / Watching; **Challenge** button for idle members other than you, disabled while you have a pending challenge or are not idle.
  **Results**: `directory.onResultsChange(room.id)` list: "{winner} beat {loser} {ws}–{ls}" or "{loser} resigned to {winner} at {ls}–{ws}" / "{loser} left; {winner} wins {ws}–{ls}".
- Challenge flow: tap → `gameId = newId()`, send `challenge {gameId, from: self, to}`, show "Waiting for {name}…" with **Cancel** (sends `cancel`), 30 s timeout → cancel. Incoming `challenge` to me: if my status is `idle` or `watching` show `AlertDialog` "{name} challenges you" **Accept** / **Decline**; else send `decline`. `accept` for my pending → activity `series` role `referee`; the acceptor → role `player`. `decline`/`cancel` clear the pending state. Both track `status:'playing', gameId`.
- Activity `series`/`watching` renders `SeriesScreen` over the room; `onExit` → back to idle presence; referee also sends `series-ended {result}` on the room channel. `series-ended` refreshes results immediately (`directory` also notifies later).
- Interstitial for others: when `pairsInProgress` gains a pair I'm not in and I'm idle → "Alice vs Bob" with **Watch** (→ watching that gameId) / **Dismiss**. Track shown gameIds so it shows once.
- Delete: owner sees **Delete room** → confirm → `directory.deleteRoom(room.id, ownerToken)`; on `true` send `room-deleted` then `onLeave()`. Receiving `room-deleted`, or `onRoomsChange` no longer containing this room → `onLeave('The room was deleted')`.
- Leave: header **Leave** → if in a series, confirm "Leave the room? Your series counts as a loss." then resign via the series screen's exit path; otherwise `onLeave()`.

- [ ] **Step 1: Failing tests** with fake realtime + fake directory, two or three RoomScreens: members list with statuses; challenge → Waiting…/Cancel; decline clears; accept opens series for both and shows "Alice vs Bob" to the third member with Watch → watcher screen; series-ended appears in Results; delete room by owner kicks the others with the notice; non-owner has no Delete; challenge to a playing member is auto-declined; challenge times out after 30 s.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat: room screen with people, challenges, games and results`.

---

### Task 12: App wiring

**Files:** Modify `src/App.tsx`, `src/App.test.tsx`.

**Interfaces:** `AppDeps` becomes `{ open?: OpenChannel | null; directory?: RoomDirectory | null; hash?: (t) => Promise<string>; share?; url?; replaceUrl?; install?; newId?: () => string }`. Online is available when both `open` and `directory` are non-null (defaults come from `readSupabaseConfig` + Task 14 factories).

Behaviour: `screen` gains `{ kind: 'room'; room: RoomRecord; ownerToken: string | null }`. Setup passes `online={{ available, panel: <OnlinePanel …/> }}` where the panel gets `rooms` from `directory.onRoomsChange`, `counts` from a lobby connection opened by App while on setup (track nothing, just read presence), nickname from `identity.ts`, `suggestedNickname = uniqueName(memberNicknames)`. **Create**: if `ownedRoomId` exists → `AlertDialog` "Delete your room {name} and create a new one?" **Delete and create** / **Cancel**; otherwise `id = createId(6)`, `name = uniqueName(roomNames)`, `token = newToken()`, `ownerHash = await hash(token)`, `directory.createRoom(...)`, `saveOwnedRoom`, enter. `?room=<id>` → after nickname, enter that room if it exists in the directory, else show the list with "That room is gone". Leaving a room with a notice shows the notice above the list for a few seconds.

- [ ] **Step 1: Failing tests**: online disabled without deps; nickname sheet appears on choosing Online the first time and not the second; create room enters it and saves the owner token; second create asks and deletes the first; enter from list; `?room=` link enters; deleted room notice; Online never remembered as setup mode (existing test stays).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm test && npx tsc --noEmit && npm run build` → PASS. **Step 5: Commit** `feat: rooms from setup, one room per device, room links`.

---

### Task 13: Supabase realtime adapter (`platform/supabaseRealtime.ts`)

**Files:** Create `src/platform/supabaseClient.ts` (one `createClient` per config), `src/platform/supabaseRealtime.ts`; Test `src/platform/supabaseRealtime.test.ts` (mocked client, as `supabaseRoom.test.ts` did): tracks after SUBSCRIBED, re-tracks the last meta on a later SUBSCRIBED (rejoin), leave removes the channel, presence mapping keeps the first meta per key, failed subscribe rejects.

**Interfaces:** `createSupabaseRealtime(client: SupabaseClient): OpenChannel`.

Implementation notes: channel config `{ broadcast: { self: false }, presence: { key: selfId } }`; `on('presence', {event:'sync'})` → members from `presenceState()`; `on('broadcast', {event:'msg'})` → handlers with raw payload; `track(meta)` stores `lastMeta` and calls `channel.track(meta)` when subscribed; subscribe callback: first `SUBSCRIBED` resolves, later `SUBSCRIBED` re-tracks `lastMeta`; `leave` → `client.removeChannel(channel)` (the client is shared now, so no `realtime.disconnect()`; disconnect happens in App when leaving online entirely — skip, the socket is cheap while the app is open).

- [ ] Steps: failing test → implement → `npm test` → commit `feat: Supabase realtime adapter for lobby, room and game channels`.

---

### Task 14: Supabase directory adapter and schema (`platform/supabaseDirectory.ts`, `supabase/schema.sql`)

**Files:** Create `src/platform/supabaseDirectory.ts`, `supabase/schema.sql`, `supabase/README.md`; Test `src/platform/supabaseDirectory.test.ts` (mocked client: row mapping both ways, `delete_room` rpc call shape, `onRoomsChange` subscribes to `postgres_changes` on `rooms` and refetches).

**Interfaces:** `createSupabaseDirectory(client): RoomDirectory`. Row mapping: `rooms` → `{ id, name, creatorId: creator_id, createdAt: Date.parse(created_at) }`; `results` ↔ `{ id: gameId, room_id, winner_id, winner_name, loser_id, loser_name, winner_score, loser_score, games, reason, ended_at }`. `addResult` uses `upsert` with `onConflict: 'id'` (idempotent by gameId).

`supabase/schema.sql`:

```sql
create table if not exists public.rooms (
  id text primary key,
  name text not null,
  creator_id text not null,
  owner_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.results (
  id text primary key,                       -- the series' gameId; inserting twice is a no-op
  room_id text not null references public.rooms(id) on delete cascade,
  winner_id text not null, winner_name text not null,
  loser_id text not null,  loser_name text not null,
  winner_score int not null check (winner_score >= 0),
  loser_score int not null check (loser_score >= 0),
  games int not null check (games >= 0),
  reason text not null check (reason in ('decided', 'resigned', 'left')),
  ended_at timestamptz not null default now()
);
alter table public.rooms enable row level security;
alter table public.results enable row level security;
create policy "rooms are public"        on public.rooms   for select to anon, authenticated using (true);
create policy "anyone can create a room" on public.rooms  for insert to anon, authenticated with check (true);
create policy "results are public"      on public.results for select to anon, authenticated using (true);
create policy "anyone can add a result" on public.results for insert to anon, authenticated with check (true);
create or replace function public.delete_room(room_id text, token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare removed int;
begin
  delete from public.rooms where id = room_id and owner_hash = encode(extensions.digest(token, 'sha256'), 'hex');
  get diagnostics removed = row_count;
  return removed > 0;
end $$;
grant execute on function public.delete_room(text, text) to anon, authenticated;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.results;
```

`supabase/README.md`: paste `schema.sql` into the SQL editor once; the app needs only the publishable key.

- [ ] Steps: failing test → implement → `npm test && npx tsc --noEmit` → commit `feat: Supabase rooms and results directory with schema`.

---

### Task 15: Docs, cleanup, ship to develop

- [ ] Update `CLAUDE.md` layout/conventions for rooms, series, `state/series.ts`, `platform/supabase*`, `supabase/schema.sql`; update `README.md` "Play online" (rooms, challenges, series rules, how to run the schema); mark `2026-09-24-online-play-design.md` as superseded at the top; add the enhancements list to the new spec (already there).
- [ ] `npm test && npm run build`; browser smoke on the LAN server with two tabs: nickname sheet, create room, second tab enters, challenge → accept → play → results row; delete room kicks the other tab.
- [ ] Push `feat/rooms`, open a PR against `develop`, wait for CI, merge. Remind the owner to run `supabase/schema.sql` before testing on two devices.
