export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = Cell[]
export type WinLine = [number, number, number]
export type Winner = { player: Player; line: WinLine }

export type Mode = 'pvp' | 'bot'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Settings = { mode: Mode; difficulty: Difficulty }

export type Outcome = 'X' | 'O' | 'draw'
