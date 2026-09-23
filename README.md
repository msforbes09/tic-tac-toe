# Tic-Tac-Toe

Mobile-first tic-tac-toe in the browser. Play a friend on the same phone, or
take on a bot with three difficulty levels — the hard bot never loses. Every
finished game is saved to a local history.

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
- `src/state/reducer.ts` — game state
- `src/components/` — React UI on shadcn/ui

The design spec lives in `docs/superpowers/specs/`.
