import { createBoard, getWinner, isDraw, makeMove, nextPlayer } from '@/lib/game'
import type { Board, Player, Settings, WinLine } from '@/lib/types'

export type GameStatus = 'playing' | 'won' | 'draw'

export type GameState = {
  settings: Settings
  board: Board
  status: GameStatus
  winner: Player | null
  winningLine: WinLine | null
  recorded: boolean
}

export type GameAction =
  | { type: 'MOVE'; index: number }
  | { type: 'NEW_GAME' }
  | { type: 'RECORDED' }

export function createGameState(settings: Settings): GameState {
  return {
    settings,
    board: createBoard(),
    status: 'playing',
    winner: null,
    winningLine: null,
    recorded: false,
  }
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
        return { ...state, board, status: 'won', winner: winner.player, winningLine: winner.line }
      }
      if (isDraw(board)) {
        return { ...state, board, status: 'draw' }
      }
      return { ...state, board }
    }
    case 'NEW_GAME':
      return createGameState(state.settings)
    case 'RECORDED':
      return { ...state, recorded: true }
  }
}
