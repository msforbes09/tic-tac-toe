import type { Board, GameStatus, Player, Score, WinLine } from './types'

export const ROOM_CODE_LENGTH = 4
/** No 0/O or 1/I/L, so a code read aloud or typed from a photo is unambiguous. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function createRoomCode(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const at = Math.min(ROOM_CODE_ALPHABET.length - 1, Math.floor(random() * ROOM_CODE_ALPHABET.length))
    code += ROOM_CODE_ALPHABET[at]
  }
  return code
}

/** The code as typed or pasted: case-insensitive, whitespace ignored. Null when it cannot be a room code. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.replace(/\s+/g, '').toUpperCase()
  if (code.length !== ROOM_CODE_LENGTH) return null
  for (const ch of code) if (!ROOM_CODE_ALPHABET.includes(ch)) return null
  return code
}

export function roomCodeFromUrl(url: string): string | null {
  try {
    const raw = new URL(url).searchParams.get('room')
    return raw === null ? null : normalizeRoomCode(raw)
  } catch {
    return null
  }
}

/** A link that opens the app straight into the room. */
export function roomLink(baseUrl: string, code: string): string {
  const u = new URL(baseUrl)
  u.search = ''
  u.hash = ''
  u.searchParams.set('room', code)
  return u.toString()
}

export function withoutRoomParam(url: string): string {
  const u = new URL(url)
  u.searchParams.delete('room')
  return u.toString()
}

export type Snapshot = {
  board: Board
  p1Symbol: Player
  score: Score
  status: GameStatus
  winner: Player | null
  winningLine: WinLine | null
}

/** Guest → host: `move`, `new-game` (requests). Host → guest: `state` (the truth). */
export type RoomMessage =
  | { type: 'move'; index: number }
  | { type: 'new-game' }
  | { type: 'state'; state: Snapshot }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isCellIndex = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 8
const isPlayer = (v: unknown): v is Player => v === 'X' || v === 'O'
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0

function isSnapshot(v: unknown): v is Snapshot {
  if (!isObject(v)) return false
  const board = v.board
  if (!Array.isArray(board) || board.length !== 9 || !board.every((c) => c === null || isPlayer(c))) return false
  if (!isPlayer(v.p1Symbol)) return false
  if (v.status !== 'playing' && v.status !== 'won' && v.status !== 'draw') return false
  if (v.winner !== null && !isPlayer(v.winner)) return false
  const line = v.winningLine
  if (line !== null && !(Array.isArray(line) && line.length === 3 && line.every(isCellIndex))) return false
  const score = v.score
  return isObject(score) && isCount(score.p1) && isCount(score.p2) && isCount(score.draws)
}

/** Anything off the wire that is not exactly one of our messages is dropped. */
export function isRoomMessage(value: unknown): value is RoomMessage {
  if (!isObject(value)) return false
  switch (value.type) {
    case 'move':
      return isCellIndex(value.index)
    case 'new-game':
      return true
    case 'state':
      return isSnapshot(value.state)
    default:
      return false
  }
}

export type Role = 'host' | 'guest'
