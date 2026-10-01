# Result: 003 Kaya domain

**Status:** in progress
**Date:** 2026-10-01
**Branch / PR:** `feat/kaya-domain` (from `origin/develop` at 1dad4fb, which contains #56) → `develop`
**Preview or run link:**

## Plan

Survey (grep at 1dad4fb) found the old domain in exactly the files the handoff lists:
`index.html` (6 lines: canonical, og:url, og:image, twitter:image, JSON-LD url and image),
`public/robots.txt`, `public/sitemap.xml`, `README.md:18`, `functions/_middleware.js:5`,
`src/platform/meta.test.ts:12`, `test/pagesMiddleware.test.js:15,19`. The
`docs/superpowers/plans/2026-09-23-tic-tac-toe.md:2446` line is `gh repo view msforbes09/tic-tac-toe`,
a repo reference without `iam4bs`, so the grep does not hit it and it stays. The grep also hits
`handoff/001-kaya-rebrand/HANDOFF.md` and `RESULT.md` (see the ruling below).

1. **Red, middleware:** in `test/pagesMiddleware.test.js` change the expected redirect to
   `https://tictactoe.kayarandomized.com/?room=AB2C` (exact string, pins the typo risk) and the
   pass-through host to `https://tictactoe.kayarandomized.com/`. Run it: the redirect assertion fails
   (still the old origin). The pass-through case already passes (any non-pages.dev host passes), which
   is correct.
2. **Red, metadata:** in `src/platform/meta.test.ts` set `LIVE = 'https://tictactoe.kayarandomized.com/'`.
   Run it: canonical, og/twitter, robots/sitemap and JSON-LD tests fail.
3. **Green:** `CANONICAL_ORIGIN = 'https://tictactoe.kayarandomized.com'` in `functions/_middleware.js`
   (`PAGES_HOST` unchanged); swap the six URLs in `index.html`, the sitemap `<loc>` and robots
   `Sitemap:` lines. Run both tests green, then `npm test`.
4. **Docs:** `README.md:18` Live line to the new address (not test-covered; a prose line).
5. **Ship:** `npm test`, `npm run build`, `npm run e2e` (expect no snapshot changes: no visible text
   changes), the two done-when greps, `npm run format:check` count compared against develop
   (no new failures). Read-only `curl` of the pages.dev host and the new domain, noted here.
6. PR to `develop` with the report-back body; wait for CI; fill this file; message Mira "ready".

No refactor step expected (string swaps). No skeptic/qa-tester: nothing touches layout, overlays or
the online flow (CLAUDE.md makes them mandatory only for those).

Ruling (proposed): leave `handoff/001-kaya-rebrand/*` and this handoff's own `HANDOFF.md` as they
are — they are historical records (HANDOFF.md is read-only for workers by `handoff/README.md`, and this
handoff must be saved verbatim, which itself contains the old domain) — cost if wrong: Mira wants those
redacted too, a one-line follow-up edit. The done-when grep will therefore show those `handoff/` hits
in addition to nothing else; I will quote it in full.

## Summary

## Done-when checklist

## How to run

## Rulings

## Deferred minors

## Merge danger

## Conflicts with CLAUDE.md

## Tests

## Open questions for Mira / Arnel

1. Is it fine that `handoff/001-kaya-rebrand/*` and `handoff/003-kaya-domain/HANDOFF.md` keep the old
   domain as historical text (see the proposed ruling in the plan)?

## Suggestions for Mira

## Suggested next steps
