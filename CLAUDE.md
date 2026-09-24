# tic-tac-toe (React)

Mobile-first browser tic-tac-toe. Two-player local, versus bot
(easy / medium / hard), or online: rooms where members challenge each other
to first-to-6 series that everyone else can watch. Bot games are saved to
localStorage history; two-player games are not saved; rooms, players, and
series results live in Supabase.

## Stack

Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui, Vitest + RTL.

## Layout

- `src/lib/game.ts` — pure board logic. No React. Fully tested.
- `src/lib/bot.ts` — bot strategies. Depends only on game.ts. Fully tested.
- `src/lib/history.ts` — history persistence over a Storage-like interface. Fully tested.
- `src/lib/feedback.ts` — which sound/haptic a board change gets. Fully tested.
- `src/platform/browserFeedback.ts` — Web Audio tones + Vibration API behind the `Feedback` interface. The only browser-API code outside components.
- `src/lib/setup.ts` — remembers the last setup in localStorage. Fully tested.
- `src/lib/logo.ts` — the logo's geometry (overlapping X and O). `public/icon.svg` copies it by hand; `logo.test.ts` keeps them in step. `components/Logo.tsx` draws it.
- `src/lib/types.ts` — shared domain types (Mode, Difficulty, Settings, Outcome, Seat).
- `src/lib/room.ts` — channel names, room events, game messages, presence shapes and their validators, room links, Supabase config. Fully tested.
- `src/lib/names.ts` — themed names ("Sly Diagonal") for rooms and nicknames. Fully tested.
- `src/lib/identity.ts` — device id, nickname, owner tokens, SHA-256 (WebCrypto with a JS fallback). Fully tested.
- `src/lib/realtime.ts` — the `Connection<Meta>` interface (broadcast + presence) plus an in-memory fake.
- `src/lib/roomDirectory.ts` — the `RoomDirectory` interface (rooms, results) plus an in-memory fake.
- `src/state/series.ts` — series rules over `gameReducer`: first to 6, tie breaker, resign, snapshots, status text. Fully tested.
- `src/state/online.ts` — `onlineReducer(role)` for referee / player / watcher and `resolveRole`. Fully tested.
- `src/platform/supabase*.ts` — the only files that import `@supabase/supabase-js`: realtime adapter, directory adapter, shared client.
- `src/platform/share.ts` — Web Share / clipboard behind `ShareLink`.
- `src/components/OnlinePanel.tsx`, `RoomScreen.tsx`, `SeriesScreen.tsx`, `NicknameSheet.tsx`, `Interstitial.tsx` — the online UI.
- `supabase/schema.sql` — full schema for a fresh project (rooms, results, players, games, `delete_room`, `upsert_player`); `supabase/migrations/` holds dated deltas for existing projects.
- `src/components/` — React UI. `ui/` is shadcn-generated; don't hand-edit.
- `docs/superpowers/specs/` — design spec. Read before changing behaviour.
- `design/og-image.svg` — source of the link-preview banner `public/og-image.png`. `index.html` carries the SEO / Open Graph tags; keep the live URL there in sync with the domain.

## Conventions

- Board: `Cell[]` length 9, row-major. X always moves first.
- Seats `p1` (you / Player 1) and `p2` (bot / Player 2) trade X between games: winner takes X, a draw swaps. The bot plays whichever side is to move.
- lib/ and state/ never import React or touch the DOM.
- TDD for all logic: failing test first, minimal code, refactor.
- Mobile-first single column (max 420px) on every screen size. Dark theme only: `<html class="dark">` in index.html; nothing follows the system setting.
- Online: the challenger's device is the referee and holds the `SeriesState`; the challenged player and watchers send requests / `hello` and apply `state` snapshots. The challenger is `p1`; the challenged player is X in game 1 and first move alternates. First to 6 of 10, tie breaker if level, resign = loss, 30 s grace on a drop. Online games are not saved locally; the referee stores the series result (with challenger and challenged ids) and History shows a player's series from the directory. Online is never the remembered setup mode.
- Nicknames: 2–12 characters, letters, digits and single spaces, filtered as typed; random ones come from `randomNickname`. Each device has a player token that alone can rename its `players` row.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.example`). Missing → Online is shown disabled.
- Scope is fixed by the specs; replay, undo, matchmaking, accounts, and chat are out.

## Hosting

Cloudflare Pages builds `main` and PR previews from this repo (`npm run build` → `dist`,
Node from `.node-version`). Supabase env values live in the Pages project settings.
GitHub Actions (`ci.yml`) only runs tests and the build.

## Commands

- `npm run dev` / `npm test` / `npm run test:watch` / `npm run build`
