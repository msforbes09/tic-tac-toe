export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = Cell[]
export type WinLine = [number, number, number]
export type Winner = { player: Player; line: WinLine }

export type Mode = 'pvp' | 'bot'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Settings = {
  mode: Mode
  difficulty: Difficulty
  /** The symbol player one (you, against the bot) plays in the first game. */
  p1Symbol: Player
}

export type Outcome = 'X' | 'O' | 'draw'
