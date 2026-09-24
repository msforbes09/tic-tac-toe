# Installable app and keyboard play — Design Spec

Date: 2026-09-23
Branch: `feat/pwa-and-keyboard`

Agreed with the owner by voice. Ships separately from the gameplay changes
(`2026-09-23-gameplay-enhancements-design.md`); the two touch different files.

## Installable and offline

- `public/manifest.webmanifest`: standalone display, dark theme colour, 192
  and 512 px icons plus a maskable 512. `start_url` and `scope` are `./`, so
  the same file works at `/` locally and under `/<repo>/` on GitHub Pages.
- `public/sw.js`: caches the app shell on install. Page loads are network
  first (a new deploy shows up on the next visit) with the cached page as the
  offline fallback. Vite's content-hashed assets are cache first and stored
  on first fetch. Old caches are dropped on activate. All URLs are relative
  to the worker.
- `src/platform/serviceWorker.ts` registers `${BASE_URL}sw.js` with scope
  `BASE_URL`, in production builds only, so the dev server is never cached.
  Failures are ignored.
- `index.html` links the manifest, an SVG favicon, and an Apple touch icon.
  Vite prefixes these with the base path at build time.
- Icons are drawn in `public/icon.svg` (X and O in the game's player colours)
  and rendered to PNG.

To ship a change to `sw.js` itself, bump `CACHE`.

## Keyboard

Arrow keys move focus across the board by row and column, skip taken cells,
and stop at the edge. Enter or Space places a mark (native button behaviour).

## Testing

Unit tests for registration, the manifest's relative URLs and icon files, and
arrow navigation. Checked in headless Chrome against a production build served
under `/tic-tac-toe-react/`: worker scope, icons load, the game reloads with
the network off, and keyboard play works offline.
