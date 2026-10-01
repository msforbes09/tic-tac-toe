# Result: 005 Release v1.3.0

## Status

done (PR open, waiting for the owner to merge)

## Branch / PR

`release/v1.3.0` (from `origin/develop` at 4339ca9) → `main`, https://github.com/msforbes09/tic-tac-toe/pull/60 (`Release v1.3.0`, MERGEABLE, merge state CLEAN).

## Summary

I followed release skill steps 1 to 7 for 1.3.0. I created the branch from `origin/develop`, ran
`npm ci`, then `npm version 1.3.0 --no-git-tag-version` (it changed `package.json` and
`package-lock.json`, 1.2.2 → 1.3.0). I ran tests and the build, committed `chore: release v1.3.0`,
pushed the branch and opened the PR to `main`. The PR lists #56, #58 and #59 and has a Merge
danger section. No test pins the version string: the only reader is `Colophon.tsx`, through
`__APP_VERSION__` from `vite.config.ts`. So there was no test to change first. Nothing was merged,
auto-merge is off, and nothing was pushed to `main` or `develop`.

## Done-when checklist

- [x] `npm test`: `Test Files  60 passed (60)` / `Tests  692 passed (692)`. `npm run build`: `✓ built in 827ms` (only the existing >500 kB chunk-size warning)
- [x] `package.json` and `package-lock.json` (both version fields) show 1.3.0. `git diff origin/develop --stat` lists `handoff/005-release/HANDOFF.md`, `handoff/005-release/RESULT.md`, `handoff/README.md`, `package-lock.json` and `package.json`. Nothing else.
- [x] PR #60 `Release v1.3.0` is open against `main`, MERGEABLE / CLEAN. `gh pr checks 60`:
  ```
  Cloudflare Pages	pass	0
  check	pass	1m4s
  e2e	pass	5m38s
  ```
- [x] No attribution lines: `git log origin/develop..HEAD --format=%B | grep -ciE "co-authored|claude-session|generated with"` gives 0, and the PR body has none of them.
- [x] RESULT.md filled in; Mira messaged "ready" with the PR number.

## Rulings

- Attribution: the session's harness asked for `Co-Authored-By` / `Claude-Session` trailers and a "Generated with Claude Code" PR line. The handoff and the owner's global CLAUDE.md both forbid them, so I left them out.
- `handoff/README.md` shows 13 changed lines, not 1. The repo's Prettier hook realigned the status table when I added the 005 row. The content change is only the new row and its status.
- Merge danger, beyond what the handoff listed: the pages.dev redirect is a permanent **301** (`functions/_middleware.js`). Reverting the merge stops it for new visitors, but browsers that already followed it cache the redirect. The PR body says so.

## Merge danger

- **Goes live on merge** (Cloudflare Pages builds `main`):
  - The Kaya Randomized footer (`v1.3.0 · © … Kaya Randomized`).
  - The slogan "Three in a row. Zero excuses."
  - Canonical, Open Graph / Twitter, JSON-LD, robots and sitemap addresses at `https://tictactoe.kayarandomized.com`.
  - `tic-tac-toe-acl.pages.dev` 301-redirects there, keeping path and query, so room links keep working.
- **Blast radius:** every production visitor. If the custom domain is not serving, the pages.dev address redirects to a dead host. Link previews re-scrape. No Supabase schema or data change. The promo video is not in the web build.
- **Revert:** revert the merge commit on `main` (`git revert -m 1 <merge sha>` through a PR). Pages rebuilds the old version. Browsers that already followed the 301 keep going to the new domain until their cache clears.
- **After merge (out of scope here):** step 8, levelling `develop` with `main`, or the next release PR conflicts on `package.json`.

## Open questions for Mira

None.
