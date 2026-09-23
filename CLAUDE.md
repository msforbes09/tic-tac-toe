# tic-tac-toe (React)

Mobile-first browser tic-tac-toe. Two-player local or versus bot
(easy / medium / hard). Finished games are saved to localStorage history.

## Stack

Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui, Vitest + RTL.

## Layout

- `src/lib/game.ts` — pure board logic. No React. Fully tested.
- `src/lib/bot.ts` — bot strategies. Depends only on game.ts. Fully tested.
- `src/lib/history.ts` — history persistence over a Storage-like interface. Fully tested.
- `src/lib/types.ts` — shared domain types (Mode, Difficulty, Settings, Outcome).
- `src/state/reducer.ts` — game state reducer. Fully tested.
- `src/components/` — React UI. `ui/` is shadcn-generated; don't hand-edit.
- `docs/superpowers/specs/` — design spec. Read before changing behaviour.

## Conventions

- Board: `Cell[]` length 9, row-major. X moves first. Bot is always O.
- lib/ and state/ never import React or touch the DOM.
- TDD for all logic: failing test first, minimal code, refactor.
- Mobile-first single column (max 420px) on every screen size.
- Scope is fixed by the spec; scores, symbol choice, replay, undo are out.

## Commands

- `npm run dev` / `npm test` / `npm run test:watch` / `npm run build`
