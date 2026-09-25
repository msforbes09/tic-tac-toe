# DRY — Don't Repeat Yourself

Every rule and fact has one home.

- Board, series, ladder, and online rules live in `src/lib` / `src/state`. Components call them; they never copy the logic.
- Shared shapes go in `src/lib/types.ts` or the module that owns them; do not redeclare them locally.
- Banter lines, names, channel names, and storage keys are defined once (`banter.ts`, `names.ts`, `room.ts`, `history.ts`) and imported.
- `src/lib/logo.ts` and `public/icon.svg` are the one accepted duplication, and `logo.test.ts` keeps them in step. Any new duplication must be pinned the same way or removed.
- DRY applies to tests too: use small builders/fixtures instead of pasting the same board setup across files, but keep each test readable on its own.
- Balance against YAGNI: three similar lines are fine; a copied rule is not. Extract when the copy encodes behaviour, not just shape.
