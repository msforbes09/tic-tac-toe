import type { GameMessage, GamePresence, GameRole } from '@/lib/room'
import { isSeriesSnapshot, seriesReducer, type SeriesAction, type SeriesState } from './series'

export type SeriesRole = GameRole

export type OnlineAction = SeriesAction | { type: 'GAME_MESSAGE'; message: GameMessage }

/**
 * The referee holds the truth: it applies its own actions and turns the opponent's requests into
 * actions. Players and watchers change their state only from the referee's snapshots; their own
 * taps are sent as requests by the screen, never applied locally.
 */
export function onlineReducer(role: SeriesRole): (state: SeriesState, action: OnlineAction) => SeriesState {
  return (state, action) => {
    if (action.type === 'GAME_MESSAGE') {
      const m = action.message
      if (role === 'referee') {
        if (m.type === 'move') return seriesReducer(state, { type: 'MOVE', index: m.index, by: m.from })
        if (m.type === 'next-game') return seriesReducer(state, { type: 'NEXT_GAME' })
        if (m.type === 'resign') return seriesReducer(state, { type: 'RESIGN', by: m.from, reason: 'resigned', at: Date.now() })
        return state
      }
      if (m.type === 'state' && isSeriesSnapshot(m.state)) return seriesReducer(state, { type: 'SYNC', snapshot: m.state })
      return state
    }
    if (role === 'referee') return seriesReducer(state, action)
    // Players and watchers still record their own history; nothing else changes locally.
    return action.type === 'RECORDED' ? seriesReducer(state, action) : state
  }
}

/**
 * Two devices can both believe they are the referee after a reconnect. The lower deviceId keeps
 * the role; the other becomes a player and resyncs. Promotion from player to referee is time-based
 * and lives in the screen, not here.
 */
export function resolveRole(self: string, current: SeriesRole, members: GamePresence[]): SeriesRole {
  if (current !== 'referee') return current
  const rival = members.find((m) => m.role === 'referee' && m.deviceId !== self && m.deviceId < self)
  return rival ? 'player' : 'referee'
}
