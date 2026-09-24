import { createBoard, getWinner, isDraw, makeMove, nextPlayer } from '@/lib/game'
import type { Board, GameStatus, Player, Score, Seat, Settings, WinLine } from '@/lib/types'

export type { Seat, GameStatus, Score }

export type GameState = {
  settings: Settings
  board: Board
  status: GameStatus
  winner: Player | null
  winningLine: WinLine | null
  recorded: boolean
  /** The symbol p1 plays this game. X always moves first; the seats trade X between games. */
  p1Symbol: Player
  /** Finished games since leaving setup. */
  score: Score
}

export type GameAction =
  | { type: 'MOVE'; index: number }
  | { type: 'NEW_GAME' }
  | { type: 'RECORDED' }

const other = (player: Player): Player => (player === 'X' ? 'O' : 'X')

export function createGameState(settings: Settings): GameState {
  return freshGame(settings, settings.p1Symbol, { p1: 0, p2: 0, draws: 0 })
}

function freshGame(settings: Settings, p1Symbol: Player, score: Score): GameState {
  return {
    settings,
    board: createBoard(),
    status: 'playing',
    winner: null,
    winningLine: null,
    recorded: false,
    p1Symbol,
    score,
  }
}

export function seatOf(state: Pick<GameState, 'p1Symbol'>, player: Player): Seat {
  return player === state.p1Symbol ? 'p1' : 'p2'
}

export function symbolOf(state: Pick<GameState, 'p1Symbol'>, seat: Seat): Player {
  return seat === 'p1' ? state.p1Symbol : other(state.p1Symbol)
}

/** Winner takes X next game; a draw swaps; an abandoned game changes nothing. */
function nextP1Symbol(state: GameState): Player {
  if (state.status === 'won' && state.winner) return seatOf(state, state.winner) === 'p1' ? 'X' : 'O'
  if (state.status === 'draw') return other(state.p1Symbol)
  return state.p1Symbol
}

function isLegalMove(state: GameState, index: number): boolean {
  return (
    state.status === 'playing' &&
    Number.isInteger(index) &&
    index >= 0 &&
    index <= 8 &&
    state.board[index] === null
  )
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOVE': {
      if (!isLegalMove(state, action.index)) return state
      const board = makeMove(state.board, action.index, nextPlayer(state.board))
      const winner = getWinner(board)
      if (winner) {
        const seat = seatOf(state, winner.player)
        const score = { ...state.score, [seat]: state.score[seat] + 1 }
        return { ...state, board, status: 'won', winner: winner.player, winningLine: winner.line, score }
      }
      if (isDraw(board)) {
        return { ...state, board, status: 'draw', score: { ...state.score, draws: state.score.draws + 1 } }
      }
      return { ...state, board }
    }
    case 'NEW_GAME':
      return freshGame(state.settings, nextP1Symbol(state), state.score)
    case 'RECORDED':
      return { ...state, recorded: true }
  }
}
