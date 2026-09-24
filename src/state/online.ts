import type { Role, RoomMessage } from '@/lib/room'
import { canSeatMove, gameReducer, type GameAction, type GameState } from './reducer'

export type { Role }

export type RoomAction = GameAction | { type: 'ROOM_MESSAGE'; message: RoomMessage }

/**
 * The host is the referee: its state is the truth, guest requests go through the ordinary
 * reducer, and a guest changes its own board only from the host's snapshots.
 * With no role this is the plain game reducer.
 */
export function roomReducer(role: Role | null): (state: GameState, action: RoomAction) => GameState {
  return (state, action) => {
    if (action.type === 'ROOM_MESSAGE') {
      const m = action.message
      if (role === 'host') {
        if (m.type === 'move') return canSeatMove(state, 'p2') ? gameReducer(state, { type: 'MOVE', index: m.index }) : state
        if (m.type === 'new-game') return gameReducer(state, { type: 'NEW_GAME' })
        return state
      }
      if (role === 'guest' && m.type === 'state') return gameReducer(state, { type: 'SYNC', snapshot: m.state })
      return state
    }
    if (role === 'guest' && (action.type === 'MOVE' || action.type === 'NEW_GAME')) return state
    if (role === 'host' && action.type === 'MOVE' && !canSeatMove(state, 'p1')) return state
    return gameReducer(state, action)
  }
}
