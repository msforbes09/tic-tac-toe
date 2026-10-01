# Result: 001 Kaya rebrand

**Status:** done
**Date:** 2026-10-01
**Branch / PR:** `feat/kaya-rebrand` → `develop`, https://github.com/msforbes09/tic-tac-toe/pull/56
**Preview or run link:** https://feat-kaya-rebrand.tic-tac-toe-acl.pages.dev (Cloudflare Pages branch preview)

## Summary

Everything a player or a link preview sees now says Kaya Randomized:

- Footer (the splash, and the room's bottom-right corner on wide screens): `v{version} · © 2026 Kaya Randomized`.
- The slogan `Three in a row. Zero excuses.` replaces `Win three.` on the splash, the setup screen, the og/twitter descriptions and the social image.
- The social image carries `Kaya Randomized` instead of the domain.

URLs and code internals are unchanged.

History: plan delivery to Mira failed twice (held for approval, expired), so the job was marked blocked in commit `5239eab`. Mira's "go" and her rulings arrived on the third message, and the build followed.

## Done-when checklist

- [x] `grep -rn "iam4bs" src index.html design public/*.xml public/*.txt README.md` shows only URLs:
  ```
  src/platform/meta.test.ts:12:const LIVE = 'https://tic-tac-toe.iam4bs.dev/'
  index.html:16:    <link rel="canonical" href="https://tic-tac-toe.iam4bs.dev/" />
  index.html:22:    <meta property="og:url" content="https://tic-tac-toe.iam4bs.dev/" />
  index.html:23:    <meta property="og:image" content="https://tic-tac-toe.iam4bs.dev/og-image.png" />
  index.html:30:    <meta name="twitter:image" content="https://tic-tac-toe.iam4bs.dev/og-image.png" />
  index.html:36:        "url": "https://tic-tac-toe.iam4bs.dev/",
  index.html:42:        "image": "https://tic-tac-toe.iam4bs.dev/og-image.png"
  README.md:18:**Live:** https://tic-tac-toe.iam4bs.dev/ (deployed from `main` by Cloudflare Pages, see [Hosting](#hosting))
  public/sitemap.xml:4:    <loc>https://tic-tac-toe.iam4bs.dev/</loc>
  public/robots.txt:4:Sitemap: https://tic-tac-toe.iam4bs.dev/sitemap.xml
  ```
- [x] `grep -rn "Win three" src index.html design e2e test` returns nothing (exit 1). `msforbes` appears nowhere in src, index.html, design, public, e2e, test or README.
- [x] `npm test` green (606/606). `npm run build` green. `npm run format:check` is **red, but no more than on `develop`**: see Rulings.
- [x] `npm run e2e` run locally: 70 passed, 70 skipped (phone-only / desktop-only describes), 0 failed. Baselines: see Rulings.
- [x] `public/og-image.png` regenerated, 1200×630 RGB, shows the slogan and `Kaya Randomized`. Copy: `handoff/001-kaya-rebrand/og-image.png`.
- [x] Screenshots in `handoff/001-kaya-rebrand/`, all taken with Playwright against the built `dist`:
  - `splash-iphone-14.png` (iPhone 14): slogan and footer.
  - `setup-iphone-14.png` (iPhone 14): slogan. The phone setup screen has no footer by design.
  - `setup-desktop-1440.png`: setup with the colophon in the room corner.
- [x] PR #56 open against `develop`, body as in "Report back". CI: see Tests.
- [x] `RESULT.md` filled in.

## How to run

```
npm install          # once
npm test             # unit + component tests
npm run build
npm run e2e          # starts Vite on :4173 (or reuses a running server)
```

Baselines:

1. `npm run build && npx vite preview --port 4173 --host 0.0.0.0`.
2. In `mcr.microsoft.com/playwright:v1.63.0-noble`, mount the repo and its `node_modules`, forward container `localhost:4173` to `host.docker.internal:4173`.
3. Run `npx playwright test e2e/room.spec.ts -g "looks as it did" --project iphone-14 --project pixel-7 --update-snapshots=all`.

## Rulings

- Ruling: kept HANDOFF.md byte-for-byte and added `handoff/**/HANDOFF.md` to `.prettierignore` — the Prettier hook re-padded its tables on write; "verbatim" and "never edit HANDOFF.md" rule that out — cost if wrong: one line in a file outside section 4. **Mira confirmed: keep it.**
- Ruling: pinned the exact og/twitter description in the existing `src/platform/meta.test.ts` — the `index.html` text change otherwise had no failing test first — cost if wrong: 4 lines in a file outside section 4. **Mira confirmed.**
- Ruling: regenerated the setup baselines in the local Playwright Linux image (no pull), serving the built `dist` from the host as CI does — CI's Linux run owns the baselines — cost if wrong: CI's snapshot test fails and the baselines need one more regeneration. **Mira confirmed.**
- Ruling: the new baselines show Online as "Not set up"; the old ones showed it enabled — the old baselines were made with Supabase env. CI builds without it (its log reads "Online play is not set up") and only passed because that area is under the 1% tolerance. The new baselines match what CI renders — cost if wrong: none for CI. A local run with `.env` set differs there, but stays inside the 8% local tolerance.
- Ruling: left `npm run format:check` red — it already fails on `develop` (127 tracked files; CI doesn't run it). This branch leaves exactly the same set failing: I kept my edits Prettier-clean and reverted a whole-file reformat I'd started. Reformatting 127 files would make the PR far bigger than the job — cost if wrong: a follow-up formatting PR.
- Ruling: kept `og:image:alt` as is ("A tic-tac-toe board with X winning the diagonal, next to the title Tic-Tac-Toe") — still accurate and names no owner — cost if wrong: one line.
- Ruling: kept the og-image slogan at 40px — it renders from x=600 to x=1118 of 1200 with Fredoka/Nunito loaded, inside the frame and narrower than the title — cost if wrong: one attribute.
- Ruling: the footer copyright test pins the exact year `2026` (it was `\d{4}`) — the handoff says the expected values are the exact strings in the decisions table — cost if wrong: one regex to loosen in 2027 when `COPYRIGHT_YEAR` moves.
- Ruling: added a 1440×900 setup screenshot — the iPhone setup screen has no footer (the colophon is on the splash and, on wide screens, in the room corner), so this is the only setup view that shows it — cost if wrong: one extra PNG in the handoff folder.
- Ruling: the worktree uses a symlink to the main checkout's `node_modules` (gitignored, not committed) — avoids an `npm install` (no downloads) — cost if wrong: none.
- Ruling: skeptic not run — text only, and the baselines change only because of that text (the risk tier allows skipping it).

Left as is (URLs and internals, per the handoff):

- canonical, og:url, og:image, twitter:image, the JSON-LD `url` and `image` in `index.html`;
- `public/sitemap.xml`, `public/robots.txt`, README "Live" line, `functions/_middleware.js` (`CANONICAL_ORIGIN`), `test/pagesMiddleware.test.js`, `src/platform/meta.test.ts` `LIVE`;
- `docs/superpowers/plans/2026-09-23-tic-tac-toe.md:2446` (`gh repo view msforbes09/...`, a historical plan);
- storage keys, the service-worker cache name, the package name.

## Deferred minors

- `npm run format:check` fails on `develop` (127 tracked files). A one-off `npm run format` PR, plus a CI step, would make the done-when item meaningful.
- `COPYRIGHT_YEAR` and the tests pin 2026. Moving the year is a two-file change.
- Link-preview caches (WhatsApp, Slack, X) keep the old card until they expire. Re-scrape tools can force it after deploy.

## Merge danger

Two-way door. Blast radius: visible copy and the link-preview image only. No logic, data, storage, Supabase or URL changes. Revert: `git revert` the merge commit on `develop`.

## Conflicts with CLAUDE.md

- The session's commit-attribution reminder asks for a `Co-Authored-By: Claude` trailer. Arnel's global CLAUDE.md says no trailer, and CLAUDE.md wins, so commits carry none.
- None with the project CLAUDE.md.

## Tests

- Red: after changing the expected strings, 5 failed on the old text:
  - Splash: slogan; footer `© 2026 Kaya Randomized`.
  - SetupScreen: slogan.
  - AppShell: room colophon.
  - meta: `og:description` was `Win three. …`.
- Green on the final tree: `npm test` → 52 files, 606 tests passed. `npm run build` → built.
- e2e local (macOS): 70 passed, 70 skipped, 0 failed. Before the full run, the two setup baselines were regenerated in the Linux image (2 passed with `--update-snapshots=all`).
- CI on PR #56 at `325b868`: `check` pass (606 tests, build), `e2e` pass (70 passed, no retries; both setup snapshots ✓ first try), Cloudflare Pages pass.

## Open questions for Mira / Arnel

None.

## Suggestions for Mira

- Cross-session messages from workers to `Mira Personal` are held for approval and expire. The first two plan messages were lost that way. Putting plans in RESULT.md, as you now ask, avoids it.
- Future handoffs that say "`format:check` green" should note it is red on `develop` until a formatting PR lands.

## Suggested next steps

- Merge PR #56 to `develop`, then release `develop` → `main` with a version bump.
- Handoff 002 (Remotion promo) can use `public/og-image.png` and the strings above.
- Optional: a formatting PR (`npm run format`) plus `format:check` in CI.
