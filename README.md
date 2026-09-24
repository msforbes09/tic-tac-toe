# Tic-Tac-Toe

Mobile-first tic-tac-toe in the browser. Play a friend on the same phone, or
take on a bot with three difficulty levels — the hard bot never loses. Every
finished game is saved to a local history. Moves and wins come with sound
and, on phones that support it, haptics. Pick X or O against the bot; after
that the winner takes X and starts the next game, and a draw swaps. A session
score sits above the board, and history shows your record per difficulty.
Or play a friend online: create a room, share the four-letter code or link,
and play from two phones.

Built with Vite, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui.
Tested with Vitest and React Testing Library.

**Live:** https://msforbes09.github.io/tic-tac-toe-react/ (deployed from `main` by GitHub Actions)

## Run it

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — development server
- `npm test` — run the test suite once
- `npm run test:watch` — tests in watch mode
- `npm run build` — typecheck and production build

## Install it

On a phone, open the live site and use Add to Home Screen. It runs full screen
and works offline after the first visit. On a keyboard, the arrow keys move
around the board and Enter places a mark.

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

## How it's put together

- `src/lib/game.ts` — pure board rules
- `src/lib/bot.ts` — easy (random), medium (win/block), hard (minimax)
- `src/lib/history.ts` — localStorage history, capped at 100 games
- `src/lib/feedback.ts` + `src/platform/browserFeedback.ts` — move/win/draw sounds and haptics
- `src/lib/room.ts` — room codes, links, and message validation for online play
- `src/state/reducer.ts` — game state
- `src/state/online.ts` — the host-as-referee reducer for online rooms
- `src/platform/supabaseRoom.ts` — Supabase Realtime transport (the only Supabase import)
- `src/components/` — React UI on shadcn/ui

The design spec lives in `docs/superpowers/specs/`.
