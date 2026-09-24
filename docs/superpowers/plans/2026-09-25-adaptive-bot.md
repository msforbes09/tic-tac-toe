# Adaptive Bot Implementation Plan

> Executed inline with TDD: failing test, minimal code, refactor, commit per task.

**Goal:** Bot games stay close. A hidden 30-rung ladder moves one rung per result; the three visible levels remain as bands; reaching the top and holding it to a draw are the two moments worth a badge.

**Spec:** `docs/superpowers/specs/2026-09-25-adaptive-bot-design.md`

## Global constraints

- `lib/` and `state/` never import React or touch the DOM.
- Copy (exact): "Promoted to Medium", "Promoted to Hard", "Top of the pack.", "Nobody's above you now.", "That was the unbeatable bot.", "Holding it to a draw is as good as it gets.", "Share", "Keep playing", "Top of the pack" (badge), "Go on, warm up.", "Blocks. Bites back.", "Bring your best. It won't matter.", share text "I held the unbeatable tic-tac-toe bot to a draw. Your move."
- Storage key `tic-tac-toe:ladder`. History entries gain optional `rung`.
- Plain commit messages, no attribution trailer.

## Tasks

- [ ] 1. `lib/ladder.ts`: bands, `rungAfter`, `rungForSelection`, `momentAfter`, load/save.
- [ ] 2. `lib/bot.ts`: `chancesFor(rung)`, `chooseMove(board, rung, rng)`, memoised minimax with random tie-breaks, simulation test.
- [ ] 3. `lib/history.ts`: optional `rung` on entries.
- [ ] 4. `platform/share.ts`: optional text with the URL.
- [ ] 5. `StatusBar`: optional second line.
- [ ] 6. `GameScreen`: resolve rung on mount, feed the bot, advance after each bot game, save ladder and setup band, record rung, chip label rule, moments, `TopCard` with Share and Keep playing.
- [ ] 7. `HistorySheet`: the badge with Share.
- [ ] 8. `SetupScreen`: cocky descriptions. `App`: pass share and site URL through.
- [ ] 9. Docs: CLAUDE.md layout, README if needed. Full suite, build, PR.
