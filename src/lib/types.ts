export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = Cell[]
export type WinLine = [number, number, number]
export type Winner = { player: Player; line: WinLine }

export type Mode = 'pvp' | 'bot' | 'online'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Settings = {
  mode: Mode
  difficulty: Difficulty
  /** The symbol player one (you, against the bot) plays in the first game. */
  p1Symbol: Player
}

export type Outcome = 'X' | 'O' | 'draw'

/** p1 is you against the bot, or Player 1 in two-player mode. p2 is the bot or Player 2. */
export type Seat = 'p1' | 'p2'

export type GameStatus = 'playing' | 'won' | 'draw'
export type Score = { p1: number; p2: number; draws: number }
