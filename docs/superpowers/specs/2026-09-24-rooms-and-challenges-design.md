# Rooms, challenges, and spectators — Design Spec

Date: 2026-09-24
Branch: `feat/rooms` (off `develop`)

Agreed with the owner in conversation. Supersedes the join-by-code flow in
`2026-09-24-online-play-design.md`. The transport, the referee model, and the
`GameScreen` online session from that spec are kept and extended.

## Goal

Online play becomes a place to hang out. Anyone can create a **room** or enter
one from a live list. Inside, members see each other by nickname and can
**challenge** any idle member. An accepted challenge is a **series**: first to
6 wins out of 10 games, sudden death if level. Everyone else in the room can
see the series running and **watch** it live. Rooms and series results
**persist** in Supabase so a room's history survives after everyone leaves.

No accounts. The app ships only the Supabase publishable key.

## Identity and nicknames

- Each device has a random `deviceId` in localStorage (`tic-tac-toe:device`).
- The first time someone picks **Online** on setup, a sheet shows a text box
  prefilled with a random themed nickname (see Names) and a **Save** button.
  The nickname is stored in localStorage (`tic-tac-toe:nickname`) and can be
  edited later from a pencil next to the name on the room list header.
- Nicknames are 2–20 characters after trimming. Empty falls back to the random
  one.

## Names

Room names and nicknames come from one generator: `<Adjective> <Term>`, e.g.
"Sly Diagonal", "Quiet Corner", "Bold Center", "Lucky Fork", "Iron Edge".
Adjectives (about 30) and terms (Corner, Edge, Center, Diagonal, Row, Column,
Fork, Block, Line, Square, Cross, Nought) give ~360 combinations. When a name
is already in use in the same list (rooms, or members of a room), a two-digit
suffix is added ("Sly Diagonal 27").

## Storage (Supabase Postgres)

Two tables, created by `supabase/schema.sql`, run once in the SQL editor.
Row Level Security is on.

```
rooms      id text pk, name text, creator_id text, owner_hash text, created_at timestamptz
results    id uuid pk, room_id text fk→rooms on delete cascade,
           winner text, loser text, winner_score int, loser_score int,
           games int, reason text ('decided'|'resigned'|'left'), ended_at timestamptz
```

- Policies: everyone (anon) can `select` and `insert` on both tables. No
  `update`. `delete` on `rooms` only through the function
  `delete_room(room_id text, token text)` (security definer) which deletes when
  `owner_hash = encode(digest(token, 'sha256'), 'hex')`. `results` are deleted
  only by the cascade.
- On create, the device makes a random `ownerToken`, stores it in localStorage
  (`tic-tac-toe:rooms-owned` → `{ [roomId]: token }`), and inserts the room
  with its SHA-256 hash.
- **One room per device.** Creating another asks "Delete your room Bold
  Corner and create a new one?" with **Delete and create** / **Cancel**.
  Deleting is available from inside your own room via **Delete room** (with
  confirmation). A deleted room kicks everyone in it back to the list with
  "The room was deleted".
- Results are inserted by the referee when a series ends.

## Channels (Supabase Realtime, public)

- **Lobby** `ttt-lobby`. Every member of every room tracks
  `{ roomId, nickname }`. Member counts on the room list come from here; the
  rooms themselves come from the table.
- **Room** `ttt-room:<roomId>`. Presence `{ deviceId, nickname, status,
  gameId }` with status `idle | playing | watching`. Broadcast:
  `challenge { to, gameId }`, `accept { gameId }`, `decline { gameId }`,
  `cancel { gameId }`, `series-ended { result }`, `room-deleted`.
  Games in progress are derived from presence: members with `playing` and the
  same `gameId`, in pairs.
- **Game** `ttt-game:<gameId>`. The existing protocol: referee → all `state`;
  opponent → referee `move`, `hello`; plus `next-game` and `resign` from
  either player; watchers only receive. Presence `{ deviceId, role }` with
  role `referee | player | watcher` tells the referee who is present.

## Series rules

- The **challenger's device is the referee** and holds the truth. Its
  `SeriesState` is: both players (deviceId, nickname), score, game number,
  the current `GameState`, phase (`playing | between | tie-break | over`),
  and the result once over.
- Game 1: the **challenged** player is X. First move alternates every game.
- A win is a point, a draw is none. **First to 6** takes the series. If it is
  level after 10 games, **sudden death**: keep playing until a game is won.
  Entering sudden death shows the **Tie breaker** interstitial.
- **Next game** is enabled only when the current game is finished. Either
  player can press it.
- **← Resign** (header, with confirmation) ends the series at once as a loss
  for the resigner, whatever the score.
- When the series is decided the referee inserts the result, broadcasts
  `series-ended` on the room channel, and both players' button becomes
  **Back to room**.

## Presence, dropping, and grace

- A player missing from the game channel for **30 seconds** has resigned.
  Meanwhile the opponent sees "Waiting for Bob…" and the board is locked. If
  they return within the grace period play resumes from the referee's state.
- If the **referee** drops, the other player becomes the referee from the last
  snapshot it holds, after the same 30 seconds; if the original referee
  returns later it rejoins as the player. A watcher never becomes referee.
- Leaving the room mid-series is a resign, with confirmation. Closing the
  app is a drop.
- A challenge expires after 30 seconds unanswered. The sender can **Cancel**.
  If the target is no longer idle when it arrives, it is auto-declined.
- Only idle members can be challenged. Watching counts as idle: a watcher who
  is challenged gets the sheet on top of the game they are watching.

## Screens

1. **Setup, Online**: nickname sheet on first use. Then **Create room** and the
   live room list (name, "3 in room", tap to enter). Empty state: "No open
   rooms yet. Create one!". Header shows your nickname with a pencil.
2. **Room**: header with the room name, **Leave**, and **Delete room** for the
   creator. Blocks: **Games in progress** ("Alice vs Bob · 3–2", tap to
   watch), **People** (nickname, status, **Challenge** beside idle members
   other than you), **Results** (newest first: "Alice beat Bob 6–4",
   "Bob resigned to Alice at 2–3"). Your pending challenge shows "Waiting for
   Bob…" with **Cancel**. An incoming one opens a sheet "Alice challenges
   you" with **Accept** / **Decline**.
3. **Interstitials** (full-column splash, ~2 s, same style as the opening
   splash): "Alice vs Bob" when a series starts, shown to the two players and
   to every room member not currently playing, with **Watch** / **Dismiss**
   for the latter; "Tie breaker" when sudden death begins, to players and
   watchers; the result ("Alice wins the series 6–4") at the end.
4. **Series screen** for players: series bar ("You 3 · 2 Bob · Game 6 of 10",
   or "Tie breaker" in sudden death), the board, status line ("Your turn",
   "Bob's turn", "You win!", "You lost", "Draw"), **Next game** (disabled
   until the game ends), **Resign** in the header. Confetti on a game you
   win and on winning the series.
5. **Watching**: same screen read-only, names in place of You ("Alice's turn",
   "Alice wins!"), a **Watching** badge, **Back** to the room.
6. **Leaving the room** returns to setup. `?room=<id>` links open straight
   into that room (after the nickname sheet if needed).

## History (local)

Each finished **game** in a series is still saved to the device's local
history with `mode: 'online'` and your own symbol, as today. Watchers save
nothing. Series results live in Supabase, not in local history.

## Code layout

- `src/lib/room.ts`: channel names, message types and validation (extended),
  `?room=` links.
- `src/lib/names.ts` (pure, tested): adjectives, terms, `randomName`,
  `uniqueName(existing)`.
- `src/lib/series.ts` (pure, tested): `SeriesState`, `startSeries`,
  `seriesReducer` (move, next-game, resign, drop-resign, sync), first-move
  rotation, first-to-6, sudden death, `seriesResult`.
- `src/lib/identity.ts` (tested): deviceId, nickname, owned-room tokens over
  the Storage-like interface; `sha256Hex` via WebCrypto with a fallback.
- `src/lib/roomDirectory.ts`: `RoomDirectory` interface (`listRooms`,
  `createRoom`, `deleteRoom`, `listResults`, `addResult`, `onRoomsChange`)
  plus an in-memory fake. `src/platform/supabaseDirectory.ts` implements it
  over `@supabase/supabase-js` (postgres + `postgres_changes` on `rooms`).
- `src/lib/roomConnection.ts`: `RoomConnection` gains typed presence
  metadata (`track(meta)`) and the fake supports several channels;
  `src/platform/supabaseRoom.ts` follows. `openRoom(name, meta)` opens any
  channel.
- `src/state/online.ts`: the referee reducer now works over `SeriesState`.
- Components: `NicknameSheet`, `RoomList`, `RoomScreen`, `ChallengeSheet`,
  `Interstitial`, `SeriesScreen` (wraps `GameScreen`'s board, status, and
  feedback with the series bar, Resign, Next game, watch mode).
  `OnlineLobby` and the code/Join UI are removed; `OnlineGame` is replaced by
  `RoomScreen` + `SeriesScreen`.

## Out of scope (enhancements list)

Private rooms with PIN, room search, adaptive bot difficulty ranges,
persistent per-player stats, chat, more than two players in a game, rejoining
a series after both players left.

## Testing

TDD. Unit tests for names, series rules, identity, message validation, and
the referee reducer. Component tests with the fake connection and fake
directory: nickname sheet, room list live counts, create/delete room with the
one-room rule, enter room, challenge → accept → series to 6, sudden death,
Next game disabled mid-game, resign, drop and grace, referee handover,
watching with names, results list, interstitials with Watch/Dismiss.
`supabaseDirectory.ts` and `supabaseRoom.ts` are verified by hand on two
devices.
