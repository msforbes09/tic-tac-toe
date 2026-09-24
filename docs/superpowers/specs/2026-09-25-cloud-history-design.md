# Cloud history and per-mode History — Design Spec

Date: 2026-09-25
Branch: `feat/cloud-history` (off `develop`)

Agreed with the owner in conversation. Amends `2026-09-25-adaptive-bot-design.md`
(the ladder gains a cloud copy) and `2026-09-24-rooms-and-challenges-design.md`
(history rules). Supersedes the "two-player games are not saved" rule.

## Goal

Every finished game is logged: two-player and bot games to the `games` table,
online series to `results` as today. The bot's ladder follows the player across
devices. The History button is always shown and opens the section for the mode
selected on setup. Everything keeps working offline.

## Storage (Supabase)

- `games` (exists): `mode` check gains `'pvp'`; new nullable `rung int`
  (1–30, bot rows only). Columns used: `id` (the local entry id), `player_id`
  (device id), `mode`, `difficulty`, `rung`, `outcome` (`won | lost | draw`),
  `symbol` (Player 1's symbol), `played_at`. `opponent_id` and `series_id`
  stay null for now. Insert and select are public; inserts are idempotent by id.
- New `ladders`: `player_id text pk`, `token_hash`, `rung int null`,
  `streak int`, `top_held_at timestamptz null`, `top_held_count int`,
  `updated_at timestamptz`. Public select. Writes only through
  `save_ladder(p_id, p_token, p_rung, p_streak, p_top_held_at, p_top_held_count, p_updated_at)`
  (security definer): insert, or update when the token hash matches. Separate
  from `players` so a device that never chose a nickname still has a ladder.
- Two-player rows are recorded from Player 1's side: `outcome` `won` means
  Player 1 won; `symbol` is `X`.
- Migration: `supabase/migrations/2026-09-25-cloud-history.sql`, folded into
  `schema.sql` for fresh projects.

## Local write-ahead

- Local history (`tic-tac-toe:history`) stays the first write for bot and
  two-player games and now also stores `synced: boolean`. A finished game is
  saved locally, then pushed to `games`; on success it is marked synced.
- On every launch with Supabase configured, unsynced local entries are pushed
  (idempotent by id) and marked. Failures leave them for next time.
- The ladder (`tic-tac-toe:ladder`) gains `updatedAt`. After each bot game the
  ladder is saved locally then pushed with `save_ladder`. On launch the cloud
  ladder is fetched; when its `updatedAt` is newer than the local one it
  replaces the local copy. Last write wins.
- Online series are unchanged: the referee writes `results`.

## History sheet

- The History button keeps its label and is shown in every mode.
- The sheet shows one section, for the mode selected on setup:
  - **Two player**: a tally (Player 1 won · Player 2 won · Draws) and the list,
    rows "Player 1 won" / "Player 2 won" / "Draw".
  - **Bot**: the record table, the Top-of-the-pack badge, and the list with
    "You won" / "You lost" / "Draw" and the difficulty, as today.
  - **Online**: the player's series, as today.
- Two-player and bot lists read the latest 50 rows for the player and mode from
  `games` when reachable, otherwise the local list. Ten rows per page with
  View more. The record table and tally are computed from the rows shown.
- Without Supabase configured, the sheet works from local storage only; the
  Online section says online play is not set up.

## Code layout

- `src/lib/history.ts`: `synced` on entries; `gameRowFromEntry`; `unsyncedEntries`; `markSynced`.
- `src/lib/ladder.ts`: `updatedAt` on `Ladder`; `newerLadder(a, b)`.
- `src/lib/roomDirectory.ts`: `GameRow`, `CloudLadder`; `addGames`, `listGames`,
  `loadLadder`, `saveLadder` on `RoomDirectory` and the fake.
- `src/platform/supabaseDirectory.ts`: rows and the `save_ladder` rpc.
- `src/components/GameScreen.tsx`: saves two-player games locally again; calls
  `onRecorded(entry, ladder | null)` after each finished game.
- `src/components/HistorySheet.tsx`: `mode` prop; one section per mode; cloud
  rows with local fallback.
- `src/App.tsx`: tracks the setup mode via `onModeChange`; flushes unsynced
  games and syncs the ladder on launch; pushes each recorded game and ladder.

## Out of scope

Deleting rows, private per-device history (all rows stay public-readable with
the publishable key, like results), per-game rows for online series, and
merging two devices' ladders (last write wins).
