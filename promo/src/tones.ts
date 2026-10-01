// The app's own sounds (src/platform/browserFeedback.ts), rendered offline: triangle waves with a short
// attack and release, peaking at -12 dBFS. Notes from storyboard section 5.

export const SAMPLE_RATE = 48000
export const PEAK = 10 ** (-12 / 20)

const ATTACK = 0.005
const RELEASE = 0.02

export type Note = { hz: number; at: number; seconds: number }

const single = (hz: number): Note[] => [{ hz, at: 0, seconds: 0.07 }]
const run = (hzs: number[], gap: number, seconds: number): Note[] =>
  hzs.map((hz, i) => ({ hz, at: i * gap, seconds }))

export const CUES = {
  'move-x': single(660),
  'move-o': single(520),
  'step-587': single(587),
  win: run([523, 659, 784, 1047], 0.09, 0.16),
  achievement: run([784, 1175], 0.1, 0.18),
  start: run([523, 784], 0.08, 0.1),
} satisfies Record<string, Note[]>

export type CueName = keyof typeof CUES

const triangle = (phase: number) => 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25))

const envelope = (t: number, seconds: number) => Math.min(1, t / ATTACK, (seconds - t) / RELEASE)

export function renderCue(notes: Note[]): Float32Array {
  const end = Math.max(...notes.map((n) => n.at + n.seconds))
  const samples = new Float32Array(Math.round(end * SAMPLE_RATE))
  for (const note of notes) {
    const from = Math.round(note.at * SAMPLE_RATE)
    const length = Math.round(note.seconds * SAMPLE_RATE)
    for (let i = 0; i < length && from + i < samples.length; i++) {
      const t = i / SAMPLE_RATE
      samples[from + i] += triangle(note.hz * t) * envelope(t, note.seconds)
    }
  }
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0)
  return samples.map((s) => (s / peak) * PEAK)
}

export function encodeWav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(bytes.buffer)
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.round(s * 32767), true))
  return bytes
}
