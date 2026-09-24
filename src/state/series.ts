import { nextPlayer } from '@/lib/game'
import { isGameSnapshot, isSeriesResult, type SeriesPlayer, type SeriesResult, type Snapshot } from '@/lib/room'
import type { Player, Seat } from '@/lib/types'
import { canSeatMove, createGameState, gameReducer, seatOf, snapshotOf, type GameState } from './reducer'

export const SERIES_TARGET = 6
export const SERIES_GAMES = 10
export const GRACE_MS = 30_000

export type SeriesSide = 'challenger' | 'challenged'

/** A challenge that was accepted. The challenger is p1 in every game; its device is the referee. */
export type SeriesState = {
  gameId: string
  roomId: string
  challenger: SeriesPlayer
  challenged: SeriesPlayer
  score: { challenger: number; challenged: number; draws: number }
  gameNumber: number
  game: GameState
  result: SeriesResult | null
}

export type SeriesSnapshot = Omit<SeriesState, 'game'> & { game: Snapshot }

export type SeriesAction =
  | { type: 'MOVE'; index: number; by: string }
  | { type: 'NEXT_GAME' }
  | { type: 'RESIGN'; by: string; reason: 'resigned' | 'left'; at: number }
  | { type: 'RECORDED' }
  | { type: 'SYNC'; snapshot: SeriesSnapshot }

export type SeriesPhase = 'playing' | 'between' | 'over'

const ONLINE = { mode: 'online', difficulty: 'medium' } as const

/** The challenged player is X in game 1; first move alternates. The challenger is always p1. */
export const firstMoveP1Symbol = (gameNumber: number): Player => (gameNumber % 2 === 1 ? 'O' : 'X')

const newGame = (gameNumber: number): GameState => createGameState({ ...ONLINE, p1Symbol: firstMoveP1Symbol(gameNumber) })

export function startSeries(roomId: string, gameId: string, challenger: SeriesPlayer, challenged: SeriesPlayer): SeriesState {
  return {
    gameId,
    roomId,
    challenger,
    challenged,
    score: { challenger: 0, challenged: 0, draws: 0 },
    gameNumber: 1,
    game: newGame(1),
    result: null,
  }
}

export const seatOfSide = (side: SeriesSide): Seat => (side === 'challenger' ? 'p1' : 'p2')
const sideOfSeat = (seat: Seat): SeriesSide => (seat === 'p1' ? 'challenger' : 'challenged')
const other = (side: SeriesSide): SeriesSide => (side === 'challenger' ? 'challenged' : 'challenger')

export function sideOf(state: SeriesState, deviceId: string): SeriesSide | null {
  if (deviceId === state.challenger.deviceId) return 'challenger'
  if (deviceId === state.challenged.deviceId) return 'challenged'
  return null
}
export const playerOf = (state: SeriesState, side: SeriesSide): SeriesPlayer =>
  side === 'challenger' ? state.challenger : state.challenged

export function seriesPhase(state: SeriesState): SeriesPhase {
  if (state.result) return 'over'
  return state.game.status === 'playing' ? 'playing' : 'between'
}

export const isTieBreak = (state: SeriesState): boolean => state.gameNumber > SERIES_GAMES

function buildResult(state: SeriesState, winner: SeriesSide, reason: SeriesResult['reason'], at: number): SeriesResult {
  const loser = other(winner)
  return {
    gameId: state.gameId,
    roomId: state.roomId,
    challengerId: state.challenger.deviceId,
    challengedId: state.challenged.deviceId,
    winner: playerOf(state, winner),
    loser: playerOf(state, loser),
    winnerScore: state.score[winner],
    loserScore: state.score[loser],
    games: state.gameNumber,
    reason,
    endedAt: at,
  }
}

/** After a finished game: first to 6, or any lead once 10 games are done (which covers the tie breaker). */
function decide(state: SeriesState, at: number): SeriesState {
  const { challenger: a, challenged: b } = state.score
  const decided = Math.max(a, b) >= SERIES_TARGET || (state.gameNumber >= SERIES_GAMES && a !== b)
  if (!decided) return state
  return { ...state, result: buildResult(state, a > b ? 'challenger' : 'challenged', 'decided', at) }
}

export function seriesReducer(state: SeriesState, action: SeriesAction, now: number = Date.now()): SeriesState {
  switch (action.type) {
    case 'MOVE': {
      if (state.result) return state
      const side = sideOf(state, action.by)
      if (!side || !canSeatMove(state.game, seatOfSide(side))) return state
      const game = gameReducer(state.game, { type: 'MOVE', index: action.index })
      if (game === state.game) return state
      let score = state.score
      if (game.status === 'won' && game.winner) {
        const winnerSide = sideOfSeat(seatOf(game, game.winner))
        score = { ...score, [winnerSide]: score[winnerSide] + 1 }
      } else if (game.status === 'draw') {
        score = { ...score, draws: score.draws + 1 }
      }
      const next = { ...state, game, score }
      return game.status === 'playing' ? next : decide(next, now)
    }
    case 'NEXT_GAME': {
      if (seriesPhase(state) !== 'between') return state
      const gameNumber = state.gameNumber + 1
      return { ...state, gameNumber, game: newGame(gameNumber) }
    }
    case 'RESIGN': {
      if (state.result) return state
      const side = sideOf(state, action.by)
      if (!side) return state
      return { ...state, result: buildResult(state, other(side), action.reason, action.at) }
    }
    case 'RECORDED':
      return { ...state, game: gameReducer(state.game, { type: 'RECORDED' }) }
    case 'SYNC': {
      // A finished series is final, whatever arrives later.
      if (state.result) return state
      const { gameId, roomId, challenger, challenged, score, gameNumber, result, game } = action.snapshot
      // The game part goes through the game reducer's SYNC so `recorded` and `settings` follow the
      // same rules as before: a new game number starts from an untouched board.
      const base = gameNumber === state.gameNumber ? state.game : newGame(gameNumber)
      return {
        gameId,
        roomId,
        challenger: { deviceId: challenger.deviceId, nickname: challenger.nickname },
        challenged: { deviceId: challenged.deviceId, nickname: challenged.nickname },
        score: { challenger: score.challenger, challenged: score.challenged, draws: score.draws },
        gameNumber,
        result,
        game: gameReducer(base, { type: 'SYNC', snapshot: game }),
      }
    }
  }
}

export function snapshotOfSeries(state: SeriesState): SeriesSnapshot {
  const { game, ...rest } = state
  return { ...rest, game: snapshotOf(game) }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const isPlayerRef = (v: unknown): v is SeriesPlayer => isObj(v) && typeof v.deviceId === 'string' && typeof v.nickname === 'string'

export function isSeriesSnapshot(v: unknown): v is SeriesSnapshot {
  if (!isObj(v)) return false
  if (typeof v.gameId !== 'string' || typeof v.roomId !== 'string') return false
  if (!isPlayerRef(v.challenger) || !isPlayerRef(v.challenged)) return false
  const score = v.score
  if (!isObj(score) || !isCount(score.challenger) || !isCount(score.challenged) || !isCount(score.draws)) return false
  if (!Number.isInteger(v.gameNumber) || (v.gameNumber as number) < 1) return false
  if (v.result !== null && !isSeriesResult(v.result)) return false
  return isGameSnapshot(v.game)
}

/** Players read You / their opponent's name; watchers (viewer null or not a player) read both names. */
export function seriesStatusText(state: SeriesState, viewer: string | null): string {
  const g = state.game
  if (g.status === 'draw') return "It's a draw"
  const player = g.status === 'won' && g.winner ? g.winner : nextPlayer(g.board)
  const side = sideOfSeat(seatOf(g, player))
  const name = playerOf(state, side).nickname
  const viewerSide = viewer === null ? null : sideOf(state, viewer)
  const you = viewerSide === side
  if (g.status === 'won') {
    if (viewerSide === null) return `${name} wins!`
    return you ? 'You win!' : 'You lost'
  }
  return you ? 'Your move' : `${name}'s turn`
}
