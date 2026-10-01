// Character timings as ElevenLabs returns them from /with-timestamps.
export type Alignment = {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

export type Span = [start: number, end: number]

// Seconds from the phrase's first character to its last, searching after `after` when given.
export function spanOf(alignment: Alignment, phrase: string, after?: string): Span {
  const text = alignment.characters.join('')
  const from = after === undefined ? 0 : text.indexOf(after) + after.length
  const at = text.indexOf(phrase, from)
  if (at < 0) throw new Error(`the take does not contain "${phrase}"`)
  return [alignment.character_start_times_seconds[at], alignment.character_end_times_seconds[at + phrase.length - 1]]
}
