---
name: release
description: Release develop to main for this repo - bump package.json version, open the PR, and check CI. Use when the user asks to release, cut a version, or ship develop to main.
---

# Release develop → main

1. On `develop`, confirm it is up to date and green: `git pull`, `npm test`, `npm run build`.
2. Decide the bump: patch for fixes and small work, minor for a major feature. Ask if unsure.
3. Create a release branch from `develop`: `git checkout -b release/vX.Y.Z`.
4. Bump `version` in `package.json` (and `package-lock.json` via `npm version X.Y.Z --no-git-tag-version`).
5. Commit as `chore: release vX.Y.Z` (no Co-Authored-By trailer).
6. Open a PR from the release branch to `main` titled `Release vX.Y.Z` listing the merged PRs since the last release (`git log main..develop --merges --oneline`).
7. Report the PR link and its CI status. The user merges; never enable auto-merge.
8. After merge, the user tests on laptop and phone. Remove any merged worktrees and branches.

The splash footer shows the version via `__APP_VERSION__` injected by vite.config.ts, so the bump is visible in the app.
