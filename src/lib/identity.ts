import type { HistoryStorage } from './history'
import { newEntryId } from './history'

export const DEVICE_KEY = 'tic-tac-toe:device'
export const NICKNAME_KEY = 'tic-tac-toe:nickname'
export const OWNED_KEY = 'tic-tac-toe:rooms-owned'

const read = (storage: HistoryStorage, key: string): string | null => {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}
const write = (storage: HistoryStorage, key: string, value: string): void => {
  try {
    storage.setItem(key, value)
  } catch {
    // Best-effort, like the rest of storage.
  }
}

/** A random id for this device, made once. Presence keys and room ownership hang off it. */
export function loadDeviceId(storage: HistoryStorage): string {
  const saved = read(storage, DEVICE_KEY)
  if (saved && saved.length >= 8) return saved
  const id = newEntryId()
  write(storage, DEVICE_KEY, id)
  return id
}

/** Trimmed, single-spaced, 2–20 characters. Null when it cannot be a nickname. */
export function normalizeNickname(input: string): string | null {
  const name = input.trim().replace(/\s+/g, ' ')
  return name.length >= 2 && name.length <= 20 ? name : null
}

export const loadNickname = (storage: HistoryStorage): string | null => read(storage, NICKNAME_KEY)
export const saveNickname = (storage: HistoryStorage, name: string): void => write(storage, NICKNAME_KEY, name)

/** roomId → owner token for rooms this device created. */
export function loadOwnedRooms(storage: HistoryStorage): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(read(storage, OWNED_KEY) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'string')) as Record<string, string>
  } catch {
    return {}
  }
}
export function saveOwnedRoom(storage: HistoryStorage, roomId: string, token: string): void {
  write(storage, OWNED_KEY, JSON.stringify({ ...loadOwnedRooms(storage), [roomId]: token }))
}
export function removeOwnedRoom(storage: HistoryStorage, roomId: string): void {
  const rest = { ...loadOwnedRooms(storage) }
  delete rest[roomId]
  write(storage, OWNED_KEY, JSON.stringify(rest))
}

export const newToken = (): string => `${newEntryId()}${newEntryId()}`.replace(/-/g, '')

/** SHA-256 hex. WebCrypto needs a secure context; plain-HTTP LAN testing takes the JS path. */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return sha256HexFallback(text)
}

// Compact SHA-256 (FIPS 180-4) for contexts without WebCrypto.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

export function sha256HexFallback(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const bitLen = bytes.length * 8
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const tail = new DataView(padded.buffer)
  tail.setUint32(padded.length - 4, bitLen >>> 0)
  tail.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000))
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const w = new Uint32Array(64)
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))
  for (let off = 0; off < padded.length; off += 64) {
    const view = new DataView(padded.buffer, off, 64)
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    h[0] = (h[0] + a) >>> 0
    h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0
    h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0
    h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0
    h[7] = (h[7] + hh) >>> 0
  }
  return Array.from(h, (n) => n.toString(16).padStart(8, '0')).join('')
}
