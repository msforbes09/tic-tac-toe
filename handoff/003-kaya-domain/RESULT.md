# Result: 003 Kaya domain

**Status:** done
**Date:** 2026-10-01
**Branch / PR:** `feat/kaya-domain` (from `origin/develop` at 1dad4fb, which contains #56) → `develop`, https://github.com/msforbes09/tic-tac-toe/pull/58
**Preview or run link:** https://feat-kaya-domain.tic-tac-toe-acl.pages.dev (branch preview; its HTML carries the new URL 6 times)

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

Ruling (accepted by Mira): leave `handoff/001-kaya-rebrand/*` and this handoff's own `HANDOFF.md` as they
are — they are historical records (HANDOFF.md is read-only for workers by `handoff/README.md`, and this
handoff must be saved verbatim, which itself contains the old domain) — cost if wrong: Mira wants those
redacted too, a one-line follow-up edit. The done-when grep will therefore show those `handoff/` hits
in addition to nothing else; I will quote it in full.

## Summary

Every address in the code is now `https://tictactoe.kayarandomized.com`: the canonical, `og:url`,
`og:image`, `twitter:image`, JSON-LD `url` and `image` in `index.html`, `public/robots.txt`,
`public/sitemap.xml`, the `README.md` Live line, and `CANONICAL_ORIGIN` in `functions/_middleware.js`
(`PAGES_HOST` unchanged). The tests pin the exact strings (`src/platform/meta.test.ts` `LIVE`, and
`test/pagesMiddleware.test.js` redirect target `https://tictactoe.kayarandomized.com/?room=AB2C`).
In total, 7 files with 13 lines each way, plus this handoff folder and the index row.

## Done-when checklist

- [x] `grep -rn "iam4bs" … .` hits only handoff records, which Mira ruled stay as they are. No code,
  config or docs file hits. The `docs/superpowers` repo-reference line does not contain `iam4bs`, so the
  grep does not show it. Full output:
  ```
  handoff/003-kaya-domain/HANDOFF.md:21, :31, :39, :70   (the handoff text itself, verbatim)
  handoff/003-kaya-domain/RESULT.md:15                    (this file's plan, quoting the word)
  handoff/001-kaya-rebrand/RESULT.md:22, :24–:33          (001's quoted grep output)
  handoff/001-kaya-rebrand/HANDOFF.md:13, :51, :61, :103  (001's handoff text)
  ```
  (Collapsed by line number. The full raw output is in the session log. Every hit is under `handoff/`.)
- [x] `grep -rn "tictactoe.kayarandomized.com" index.html public/robots.txt public/sitemap.xml README.md functions/_middleware.js`:
  ```
  public/robots.txt:4:Sitemap: https://tictactoe.kayarandomized.com/sitemap.xml
  public/sitemap.xml:4:    <loc>https://tictactoe.kayarandomized.com/</loc>
  index.html:16:    <link rel="canonical" href="https://tictactoe.kayarandomized.com/" />
  index.html:22:    <meta property="og:url" content="https://tictactoe.kayarandomized.com/" />
  index.html:23:    <meta property="og:image" content="https://tictactoe.kayarandomized.com/og-image.png" />
  index.html:30:    <meta name="twitter:image" content="https://tictactoe.kayarandomized.com/og-image.png" />
  index.html:36:        "url": "https://tictactoe.kayarandomized.com/",
  index.html:42:        "image": "https://tictactoe.kayarandomized.com/og-image.png"
  README.md:18:**Live:** https://tictactoe.kayarandomized.com/ (deployed from `main` by Cloudflare Pages, see [Hosting](#hosting))
  functions/_middleware.js:5:const CANONICAL_ORIGIN = 'https://tictactoe.kayarandomized.com'
  ```
- [x] `npm test` passes (52 files, 606 tests). `npm run build` passes. `npm run e2e` locally: 70 passed and 70 skipped.
  The skips are the phone-only and desktop-only `test.skip` splits, by design. No snapshot changed.
- [x] PR #58 is open against `develop` (base confirmed `develop`). CI is green: `check` (1m0s), `e2e` (6m17s), Cloudflare
  Pages. The body notes that the pages.dev redirect takes effect on deploy.
- [x] RESULT.md filled in.

## How to run

`npm test` · `npx vitest run test/pagesMiddleware.test.js src/platform/meta.test.ts` · `npm run build` · `npm run e2e`

Live checks, read-only, run before this PR deploys (both as expected):
- `curl -sI https://tic-tac-toe-acl.pages.dev/` → `HTTP/2 301`, `location: https://tic-tac-toe.iam4bs.dev/`
  (still the old domain until #58 reaches `main`; hosting untouched)
- `curl -s https://tictactoe.kayarandomized.com/ | grep -c kayarandomized` → `0` (the live build is still the old one)

## Rulings

- Ruling: `handoff/001-kaya-rebrand/*` and `handoff/003-kaya-domain/HANDOFF.md` keep `iam4bs`. Why: they are
  historical records, HANDOFF.md is read-only, and this handoff had to be saved verbatim. Mira accepted this.
  Cost if wrong: a one-line follow-up redaction.
- Ruling: `docs/superpowers/plans/2026-09-23-tic-tac-toe.md:2446` left alone. Why: it is `gh repo view
  msforbes09/tic-tac-toe`, a repo reference, and contains no `iam4bs`. Cost if wrong: none.
- Ruling: no skeptic or qa-tester run. Why: CLAUDE.md makes them mandatory only for layout, overlays or the
  online flow, and this change touches none of them. Cost if wrong: a redirect typo, but the exact string is
  pinned by the middleware test.
- Ruling: did not reformat. Why: `format:check` reports 127 files, the same as `develop`. The Prettier diffs in
  the two test files come from their existing style, not the new URL text. Cost if wrong: none.

## Deferred minors

- The middleware pass-through test (`passes the real domain…`) passes for any host other than pages.dev, so it
  cannot fail on the new-domain string. It is still the right behaviour. The redirect test is what pins the origin.

## Merge danger

Two-way door. Blast radius: SEO tags, crawler files, and the pages.dev → custom-domain redirect for every visitor
on the pages.dev address. Failure mode: if the new domain stopped resolving, pages.dev visitors would be sent to
a dead address. It answers HTTP 200 today. To revert, revert the merge commit; Pages redeploys in about a minute.

## Conflicts with CLAUDE.md

None. CLAUDE.md asks to keep the live URL in `index.html` in sync with the domain, and this change does that.

## Tests

- Red: 5 failed (`pagesMiddleware` redirect plus 4 `meta` tests), each `Received: "https://tic-tac-toe.iam4bs.dev/…"`.
- Green: both files 7/7. Full suite 52 files / 606 tests pass. Build passes. e2e 70 passed / 70 skipped (by design). CI green.

## Open questions for Mira / Arnel

None (the one question about handoff records was answered: keep them).

## Suggestions for Mira

- Future done-when greps could exclude `handoff/`, because the handoff's own text always hits.

## Suggested next steps

- After #58 reaches `main`: `curl -sI https://tic-tac-toe-acl.pages.dev/` should show
  `location: https://tictactoe.kayarandomized.com/`. Re-share the link once so chat apps re-scrape the OG card.
