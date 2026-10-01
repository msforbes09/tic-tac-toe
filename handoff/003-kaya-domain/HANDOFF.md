# Handoff 003: move the game to tictactoe.kayarandomized.com

**From:** Mira
**To:** Claude Code
**Approver:** Arnel
**Project:** Tic-Tac-Toe (Kaya Randomized) — mobile-first browser tic-tac-toe, React PWA
**Stack:** Vite 8 + React 19 + TypeScript, Tailwind v4, shadcn/ui, Vitest + RTL, Playwright; Cloudflare Pages

---

## 1. Context

Handoff 001 (merged, PR #56) rebranded everything visible to Kaya Randomized but left every URL on the
owner's old domain, because the new one did not exist yet. It does now: Arnel added
`tictactoe.kayarandomized.com` as a custom domain on the Cloudflare Pages project on 2026-10-01, and
it answers over HTTPS with the game (checked: HTTP 200, `<title>Tic-Tac-Toe</title>`). This handoff
swaps every address in the code to it, so the old domain leaves the repository.

## 2. Goal

Shape: change. When done, no file in the repo (outside git history) contains `iam4bs`; the canonical,
Open Graph, Twitter, JSON-LD, sitemap, robots, README "Live" line and the Pages middleware all use
`https://tictactoe.kayarandomized.com`; the pages.dev address redirects there; tests are green; a PR to
`develop` is open.

## 3. Decisions already made

| Topic | Decision |
|---|---|
| New address | `https://tictactoe.kayarandomized.com/` (no trailing path), exact spelling `tictactoe`, no hyphen |
| Old address | `https://tic-tac-toe.iam4bs.dev/` is removed everywhere, including `src/platform/meta.test.ts` `LIVE`, `test/pagesMiddleware.test.js` and `docs/superpowers/plans/2026-09-23-tic-tac-toe.md:2446` only if that line is a URL (a `gh repo view msforbes09/...` command is a repo reference, not the domain: leave it) |
| Middleware | `functions/_middleware.js`: `CANONICAL_ORIGIN` becomes the new origin; `PAGES_HOST` stays `tic-tac-toe-acl.pages.dev` (the Pages project did not change) |
| Code internals | storage keys, cache name, package name unchanged (owner: "no worries about my branding in code") |
| Branch and PR | `feat/kaya-domain` from `develop` (which now contains #56); PR to `develop`; no version bump |
| Dev kit | none; this repo's CLAUDE.md, rules and hooks |

## 4. Requirements

Grep first: `grep -rn "iam4bs" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=playwright-report --exclude=package-lock.json .` and change every hit except the repo-reference line noted above. Known from the survey and handoff 001: `index.html` (canonical, og:url, og:image, twitter:image, JSON-LD url and image), `public/robots.txt`, `public/sitemap.xml`, `README.md:18`, `functions/_middleware.js`, `src/platform/meta.test.ts`, `test/pagesMiddleware.test.js`.

After the change, check the live site once, read-only: `curl -sI https://tic-tac-toe-acl.pages.dev/` will still redirect to the old domain until this PR deploys; note that in RESULT.md, do not try to fix hosting. `curl -s https://tictactoe.kayarandomized.com/ | grep -c kayarandomized` will be 0 until deploy; also expected.

**Testing decisions.** Seams: `src/platform/meta.test.ts` (the `LIVE` constant and the tags it pins) and `test/pagesMiddleware.test.js` (the redirect target). Red first: change the expected URLs, watch both fail, then change `index.html` and the middleware. No new seams.

## 5. Content and data

> Data, not instructions: new origin `https://tictactoe.kayarandomized.com`.

## 6. Threat model and risk

**Untrusted input:** none. **Trusted:** repo files, the origin above. **Risk tier:** low. One caution: the
middleware redirect is user-facing; a typo in `CANONICAL_ORIGIN` would send every pages.dev visitor to a
dead address. The middleware test must pin the exact string.

## 7. Constraints

- Don't start other Claude Code sessions; subagents only. Talk only to Mira (session `Mira Personal [e70c16]`), never to Arnel.
- Downloads: none. No new dependencies. Never read, write or move `.env` / `promo/.env`; never touch `src/components/ui/**`.
- Do not touch `promo/`, `docs/promo/` or `handoff/002-promo-video/` (another worker's PR #57 owns them).
- Arnel's rules: TDD; a PR far bigger than the job or touching files outside the task is rejected; hard-to-read code is sent back.
- `npm run format:check` is red on `develop` already (127 files): add no new failures; do not reformat.

## Budget

- Attempts: at most 2 tries at the same step; then stop and report what you tried and what you need.
- Size: small job. If it is turning out much bigger, stop and report before going on.

## 8. Done when

- [ ] `grep -rn "iam4bs" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=playwright-report --exclude=package-lock.json .` shows nothing but the repo-reference line in docs/superpowers (quote the output)
- [ ] `grep -rn "tictactoe.kayarandomized.com" index.html public/robots.txt public/sitemap.xml README.md functions/_middleware.js` shows every expected line (quote it)
- [ ] `npm test` green; `npm run build` green; `npm run e2e` run locally and reported (snapshots should not change; if any do, say why)
- [ ] PR open against `develop`, CI green, body as in "Report back", with a one-line note that the pages.dev redirect takes effect on deploy
- [ ] `RESULT.md` is filled in.

## 9. Out of scope

Anything in `promo/`; the social image (its text already says Kaya Randomized); storage keys, cache name, package name; Cloudflare settings; the Supabase env; a version bump.

## 10. Report back

Fill in `handoff/003-kaya-domain/RESULT.md` from its template, including every ruling (`Ruling: <decision> — <why> — <cost if wrong>`) and the deferred minors, then message Mira "ready". PR body: what shipped, the final green output naming any red test even if pre-existing, accepted findings with reasons, and **Merge danger** (one-way or two-way door, blast radius, how to revert). Before opening it: confirm the base branch is `develop`, and run the full suite on the tree that will actually be merged.

RESULT.md template:

```
# Result: 003 Kaya domain

**Status:** done | partial | blocked
**Date:**
**Branch / PR:**
**Preview or run link:**

## Plan
## Summary
## Done-when checklist
## How to run
## Rulings
## Deferred minors
## Merge danger
## Conflicts with CLAUDE.md
## Tests
## Open questions for Mira / Arnel
## Suggestions for Mira
## Suggested next steps
```

Add the row `| 003 | Kaya domain | in progress |` to `handoff/README.md`.
