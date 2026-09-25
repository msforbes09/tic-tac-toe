import type { Board, GameStatus, Player, Score, WinLine } from './types'

/** No 0/O or 1/I/L, so an id read aloud or typed from a photo is unambiguous. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 4
const ROOM_ID_MIN = 4
const ROOM_ID_MAX = 8

export function createId(length: number, random: () => number = Math.random): string {
  let id = ''
  for (let i = 0; i < length; i++) {
    const at = Math.min(ROOM_CODE_ALPHABET.length - 1, Math.floor(random() * ROOM_CODE_ALPHABET.length))
    id += ROOM_CODE_ALPHABET[at]
  }
  return id
}

export const createRoomCode = (random: () => number = Math.random): string => createId(ROOM_CODE_LENGTH, random)

/** An id as typed or pasted: case-insensitive, whitespace ignored. Null when it cannot be one. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.replace(/\s+/g, '').toUpperCase()
  if (code.length < ROOM_ID_MIN || code.length > ROOM_ID_MAX) return null
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

// ---- Channels ---------------------------------------------------------------------------------

export const LOBBY_CHANNEL = 'ttt-lobby'
/** An unanswered challenge is withdrawn after this long. */
export const CHALLENGE_TIMEOUT_MS = 30_000
export const roomChannel = (roomId: string): string => `ttt-room:${roomId}`
export const gameChannel = (gameId: string): string => `ttt-game:${gameId}`

// ---- Shared shapes -----------------------------------------------------------------------------

/** The fields of one game the referee shares with everyone else. */
export type Snapshot = {
  board: Board
  p1Symbol: Player
  score: Score
  status: GameStatus
  winner: Player | null
  winningLine: WinLine | null
}

/** A player as the room sees them; `badge` is the achievement id they wear, if any. */
export type SeriesPlayer = { deviceId: string; nickname: string; badge?: string }

export type SeriesResult = {
  gameId: string
  roomId: string
  /** Who issued and who accepted the challenge; the challenger is shown on the left. */
  challengerId: string
  challengedId: string
  winner: SeriesPlayer
  loser: SeriesPlayer
  winnerScore: number
  loserScore: number
  games: number
  reason: 'decided' | 'resigned' | 'left'
  endedAt: number
}

export type MemberStatus = 'idle' | 'playing' | 'watching'
export type RoomPresence = { deviceId: string; nickname: string; status: MemberStatus; gameId: string | null; badge?: string }
export type LobbyPresence = { roomId: string; nickname: string }
export type GameRole = 'referee' | 'player' | 'watcher'
export type GamePresence = { deviceId: string; role: GameRole }

/** Room channel broadcast. */
export type RoomEvent =
  | { type: 'challenge'; gameId: string; from: SeriesPlayer; to: string }
  | { type: 'accept'; gameId: string; from: string; to: string }
  | { type: 'decline'; gameId: string; from: string }
  | { type: 'cancel'; gameId: string; from: string }
  | { type: 'series-ended'; result: SeriesResult }
  | { type: 'room-deleted' }

/**
 * Game channel broadcast. Players → referee: `move`, `next-game`, `resign`, `hello`.
 * Referee → all: `state` (a series snapshot, validated by the series module).
 */
export type GameMessage =
  | { type: 'move'; index: number; from: string }
  | { type: 'next-game'; from: string }
  | { type: 'resign'; from: string }
  | { type: 'hello'; from: string }
  | { type: 'state'; state: unknown }

// ---- Validation: anything off the wire that is not exactly one of our shapes is dropped --------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isCellIndex = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 8
const isPlayer = (v: unknown): v is Player => v === 'X' || v === 'O'
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const isString = (v: unknown): v is string => typeof v === 'string'
const hasBadge = (v: Record<string, unknown>) => v.badge === undefined || isString(v.badge)
const isPlayerRef = (v: unknown): v is SeriesPlayer => isObject(v) && isString(v.deviceId) && isString(v.nickname) && hasBadge(v)

export function isGameSnapshot(v: unknown): v is Snapshot {
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

export function isSeriesResult(v: unknown): v is SeriesResult {
  if (!isObject(v)) return false
  return (
    isString(v.gameId) &&
    isString(v.roomId) &&
    isString(v.challengerId) &&
    isString(v.challengedId) &&
    isPlayerRef(v.winner) &&
    isPlayerRef(v.loser) &&
    isCount(v.winnerScore) &&
    isCount(v.loserScore) &&
    isCount(v.games) &&
    (v.reason === 'decided' || v.reason === 'resigned' || v.reason === 'left') &&
    typeof v.endedAt === 'number'
  )
}

export function isRoomEvent(v: unknown): v is RoomEvent {
  if (!isObject(v)) return false
  switch (v.type) {
    case 'challenge':
      return isString(v.gameId) && isPlayerRef(v.from) && isString(v.to)
    case 'accept':
      return isString(v.gameId) && isString(v.from) && isString(v.to)
    case 'decline':
    case 'cancel':
      return isString(v.gameId) && isString(v.from)
    case 'series-ended':
      return isSeriesResult(v.result)
    case 'room-deleted':
      return true
    default:
      return false
  }
}

export function isGameMessage(v: unknown): v is GameMessage {
  if (!isObject(v)) return false
  switch (v.type) {
    case 'move':
      return isCellIndex(v.index) && isString(v.from)
    case 'next-game':
    case 'resign':
    case 'hello':
      return isString(v.from)
    case 'state':
      return 'state' in v
    default:
      return false
  }
}

export function isRoomPresence(v: unknown): v is RoomPresence {
  if (!isObject(v)) return false
  return (
    isString(v.deviceId) &&
    isString(v.nickname) &&
    (v.status === 'idle' || v.status === 'playing' || v.status === 'watching') &&
    (v.gameId === null || isString(v.gameId)) &&
    hasBadge(v)
  )
}

export function isGamePresence(v: unknown): v is GamePresence {
  return isObject(v) && isString(v.deviceId) && (v.role === 'referee' || v.role === 'player' || v.role === 'watcher')
}

export function isLobbyPresence(v: unknown): v is LobbyPresence {
  return isObject(v) && isString(v.roomId) && isString(v.nickname)
}

/** Games in progress: playing members grouped by game, only complete pairs, in the order first seen. */
export function pairsInProgress(members: RoomPresence[]): { gameId: string; players: SeriesPlayer[] }[] {
  const groups = new Map<string, SeriesPlayer[]>()
  for (const m of members) {
    if (m.status !== 'playing' || m.gameId === null) continue
    const list = groups.get(m.gameId) ?? []
    list.push({ deviceId: m.deviceId, nickname: m.nickname })
    groups.set(m.gameId, list)
  }
  return Array.from(groups, ([gameId, players]) => ({ gameId, players })).filter((g) => g.players.length === 2)
}

// ---- Config -----------------------------------------------------------------------------------

export type SupabaseConfig = { url: string; anonKey: string }

/** Both values, or null when online play is not set up. The publishable key is public by design. */
export function readSupabaseConfig(env: Record<string, unknown>): SupabaseConfig | null {
  const url = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  if (typeof url !== 'string' || typeof anonKey !== 'string') return null
  if (url.trim() === '' || anonKey.trim() === '') return null
  return { url: url.trim(), anonKey: anonKey.trim() }
}
