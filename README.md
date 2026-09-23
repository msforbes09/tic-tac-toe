# Tic-Tac-Toe

Mobile-first tic-tac-toe in the browser. Play a friend on the same phone, or
take on a bot with three difficulty levels — the hard bot never loses. Every
finished game is saved to a local history. Moves and wins come with sound
and, on phones that support it, haptics. Pick X or O against the bot; after
that the winner takes X and starts the next game, and a draw swaps. A session
score sits above the board, and history shows your record per difficulty.

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

## How it's put together

- `src/lib/game.ts` — pure board rules
- `src/lib/bot.ts` — easy (random), medium (win/block), hard (minimax)
- `src/lib/history.ts` — localStorage history, capped at 100 games
- `src/lib/feedback.ts` + `src/platform/browserFeedback.ts` — move/win/draw sounds and haptics
- `src/state/reducer.ts` — game state
- `src/components/` — React UI on shadcn/ui

The design spec lives in `docs/superpowers/specs/`.
