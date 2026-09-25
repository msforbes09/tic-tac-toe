---
paths:
  - "src/lib/**"
  - "src/state/**"
---

# Pure domain code

- Never import React, `react-dom`, or anything from `src/components` or `src/platform`.
- Never touch `window`, `document`, `localStorage`, `navigator`, or timers directly; take a Storage-like or interface argument instead (see `history.ts`, `setup.ts`).
- Every exported function has a test in the sibling `*.test.ts`. A new export without a test is incomplete.
- Board is `Cell[]` of length 9, row-major; X always moves first; seats are `p1`/`p2`.
