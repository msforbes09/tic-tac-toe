# Achievements

PlayStation-style trophies for everything the app already tracks: firsts, streaks,
counts, series feats, and a few board-shaped secrets. Unlocks fire on the device the
moment they happen, offline included, and sync to the cloud whenever a connection is
there. Each player wears one unlocked achievement as a badge above their name online.

This replaces the adaptive bot's moments fanfare (status-line notes, the
top-of-the-pack card, the History badge, the share lines). The ladder still moves as
before; promotion, reaching rung 30, and holding it to a draw are achievements now.

## The catalogue

Forty achievements plus Grand Master, forty-one in all. Tiers are bronze, silver, gold, platinum.
"Hidden" ones show only their tier and the word Hidden until unlocked, unless the player
taps the row to reveal them for the moment. Ids are stable kebab-case strings; names are display copy.

Rules of counting:

- **Streaks** (win, unbeaten, loss) count bot and online games only. A two-player game
  leaves them alone. A draw breaks a win streak and a loss streak, and extends an
  unbeaten streak.
- **Wins** for Fifty and Two Hundred count bot and online games only.
- **Games** for Regular, Marathon, Week Warrior, Night Owl, and Early Bird count every mode.
- **Board secrets** (Fast Hands, Sly Diagonal, Centre Stage) count every mode; the final
  board is the evidence. A two-player game is seen from Player 1's side, like its history
  row: Player 1's win counts, Player 2's does not.
- One online game in a series is one game. A series result is one series.
- A voided game (developer knock) records nothing.

| Id | Tier | Name | Condition | Icon | Hidden |
|---|---|---|---|---|---|
| opening-move | bronze | Opening Move | first two-player game | Play | |
| hello-bot | bronze | Hello, Bot | first bot game | Bot | |
| beat-the-machine | bronze | Beat the Machine | first bot win | Cpu | |
| easy-does-it | bronze | Easy Does It | first bot win at Easy | Leaf | |
| middle-ground | bronze | Middle Ground | first bot win at Medium | Scale | |
| hard-feelings | bronze | Hard Feelings | first bot win at Hard | Flame | |
| moving-up | bronze | Moving Up | first promotion | TrendingUp | |
| going-live | bronze | Going Live | first online game | Wifi | |
| front-row | bronze | Front Row | watched a series | Eye | |
| landlord | bronze | Landlord | created a room | DoorOpen | |
| quick-draw | bronze | Quick Draw | first draw against the bot | Equal | |
| regular | bronze | Regular | 10 games, any mode | Calendar | |
| night-owl | bronze | Night Owl | a game finished 00:00–03:59 local | Moon | yes |
| rough-night | bronze | Rough Night | lost 5 games in a row | CloudRain | yes |
| early-bird | bronze | Early Bird | a game finished 05:00–06:59 local | Sunrise | yes |
| full-circle | bronze | Full Circle | played all three modes | Orbit | yes |
| closer | silver | Closer | first series win | Flag | |
| high-five | silver | High Five | 5 wins in a row | Hand | |
| unbroken | silver | Unbroken | 5 games in a row without a loss | Shield | |
| century | silver | Century | 100 bot games | Hash | |
| comeback-kid | silver | Comeback Kid | won a series after trailing by 3 | Undo2 | yes |
| bounce-back | silver | Bounce Back | won the bot game right after losing at rung 30 | ArrowUpFromLine | yes |
| frequent-flyer | silver | Frequent Flyer | played series in 3 different rooms | Plane | |
| fifty | silver | Fifty | 50 wins, bot and online | Medal | |
| fast-hands | silver | Fast Hands | won in three of your own moves | Zap | yes |
| sly-diagonal | silver | Sly Diagonal | won on a diagonal 10 times | MoveDiagonal | yes |
| centre-stage | silver | Centre Stage | won through the middle cell 10 times | Target | yes |
| stalemate | silver | Stalemate | 10 draws against the bot | Handshake | yes |
| old-rivals | silver | Old Rivals | 3 series against the same opponent | Users | yes |
| week-warrior | silver | Week Warrior | games on 7 different days | CalendarDays | yes |
| perfect-ten | gold | Perfect Ten | 10 wins in a row | Sparkles | |
| untouchable | gold | Untouchable | 10 games in a row without a loss | ShieldCheck | |
| clean-sweep | gold | Clean Sweep | won a series 6–0 | Brush | |
| top-of-the-pack | gold | Top of the Pack | reached rung 30 | Mountain | |
| the-immovable | gold | The Immovable | held rung 30 to a draw | Anchor | yes |
| marathon | gold | Marathon | 500 games, any mode | Footprints | |
| tiebreaker | gold | Tiebreaker | won a series in the tie breaker | Swords | yes |
| two-hundred | gold | Two Hundred | 200 wins, bot and online | Crown | |
| giant-killer | gold | Giant Killer | won a series against a player wearing The Immovable | Axe | yes |
| deep-end | gold | Deep End | won a bot game at rung 25 or above | Waves | yes |
| grand-master | platinum | Grand Master | every other achievement | Gem | |

Icons are lucide-react names, tinted by tier: bronze `#cd7f32`, silver `#b8c0c8`,
gold `#f2c14e`, platinum `#9fe3ff`.

Detail rules:

- **Moving Up**: the ladder's band after the game is above the band before it.
- **Bounce Back**: the previous bot game was a loss at rung 30 (the ladder was at 30
  before that loss) and this bot game is a win. The flag is cleared by any bot game.
- **Deep End**: `rung before >= 25` and the bot game was won.
- **Top of the Pack**: rung after is 30 and rung before is below 30. **The Immovable**: a
  draw with rung before at 30.
- **Comeback Kid**: at some point in the series the player's score was 3 or more behind;
  the referee's snapshots carry both scores after every game, so each player tracks
  `trailedBy3` from them while the series runs.
- **Tiebreaker**: the series was won in game 11 or later. Comeback Kid and Tiebreaker need a
  series played out to a decision; a resignation or a drop hands over the win but not the feat.
- **Clean Sweep**: won 6–0.
- **Old Rivals**: the map of opponent id → series count reaches 3 for one opponent. The
  map keeps at most 50 opponents; the oldest is dropped.
- **Frequent Flyer**: a list of distinct room ids with a series finished in them, capped
  at 10.
- **Week Warrior**: `days` counts distinct local calendar days with a finished game,
  tracked with `lastDay` (a `YYYY-MM-DD` string).
- **Fast Hands**: won and the winner's marks on the final board number exactly 3.
- **Sly Diagonal**: the winning line is 0-4-8 or 2-4-6. **Centre Stage**: the winning
  line includes cell 4 (diagonals count for both).
- **Giant Killer**: won the series and the opponent's `badge` was `the-immovable`.
- **Grand Master**: unlocks in the same `record` call that unlocks the last of the others.

## State

`src/lib/achievements.ts`, pure:

```ts
type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'
type Achievement = { id: AchievementId; name: string; tier: Tier; description: string; icon: string; hidden: boolean }
type Progress = {
  games: Record<Mode, number>
  wins: Record<Mode, number>
  botWinsByBand: Record<Difficulty, number>
  botDraws: number
  promotions: number
  seriesPlayed: number
  seriesWon: number
  winStreak: number
  unbeatenStreak: number
  lossStreak: number
  rooms: string[]
  opponents: Record<string, number>
  days: number
  lastDay: string | null
  diagonalWins: number
  centreWins: number
  lostAtTop: boolean
  watched: boolean
  roomsCreated: number
}
type AchievementState = { progress: Progress; unlocks: Partial<Record<AchievementId, number>>; badge?: AchievementId | null; updatedAt: number }
type AchievementEvent =
  | { kind: 'game'; mode: Mode; result: 'win' | 'loss' | 'draw'; board: Board; symbol: Player; finishedAt: number;
      band?: Difficulty; rungBefore?: number; rungAfter?: number; opponentId?: string; opponentBadge?: AchievementId | null }
  | { kind: 'series'; won: boolean; mine: number; theirs: number; trailedBy3: boolean; tieBreak: boolean; roomId: string;
      opponentId: string; opponentBadge: AchievementId | null }
  | { kind: 'room-created' }
  | { kind: 'watched' }
```

- `ACHIEVEMENTS: Achievement[]` in catalogue order, `TIER_ORDER`, `achievementById`.
- `EMPTY_STATE`.
- `record(state, event, now) → { state, unlocked: AchievementId[] }`. Applies the event
  to progress, then evaluates every locked rule against the new progress and the event,
  stamping `now` on each new unlock. Never re-unlocks. Bumps `updatedAt`.
- `defaultBadge(unlocks)`: the highest tier, newest among equals; null when nothing is unlocked.
- `wornBadge(state)`: `state.badge` when it is unlocked, otherwise `defaultBadge`. The
  picker stores an explicit choice, including `null` for None; a state with `badge`
  unset falls back to the default. To tell "never chose" from "chose None", the stored
  field is `badge: AchievementId | null | undefined` and `undefined` means default.
- `merge(local, cloud | null)`: unlocks are the union keeping the earliest time;
  progress and badge come from the copy with the later `updatedAt`; the result's
  `updatedAt` is the later one. Returns whether either side changed so the caller can
  save and push only when needed.
- `loadAchievements` / `saveAchievements` over `HistoryStorage` under
  `tic-tac-toe:achievements`, validated field by field like the ladder; bad data → `EMPTY_STATE`.
- `ACHIEVEMENTS_KEY`.

Events come from:

- `GameScreen`: every finished non-voided bot or two-player game, with the ladder before
  and after for bot games. Prop `onAchievement(event)`.
- `SeriesScreen`: for the two players, each finished game (from the snapshot's `game`
  when it reaches a terminal status) and the series result when `result` is set. Watchers
  send nothing. Resign and leave count as a game result only through the series result:
  a series lost by resignation is a series loss and no game event.
- `RoomScreen`: `watched` when the device enters a game as watcher.
- `App`: `room-created` after `createRoom` succeeds.

## Sync

Cloud table `achievements`: `player_id text primary key`, `token_hash text not null`,
`unlocks jsonb not null`, `progress jsonb not null`, `badge text`, `updated_at
timestamptz not null`. Public select. Written only through
`save_achievements(p_id, p_token, p_unlocks, p_progress, p_badge, p_updated_at)`: insert,
or update when the token hash matches and `p_updated_at >= updated_at`. Realtime not
needed. `reset_player_data` also deletes the row (and accepts the token from it).

`RoomDirectory` gains `loadAchievements(playerId): Promise<AchievementState | null>`,
`saveAchievements(playerId, token, state): Promise<void>`, and
`loadPlayer(playerId): Promise<PlayerRecord | null>`. The fake directory implements all three.

Policy, all failures silent:

1. Every `record` saves locally at once, then pushes.
2. On launch and on every `online` event: pull, `merge`, save locally if changed, push if
   the local copy carried anything the cloud lacked.
3. Pushes that fail are retried by the next step-2 pass, since the local copy is newer.

`App` owns `AchievementState` in a ref plus state for rendering, and exposes
`applyAchievement(event)` to screens.

## The full reset

A hand-run query empties every table:

```sql
truncate public.rooms, public.results, public.players, public.games, public.ladders, public.achievements;
```

**Wiped-device detection.** The app writes `tic-tac-toe:registered` (`'1'`) after its
first successful `savePlayer`. On launch and on `online`, before any push, `App` calls
`loadPlayer(deviceId)`. If the local registered flag is set and the cloud has no row,
the cloud was wiped: the app clears history, ladder, achievements, remembered setup,
nickname, owned rooms, and the registered flag itself, resets the
in-memory nickname and achievements, and lets the normal flow register again once a
nickname is picked. Device id and player token stay. Developer mode stays. Devices
that never registered are left alone (nothing of theirs is in the cloud). The
unsynced-history push and the ladder and achievements pulls run only after this check
resolves; offline, the check is skipped and everything else proceeds as today.

`lib/reset.ts`: `WIPE_KEYS`, `REGISTERED_KEY`, `shouldWipe(registered: boolean, player:
PlayerRecord | null): boolean`, `wipeLocal(storage)`. Tested.

The developer **Reset game data** additionally removes the local achievements
key; `reset_player_data` removes the cloud row. Registration and nickname
are untouched by it, as today.

## The toast

`components/AchievementToast.tsx`, mounted once in `App` above every screen. `App`
keeps a queue of unlocked ids; the toast shows the head for 3 s, then the next. Layout:
a pill at the top under the safe area, icon in tier colour on the left, the name, and
"Achievement unlocked" in small muted text. Slides in and out; reduced motion fades.
`role="status"`. Tapping dismisses the current one. Feedback: a new `FeedbackEvent`
`{ kind: 'achievement' }`, a short rising two-note chime and a light buzz in
`browserFeedback`. Grand Master also fires the win confetti.

Removed: the status-line second line for promoted / top / top-held, `TopCard`,
`TOP_SHARE_TEXT`, the `TopBadge` block in History, and the `share` / `siteUrl` props
that only served them. "Take it back" after a loss at 30 stays and still uses
`momentAfter`; the achievements module does its own rung checks from the event.

## The sheet

`components/AchievementsSheet.tsx`, opened by a trophy icon button in the setup header
(aria-label "Achievements", beside the History clock; the gear sits on the right). Same
Sheet as History. Every sheet in the app closes from one round floating Back
(`components/FloatingBack.tsx`, bottom-left over the content, aria-label "Back") and a tap
outside; there is no corner cross and no Done row. Header: "N of 41 unlocked" and a Sort and
filter button (`SlidersHorizontal`) that shows a dot while the view is off the default. Under
it a summary strip: a ring with the percent complete and four tier trophies with unlocked /
total, platinum first. The percent is weighted by tier (`TIER_POINTS`: bronze 1, silver 2,
gold 3, platinum 4; `completion(unlocks)` returns earned, total and the rounded percent), so
78 points make 100.

The list is one column of rows, each with the icon in a square tile, name, condition, a
tier dot and a last line:

- unlocked: icon in tier colour, date (`dayFormat`).
- locked and visible: dimmed icon, "Locked".
- locked and hidden: a padlocked trophy, "Hidden", "Description is hidden.", no date. The row
  is a button; a tap reveals the name and condition for as long as the sheet stays open.
  Nothing is remembered.

`listAchievements(unlocks, view)` in `achievements.ts` owns the order. A `ListView` is
`{ sort, show, tier }`, `DEFAULT_VIEW` is `recent` / `all` / `all`:

- `recent` / `oldest`: earned ones by unlock time, then locked ones by tier (platinum down)
  and catalogue order.
- `tier`: platinum down, catalogue order within a tier, earned or not.
- `show`: `all`, `earned`, `locked`. `tier`: one tier or `all`.

The Sort and filter button opens a small bottom sheet with three segmented controls (Sort:
Recent / Oldest / Tier; Show: All / Earned / Locked; Tier: All plus the four trophies as
icons) and a reset icon (`RotateCcw`, aria-label "Reset") back to the default. It is rendered
as a sibling of the main sheet, not inside it, so a tap outside closes it. The view lives in
component state and starts fresh each time the sheet opens. An empty result shows "Nothing
here yet."

## The badge

- `SeriesPlayer` and `RoomPresence` gain `badge?: string`. Validators accept a missing
  or string `badge`. Unknown ids render nothing.
- `RoomScreen` tracks `badge: wornBadge(state)` in presence and puts it on the
  `SeriesPlayer` it sends in `challenge` and `accept`. `SeriesState` and `SeriesResult`
  carry it through unchanged. Results rows in the cloud gain nothing: the badge is
  taken from the `winner` / `loser` JSON already stored.
- `components/AchievementBadge.tsx`: the achievement icon at 16 px in its tier colour,
  with the name as `aria-label`, centred above the nickname it decorates. Used in the
  room member list, in-progress "A vs B" rows, the challenge dialogs, the series screen
  names, the room results list, and the online History rows. "You" shows your own badge.
- The picker: a "Badge" section in Settings (always shown, not developer-only) with a
  horizontal row of the unlocked icons plus a None tile; the worn one is outlined. Empty
  when nothing is unlocked ("Unlock an achievement to wear a badge").
- Giant Killer reads `opponentBadge` from the series event.

## Files

New: `src/lib/achievements.ts` (+test), `src/lib/reset.ts` (+test),
`src/components/AchievementToast.tsx` (+test), `src/components/AchievementsSheet.tsx`
(+test), `src/components/AchievementBadge.tsx`, `supabase/migrations/2026-09-26-achievements.sql`.

Changed: `GameScreen`, `SeriesScreen`, `RoomScreen`, `App`, `SetupScreen`,
`SettingsSheet`, `HistorySheet`, `StatusBar` (second line removed if unused),
`lib/room.ts`, `state/series.ts`, `lib/roomDirectory.ts`, `platform/supabaseDirectory.ts`,
`lib/feedback.ts`, `platform/browserFeedback.ts`, `supabase/schema.sql`, `CLAUDE.md`,
`README.md`, and the adaptive-bot spec (moments and badge sections point here).

Removed: `TopCard.tsx` and its test.

## Tests

- `achievements.test.ts`: every rule unlocks on its condition and not one step before;
  streak resets on a loss, a draw, and never on a two-player game; no double unlock;
  Grand Master fires with the last one; `defaultBadge` and `wornBadge`; `merge` union
  and newer-wins; load and save round trip and bad data.
- `reset.test.ts`: `shouldWipe` truth table; `wipeLocal` removes exactly the keys.
- Components: toast queue order, tap dismiss, feedback called; sheet counts, hidden
  tiles, switch; badge picker changes the worn badge; setup trophy button opens the
  sheet; GameScreen emits events for bot and two-player games and nothing for a voided
  game; SeriesScreen emits per-game and series events for players and none for
  watchers; RoomScreen tracks the badge and emits `watched`; App wipes local data when
  registered and the player row is gone, and does not when never registered.
- Validators: `isRoomPresence` and `isSeriesResult` with and without `badge`.

## Out of scope

Sharing achievements, progress bars on locked tiles, achievement history in the cloud
beyond one row per device, badges beside names in History for two-player and bot rows or on
results read back from the cloud (the badge travels with presence and live series state only),
partial cloud resets.
