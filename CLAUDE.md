# tic-tac-toe (React)

Mobile-first browser tic-tac-toe. Two-player local, versus bot
(easy / medium / hard), or online with a friend over Supabase Realtime.
Finished games are saved to localStorage history.

## Stack

Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui, Vitest + RTL.

## Layout

- `src/lib/game.ts` — pure board logic. No React. Fully tested.
- `src/lib/bot.ts` — bot strategies. Depends only on game.ts. Fully tested.
- `src/lib/history.ts` — history persistence over a Storage-like interface. Fully tested.
- `src/lib/feedback.ts` — which sound/haptic a board change gets. Fully tested.
- `src/platform/browserFeedback.ts` — Web Audio tones + Vibration API behind the `Feedback` interface. The only browser-API code outside components.
- `src/lib/setup.ts` — remembers the last setup in localStorage. Fully tested.
- `src/lib/types.ts` — shared domain types (Mode, Difficulty, Settings, Outcome, Seat).
- `src/lib/room.ts` — room codes, links, message validation, lobby presence rules, Supabase config. Fully tested.
- `src/lib/roomConnection.ts` — the `RoomConnection` interface plus an in-memory fake for tests.
- `src/state/reducer.ts` — game state reducer. Fully tested.
- `src/state/online.ts` — `roomReducer(role)`: the host is the referee; the guest only syncs. Fully tested.
- `src/platform/supabaseRoom.ts` — the only file that imports `@supabase/supabase-js`. Broadcast + presence, no tables.
- `src/platform/share.ts` — Web Share / clipboard behind `ShareLink`.
- `src/components/OnlineGame.tsx`, `OnlineLobby.tsx` — connect → lobby → `GameScreen` with an online session.
- `src/components/` — React UI. `ui/` is shadcn-generated; don't hand-edit.
- `docs/superpowers/specs/` — design spec. Read before changing behaviour.
- `design/og-image.svg` — source of the link-preview banner `public/og-image.png`. `index.html` carries the SEO / Open Graph tags; keep the live URL there in sync with the domain.

## Conventions

- Board: `Cell[]` length 9, row-major. X always moves first.
- Seats `p1` (you / Player 1) and `p2` (bot / Player 2) trade X between games: winner takes X, a draw swaps. The bot plays whichever side is to move.
- lib/ and state/ never import React or touch the DOM.
- TDD for all logic: failing test first, minimal code, refactor.
- Mobile-first single column (max 420px) on every screen size.
- Online: the host is seat `p1` and plays X in the first game; its `GameState` is the truth. Guests send `move` / `new-game` / `hello` requests and apply `state` snapshots via `SYNC`. History stores your own symbol as `p1Symbol`. Online is never the remembered setup mode.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.example`). Missing → Online is shown disabled.
- Scope is fixed by the specs; replay, undo, matchmaking, accounts, and chat are out.

## Hosting

Cloudflare Pages builds `main` and PR previews from this repo (`npm run build` → `dist`,
Node from `.node-version`). Supabase env values live in the Pages project settings.
GitHub Actions (`ci.yml`) only runs tests and the build.

## Commands

- `npm run dev` / `npm test` / `npm run test:watch` / `npm run build`
