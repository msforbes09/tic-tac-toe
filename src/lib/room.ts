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
