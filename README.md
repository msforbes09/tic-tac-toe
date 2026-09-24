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

**Live:** https://tic-tac-toe.iam4bs.dev/ (deployed from `main` by Cloudflare Pages, see [Hosting](#hosting))

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

Choose **Online** on the setup screen. The first time, pick a nickname (a
random one is offered). Then **Create room** or tap a room in the live list.
Inside a room you see who is there, who is playing whom, and past results.
**Challenge** any idle member; if they accept, you play a series: first to 6
wins out of 10 games, with a tie breaker if it is level after 10. The
challenged player moves first in game 1 and first move alternates. **Resign**
counts as a loss whatever the score. Everyone else in the room can **Watch**.
Rooms and results persist; only the room's creator can delete it, and each
device owns one room at a time.

Online play runs over [Supabase](https://supabase.com): Realtime channels for
presence and moves, plus two small tables for rooms and results. To enable it:

1. Create a free Supabase project.
2. Run `supabase/schema.sql` once in its SQL editor (see `supabase/README.md`).
3. Copy the Project URL and publishable key from Project Settings → API.
4. Locally: copy `.env.example` to `.env` and fill both values.
5. Deploys: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build
   environment variables on the Cloudflare Pages project.

Without them the Online option shows as "Not set up".

## Hosting

The site is a static build hosted on Cloudflare Pages, connected to this
GitHub repository. Every push to `main` deploys; every pull request gets a
preview URL. Project settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: read from `.node-version`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  (optional; Online is disabled without them)

The project's `pages.dev` address redirects to the real domain via
`functions/_middleware.js`, so shared room links always carry one address.
Preview deployments are not redirected.

App icons come from `public/icon.svg` (geometry in `src/lib/logo.ts`). To
regenerate the PNGs on macOS: `qlmanage -t -s 512` on the SVG for `icon-512.png`,
`sips -z 192 192` for `icon-192.png`; drop the `rx` from the rect for the
maskable and Apple touch icons (512 and 180).

Link previews use `public/og-image.png`, drawn from `design/og-image.svg`.
It sets text in Fredoka and Nunito, which are not system fonts, so
regenerate it with a browser rather than qlmanage: inline the SVG in an HTML
page that declares both faces via `@font-face` from
`node_modules/@fontsource-variable/{fredoka,nunito}/files/*-latin-wght-normal.woff2`,
then screenshot it with headless Chrome at `--window-size=1200,630`.

GitHub Actions runs the tests and build on every pull request but does not
deploy.

## How it's put together

- `src/lib/game.ts` — pure board rules
- `src/lib/bot.ts` — easy (random), medium (win/block), hard (minimax)
- `src/lib/history.ts` — localStorage history, capped at 100 games
- `src/lib/feedback.ts` + `src/platform/browserFeedback.ts` — move/win/draw sounds and haptics
- `src/lib/room.ts` — channels, events, messages, and validation for online play
- `src/state/reducer.ts` — game state
- `src/state/series.ts` — series rules (first to 6, tie breaker, resign)
- `src/state/online.ts` — the referee / player / watcher reducer
- `src/platform/supabase*.ts` — Supabase adapters (the only Supabase imports)
- `supabase/schema.sql` — rooms and results tables
- `src/components/` — React UI on shadcn/ui

The design spec lives in `docs/superpowers/specs/`.
