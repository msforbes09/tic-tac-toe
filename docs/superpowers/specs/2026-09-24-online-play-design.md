# Online play with friends — Design Spec

Date: 2026-09-24
Branch: `feat/online-play`

Agreed with the owner by voice. Lifts "online / multiplayer over network" out
of the out-of-scope list in `2026-09-23-tic-tac-toe-design.md`, for friends
only.

## Goal

Two people on different devices play each other by sharing a room code or
link. There are no accounts, no matchmaking with strangers, and nothing is
stored on a server. It works on a static deploy (now Cloudflare Pages) with no server
code of our own.

## Transport: Supabase Realtime

- Each room is a Supabase Realtime channel named `ttt-room:<CODE>`. Moves go
  over **broadcast** and who is in the room is tracked with **presence**. No
  database tables, no Postgres changes, no auth.
- Config comes from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. They
  go in `.env.example` (blank), in the owner's local `.env`, and in the
  Cloudflare Pages project's build environment variables (originally GitHub
  repository secrets passed by `deploy.yml`). The anon key is public by design.
- If either value is missing, the Online option still shows on setup but is
  disabled, with the hint "Not set up".
- `public/sw.js` already ignores cross-origin requests, so the service worker
  does not touch Supabase traffic. No change and no `CACHE` bump.

## Flow

1. **Setup.** Mode gains a third option, **Online**, next to Two player and
   Bot. With Online selected, the difficulty and symbol fields are hidden and
   the screen shows **Create room** plus a code field with **Join**.
2. **Create.** The host gets a four-character code from an unambiguous
   alphabet (no 0/O, 1/I/L). A lobby shows the code in large type, a
   **Share** button (Web Share API with the link `<app url>?room=<CODE>`,
   falling back to copying the link), and "Waiting for your friend…".
3. **Join.** The guest types the code (case-insensitive, spaces trimmed) or
   opens the link. A `?room=` link opens the app straight into joining that
   room, then removes the parameter from the address bar.
4. **Play.** Once both are present, the game screen opens on both devices.
   The host is seat `p1` and plays X in the first game. After that the
   existing rules apply: winner takes X, a draw swaps. The score bar reads
   **You** and **Friend** on each device, from that device's point of view.
   The board only accepts taps on your turn. The status line says "Your
   turn" or "Friend's turn".
5. **Next game.** Either player can press **New game**. Pressing it
   mid-game abandons that game on both devices, the same as offline.
6. **Leaving.** Back leaves the room.
   - If the guest leaves, the host sees "Your friend left" with **Wait** (stay
     in the room; if the friend rejoins with the same code, play resumes
     from the current board and score) or **Back**.
   - If the host leaves, the room ends. The guest sees "Your friend left" with
     **Back** only.
   - A third person joining a room that already has two players sees "Room is
     full" and returns to setup.
   - Unknown or empty code: the guest waits in the lobby with "Waiting for
     your friend…" (there is no way to tell an empty room from a wrong
     code without a server). A **Cancel** button returns to setup.
   - Connection failure (offline, bad config): "Couldn't connect" with
     **Back**.

## Authority and sync

The host is the referee. The host's `GameState` is the truth.

- Guest → host: `{ type: 'move', index }` and `{ type: 'new-game' }`.
  These are requests. The guest does not change its own board.
- Host → guest: `{ type: 'state', state: Snapshot }` after every change and
  whenever a guest joins. `Snapshot` is `board`, `p1Symbol`, `score`,
  `status`, `winner`, `winningLine`.
- The host runs guest requests through the existing `gameReducer`, so
  illegal or out-of-turn moves are ignored exactly as they are locally. It also
  drops a guest `move` when it is not the guest's turn.
- The guest applies snapshots with a new reducer action `SYNC`. Incoming
  messages are validated (`isRoomMessage`) and anything malformed is dropped.

## Code layout

- `src/lib/room.ts` (pure, tested): `createRoomCode(random)`,
  `normalizeRoomCode(input)` → code or null, `roomCodeFromUrl(url)`,
  `roomLink(baseUrl, code)`, message types, `isRoomMessage(value)`.
- `src/lib/types.ts`: `Mode` gains `'online'`.
- `src/state/reducer.ts`: `SYNC` action; `snapshotOf(state)`; a helper that
  says whether a seat may move now.
- `src/lib/online.ts` (pure, tested): the host's and guest's message
  handling as functions over `GameState`, so the referee rules are tested
  without React or a network.
- `src/platform/supabaseRoom.ts`: the only file that imports
  `@supabase/supabase-js`. Implements a small `RoomConnection` interface
  (`send`, `onMessage`, `onPresence(count, hostPresent)`, `leave`).
- `src/lib/roomConnection.ts`: the `RoomConnection` interface plus an
  in-memory fake that links two connections, used by component tests.
- `src/components/OnlineLobby.tsx`: create/join waiting screen, share,
  cancel, room full, connection errors.
- `GameScreen` takes an optional online session (`{ connection, seat }`),
  turning off local play on the other seat and routing moves through the
  connection. `ScoreBar`, `StatusBar` and `SetupScreen` gain the online
  labels and option.
- History: each device saves finished online games with `mode: 'online'`,
  `difficulty: null`, and `p1Symbol` set to **its own** symbol, so "you" is
  always seat `p1` in stored history. The history sheet labels them
  "Online". Bot stats ignore them, as they ignore two-player games.
- Online is never saved as the remembered setup mode. After an online game,
  the next setup opens on the last offline mode.

## Out of scope

Random matchmaking, accounts, names, chat, spectators, resuming after the
**host** reloads or loses connection, rematch voting, and online play while
offline.

## Testing

TDD. Pure modules (`room`, `online`, reducer `SYNC`) get unit tests.
Components are tested with the in-memory fake connection: create → lobby →
friend joins → both boards update → turn locking → new game → friend left
→ rejoin resumes → room full. `supabaseRoom.ts` is thin and not unit tested.
The owner checks it by hand on two devices once the env values are set.

## Docs

Update `CLAUDE.md` (layout, the online conventions, the new env values) and
`README.md` (how to play online, how to configure Supabase). Remove the online
line from the out-of-scope list in the original spec, pointing here.
