// Character timings as ElevenLabs returns them from /with-timestamps.
export type Alignment = {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

export type Take = { audio_base64: string; alignment: Alignment }

export type Span = [start: number, end: number]

const isNumbers = (v: unknown, length: number) =>
  Array.isArray(v) && v.length === length && v.every((n) => Number.isFinite(n))

// The API's JSON is untrusted: accept it only with audio and one finite start and end per character.
export function readTake(body: unknown): Take {
  const take = body as Partial<Take> | null
  const a = take?.alignment
  const ok =
    typeof take?.audio_base64 === "string" &&
    Array.isArray(a?.characters) &&
    isNumbers(a.character_start_times_seconds, a.characters.length) &&
    isNumbers(a.character_end_times_seconds, a.characters.length)
  if (!ok) throw new Error("ElevenLabs answered without audio or with incomplete timings")
  return take as Take
}

// Seconds from the phrase's first character to its last, searching after `after` when given.
export function spanOf(alignment: Alignment, phrase: string, after?: string): Span {
  const text = alignment.characters.join("")
  const find = (needle: string, from: number) => {
    const at = text.indexOf(needle, from)
    if (at < 0) throw new Error(`the take does not contain "${needle}"`)
    return at
  }
  const from = after === undefined ? 0 : find(after, 0) + after.length
  const at = find(phrase, from)
  return [
    alignment.character_start_times_seconds[at],
    alignment.character_end_times_seconds[at + phrase.length - 1],
  ]
}
