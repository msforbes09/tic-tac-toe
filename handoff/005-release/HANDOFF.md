# Handoff 005: release v1.3.0 (develop to main)

**From:** Mira
**To:** Claude Code
**Approver:** Arnel
**Project:** Tic-Tac-Toe (Kaya Randomized)

## Goal
Shape: change (bounded). Prepare the release pull request from `develop` to `main` exactly as this repo's `.claude/skills/release/SKILL.md` describes, steps 1 to 7, for version **1.3.0**. The owner approved releasing on 2026-10-01 ("proceed with the deploy"). You open the PR and report; the owner merges it himself. Do not merge, do not enable auto-merge, do not push to `main` or `develop`.

## Decisions already made
| Topic | Decision |
|---|---|
| Version | 1.3.0 (minor: the release carries the visible Kaya Randomized rebrand, the new slogan, the move to tictactoe.kayarandomized.com and the promo video project). Use `npm version 1.3.0 --no-git-tag-version` so package.json and package-lock.json both change |
| Branch | `release/v1.3.0` from `origin/develop` |
| Commit | `chore: release v1.3.0`; no `Co-Authored-By`, no `Claude-Session`, no "Generated with Claude Code" line in any commit or in the PR body |
| PR | to `main`, titled `Release v1.3.0`, body listing what is in the release since v1.2.2 (from `git log origin/main..origin/develop --oneline`): #56 rebrand, #58 domain, #59 promo video; plus a Merge danger section: what goes live when it merges (the live game shows the Kaya Randomized footer, the slogan "Three in a row. Zero excuses.", canonical and link-preview addresses at tictactoe.kayarandomized.com, and tic-tac-toe-acl.pages.dev starts redirecting to that address), the blast radius, and how to revert (revert the merge commit on main) |

## Constraints
- Change only `package.json`, `package-lock.json` and the three handoff files. Nothing else.
- The version test seams already exist; if a test pins the version string, update that test first and say so (red first).
- Allowed commands: `git fetch`, `git switch`, `git status`, `git diff`, `git log`, `git add`, `git commit`, `git push -u origin release/v1.3.0`, `npm ci`, `npm version 1.3.0 --no-git-tag-version`, `npm test`, `npm run build`, `gh pr create`, `gh pr view`, `gh pr checks`. Anything refused: write it into RESULT.md, commit, tell Mira in one line, pause.
- Budget: 2 attempts per step; small job.

## Done when
- [ ] `npm test` and `npm run build` green on the release branch (quote the summary lines)
- [ ] `package.json` and `package-lock.json` show 1.3.0; `git diff origin/develop --stat` shows only those two files and `handoff/`
- [ ] PR `Release v1.3.0` open against `main`, mergeable, CI green (wait for it; quote `gh pr checks`)
- [ ] No attribution lines in commits or PR body
- [ ] RESULT.md filled in; then message Mira "ready" with the PR number

## Out of scope
Merging; step 8 of the release skill (levelling develop after the merge); any code change; worktree or branch clean-up.
