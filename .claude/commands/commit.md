---
description: Analyze the staged/unstaged diff and write a commit in this repo's style
---

Look at `git status` and `git diff` (staged and unstaged). Group the changes into one commit unless they are clearly unrelated, in which case say so and commit them separately.

Write the message in this repo's style: an imperative subject under 72 characters with a type prefix (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`), then a short body only when the why is not obvious from the diff.

Rules:
- Run `npm test` first; do not commit red.
- Never commit .env or files under src/components/ui that were hand-edited.
- No `Co-Authored-By` trailer.
- Never commit on `main`; PRs target `develop`.

Stage what belongs, commit, and show the resulting `git log -1 --stat`.
