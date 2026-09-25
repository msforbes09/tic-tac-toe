# Domain-Driven Design

Keep the domain model explicit and separate from delivery details.

- **Ubiquitous language.** Use the names the specs use everywhere: board, cell, seat (`p1`/`p2`), outcome, rung, band, ladder, moment, series, referee, watcher, room, challenge. Do not invent synonyms in code (`player1` vs `p1`, `level` vs `rung`).
- **Layers.** `src/lib` and `src/state` are the domain: pure functions and reducers, no React, no DOM, no Supabase. `src/platform` adapts browsers and Supabase behind interfaces (`Feedback`, `Connection`, `RoomDirectory`, `ShareLink`). `src/components` is delivery only and holds no rules.
- **Aggregates own their invariants.** `gameReducer` owns board legality, `series.ts` owns first-to-6 and tie-breaks, `ladder.ts` owns rung movement, `onlineReducer(role)` owns who may change what. A component never re-implements or bypasses a rule these hold.
- **Types name concepts.** New domain concepts go in `src/lib/types.ts` (or the owning module) as named types, not as loose strings and booleans passed around.
- **Boundaries validate.** Anything crossing from the network (broadcast, presence, rows) is validated by the `room.ts` validators before the domain sees it.
- Read the relevant spec in `docs/superpowers/specs/` before changing a rule; the spec is the model's source of truth.
