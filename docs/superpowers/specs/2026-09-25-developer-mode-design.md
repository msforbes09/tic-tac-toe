# Developer mode — Design Spec

Date: 2026-09-25
Branch: `feat/dev-mode`
Amends: `2026-09-25-adaptive-bot-design.md` (the rung, hidden from players, is
shown to the developer).

Agreed with the owner in conversation. Ships in one pull request to `develop`.

## Goal

A way for the owner to see and test the bot ladder on a real phone without
exposing it to players: a secret knock opens developer mode, which shows the
rung and lets it be set.

## The knock

A sequence of taps across three screens, reported to `App` as events
(`src/lib/knock.ts`). Progress advances one step per matching event and resets
on any other; the first step always restarts the knock.

1. Setup: **Two player**, **Versus bot**, **Two player** (tapping the selected
   mode still counts).
2. **History**, then the sheet's **Back** button (the corner close does not
   count).
3. **Start game** — a two-player game.
4. On the board: **X top-left**, **O centre**, **X bottom-right**, **O
   top-right**, then **X taps the centre**, which is O's square.

The last tap **overrides** the centre with X and **voids the game**: the status
reads "Game voided", the board is disabled, no winner is declared (even though
X now holds a diagonal), nothing is recorded, and the ladder does not move.
New game clears it. Two seconds after that tap the **Developer mode** dialog
opens with **Cancel** and **Enter**. Enter turns developer mode on; it is
remembered on the device (`tic-tac-toe:dev`).

Occupied and disabled cells let taps fall through (`pointer-events: none`) to
a wrapper that reports them, so the final tap can be seen without enabling
moves on filled squares.

## What developer mode shows

- **The game chip** in bot mode: `Bot · Medium · 17`, plus the streak when
  there is one: `· +2` or `· −1`. The chip becomes a button that opens the
  developer panel.
- **Setup**, in Versus bot: the Difficulty label reads `Difficulty · 25` and,
  when the picked band would move the rung, `Difficulty · 25 → 20`. With no
  rung yet: `Difficulty · – → 11`.

Nothing else changes for the player.

## The developer panel

Opened from the chip. Title "Developer mode", then:

- **Rung** — a number field (1–30) and **Set**. Saves the rung with the streak
  reset; it applies from the next game. Closes the panel.
- **Reset game data** — two taps ("Tap again to confirm"). Removes history,
  the ladder (rung and badge), and the remembered setup. Keeps developer mode
  and the online identity.
- **Exit** turns developer mode off. **Done** closes the panel.

## Modules

- `src/lib/knock.ts` — the sequence, `knockStep`, the delay, the flag's
  load/save. Fully tested.
- `src/state/reducer.ts` — `OVERRIDE` action and `voided` flag.
- `src/components/Board.tsx` — `onTap` for every cell tap.
- `src/components/DevDialog.tsx` — the enter dialog and the panel.
- `App.tsx` — knock progress, the two-second timer, the dialog, the flag.

## Out of scope

- Any player-facing hint that the knock exists.
- Editing the streak or the badge from the panel.
