# TDD Workflow (Red → Green → Refactor → Ship)

Follow the test-driven development cycle for all feature work, bug fixes, and refactors.

1. **Red** — Write a failing test that captures the desired behaviour. Run it (`npx vitest run <file>`) and confirm it fails for the right reason: the behaviour is missing, not a typo or import error. If it passes immediately, the test is wrong; fix the test first.
2. **Green** — Write the minimum code needed to make the test pass. No extra options, no "while I'm here". Run the suite (`npm test`) and confirm it is green.
3. **Refactor** — Clean up the implementation and the tests while keeping the suite green: remove duplication, improve names, extract helpers. Do not add behaviour in this phase. Re-run to confirm.
4. **Ship** — `npm run build` (type-checks and bundles) must pass before a commit or PR.

The Iron Law: no production code without a failing test first. If code was written before its test, delete the code and start again from Red.

Where tests live in this repo: beside the file they cover (`game.ts` → `game.test.ts`). Everything in `src/lib` and `src/state` is fully tested; component tests use React Testing Library.
