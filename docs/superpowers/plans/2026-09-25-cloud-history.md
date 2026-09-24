# Cloud History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log two-player and bot games to Supabase with an offline write-ahead, keep the bot ladder in the cloud, and make History show the section for the selected mode.

**Architecture:** Local storage stays the first write (entries gain `synced`, the ladder gains `updatedAt`); pure helpers in `history.ts` and `ladder.ts` decide what to push and which ladder is newer; `RoomDirectory` gains four methods implemented by the fake and the Supabase adapter; `GameScreen` reports each recorded game to App, which pushes and marks; `HistorySheet` takes a `mode` and reads cloud rows with a local fallback.

**Tech Stack:** unchanged (Vite, React 19, TS, Vitest, `@supabase/supabase-js`).

**Spec:** `docs/superpowers/specs/2026-09-25-cloud-history-design.md`

## Global Constraints

- Branch `feat/cloud-history` off `develop`. TDD per task, plain commits.
- Two-player rows are from Player 1's side: `outcome: 'won'` = Player 1 won; `symbol: 'X'`.
- Cloud reads fetch at most 50 rows; the sheet pages 10 at a time.
- The ladder never moves on two-player or online games.
- `lib/` and `state/` stay React- and DOM-free.

## Review Focus

1. A game finished offline is pushed exactly once when the app next launches online, and never twice. → Task 1, Task 6.
2. A cloud ladder older than the local one is not adopted; a newer one is. → Task 2, Task 6.
3. Cloud fetch failure shows the local list, not an empty sheet. → Task 5.
4. Two-player rows never touch the ladder or the bot record table. → Task 4, Task 5.
5. The Bot section with no Supabase configured still works from local storage. → Task 5.

---

### Task 1: history helpers — `synced`, `gameRowFromEntry`, `unsyncedEntries`, `markSynced`
Files: `src/lib/history.ts`, `src/lib/history.test.ts`.
Produces: `HistoryEntry.synced?: boolean` (validated when present); `GameRow` type re-exported from `roomDirectory` is defined here as
`{ id, playerId, mode: 'pvp' | 'bot' | 'online', difficulty: Difficulty | null, rung: number | null, outcome: 'won' | 'lost' | 'draw', symbol: Player, playedAt: number }`;
`gameRowFromEntry(entry, playerId): GameRow` (outcome from `winnerSeat`); `unsyncedEntries(storage): HistoryEntry[]`; `markSynced(storage, ids: string[]): void`.
Commit: `feat: history entries know whether they reached the cloud`.

### Task 2: ladder — `updatedAt` and `newerLadder`
Files: `src/lib/ladder.ts`, `src/lib/ladder.test.ts`.
Produces: `Ladder.updatedAt: number` (0 for legacy data; `advance` stamps `now`); `newerLadder(local, cloud | null): Ladder` returns the one with the larger `updatedAt`, local on ties.
Commit: `feat: ladders carry updatedAt so the newer copy wins`.

### Task 3: directory — games and ladders
Files: `src/lib/roomDirectory.ts` (+test), `src/platform/supabaseDirectory.ts` (+test).
Produces on `RoomDirectory`: `addGames(rows: GameRow[]): Promise<void>` (upsert by id, ignoreDuplicates); `listGames(playerId, mode, limit?): Promise<GameRow[]>` newest first; `loadLadder(playerId): Promise<CloudLadder | null>` where `CloudLadder = Ladder & { playerId }`; `saveLadder(playerId, token, ladder): Promise<void>` via rpc `save_ladder`.
Row mapping: `games` ↔ `{ id, player_id, mode, difficulty, rung, outcome, symbol, played_at }`; `ladders` ↔ `{ player_id, rung, streak, top_held_at, top_held_count, updated_at }`.
Commit: `feat: games and ladders in the directory`.

### Task 4: GameScreen records two-player games and reports each record
Files: `src/components/GameScreen.tsx` (+test).
Produces: prop `onRecorded?: (entry: HistoryEntry, ladder: Ladder | null) => void`. Two-player games save locally (`difficulty: null`, `p1Symbol: 'X'`, no rung, no ladder move) and report `ladder: null`; bot games report the advanced ladder.
Commit: `feat: two-player games are recorded again and every record is reported`.

### Task 5: HistorySheet per mode with cloud rows
Files: `src/components/HistorySheet.tsx` (+test).
Produces: prop `mode: Mode`; optional `cloud?: { deviceId: string; directory: RoomDirectory }` (the existing `online` prop stays for series). One section per mode. Two-player tally + rows; Bot table + badge + rows; Online series. Rows from `listGames` when `cloud` is set and the call succeeds, otherwise local entries of that mode. Without `online`/`cloud` the Online section reads "Online play is not set up".
Commit: `feat: History shows the selected mode, from the cloud when it can`.

### Task 6: App wiring — mode, flush, push, ladder sync
Files: `src/App.tsx` (+test).
Behaviour: `setupMode` state from `loadSetup` / `initialMode`, updated by `SetupScreen.onModeChange`; passed to `HistorySheet` as `mode`, with `cloud` when services exist. On launch with services: push `unsyncedEntries` via `addGames` then `markSynced`; `loadLadder(deviceId)` and, if newer, `saveLadder` locally. `onRecorded`: push the entry and mark it; if a ladder came along, `saveLadder(deviceId, playerToken, ladder)` to the cloud. All best-effort with `.catch(() => {})`.
Commit: `feat: games and the ladder sync to Supabase, History follows the mode`.

### Task 7: migration, docs, ship
`supabase/migrations/2026-09-25-cloud-history.sql` (mode check with `pvp`, `rung` column, `ladders` table, `save_ladder`, policies, publication guard) folded into `schema.sql`; README/CLAUDE.md updates; PR to `develop`, CI, merge; release PR to `main`, CI, merge; verify live; remind the owner to run the migration.
