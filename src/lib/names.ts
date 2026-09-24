export const ADJECTIVES = [
  'Bold', 'Sly', 'Quiet', 'Lucky', 'Iron', 'Swift', 'Calm', 'Clever', 'Brave', 'Sharp',
  'Golden', 'Silver', 'Cosmic', 'Gentle', 'Wild', 'Steady', 'Bright', 'Merry', 'Nimble', 'Proud',
  'Rusty', 'Shadow', 'Sunny', 'Tidy', 'Velvet', 'Witty', 'Zesty', 'Humble', 'Jolly', 'Keen',
] as const

export const TERMS = [
  'Corner', 'Edge', 'Center', 'Diagonal', 'Row', 'Column', 'Fork', 'Block', 'Line', 'Square', 'Cross', 'Nought',
] as const

const pick = <T,>(list: readonly T[], random: () => number): T =>
  list[Math.min(list.length - 1, Math.floor(random() * list.length))]

/** "Sly Diagonal": the same theme for rooms and nicknames. */
export function randomName(random: () => number = Math.random): string {
  return `${pick(ADJECTIVES, random)} ${pick(TERMS, random)}`
}

/** A name not already in `existing`; a two-digit suffix breaks ties. */
export function uniqueName(existing: Iterable<string>, random: () => number = Math.random): string {
  const taken = new Set(existing)
  const base = randomName(random)
  if (!taken.has(base)) return base
  // Walk the two-digit suffixes from a random start so every one gets a turn.
  const start = Math.min(89, Math.floor(random() * 90))
  for (let i = 0; i < 90; i++) {
    const candidate = `${base} ${10 + ((start + i) % 90)}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base} ${taken.size}`
}

const NICKNAME_MAX = 12

/** A themed name short enough for a nickname (12 characters or fewer). */
export function randomNickname(random: () => number = Math.random): string {
  const adjective = pick(ADJECTIVES, random)
  const fits = TERMS.filter((t) => adjective.length + 1 + t.length <= NICKNAME_MAX)
  const term = fits.length > 0 ? pick(fits, random) : pick(TERMS, random)
  const name = `${adjective} ${term}`
  return name.length <= NICKNAME_MAX ? name : adjective.slice(0, NICKNAME_MAX)
}
