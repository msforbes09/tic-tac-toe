import type { Feedback, FeedbackEvent } from '@/lib/feedback'

export type AudioLike = Pick<
  AudioContext,
  'currentTime' | 'state' | 'destination' | 'resume' | 'createOscillator' | 'createGain'
>

export type BrowserFeedbackDeps = {
  vibrate?: (pattern: number | number[]) => boolean
  createAudio?: () => AudioLike | null
}

type Note = { hz: number; at: number; length: number }

// Short synthesized tones, so there are no audio files to ship. Times in seconds.
function notesFor(event: FeedbackEvent): Note[] {
  switch (event.kind) {
    case 'move':
      return [{ hz: event.player === 'X' ? 660 : 520, at: 0, length: 0.07 }]
    case 'win':
      return [523, 659, 784, 1047].map((hz, i) => ({ hz, at: i * 0.09, length: 0.16 }))
    case 'draw':
      return [{ hz: 330, at: 0, length: 0.25 }]
    case 'lose':
      return [392, 330, 262].map((hz, i) => ({ hz, at: i * 0.14, length: 0.22 }))
    case 'start':
      return [523, 784].map((hz, i) => ({ hz, at: i * 0.08, length: 0.1 }))
    case 'splash':
      // Timed to the Logo draw-in and the title's rise (see Splash.tsx): O, then X, then the start cue.
      return [
        { hz: 520, at: 0, length: 0.14 },
        { hz: 660, at: 0.52, length: 0.14 },
        ...notesFor({ kind: 'start' }).map((n) => ({ ...n, at: n.at + 1.0 })),
      ]
  }
}

// Vibration patterns in milliseconds (buzz, pause, buzz, …).
function vibrationFor(event: FeedbackEvent): number | number[] {
  switch (event.kind) {
    case 'move':
      return 12
    case 'win':
      return [30, 60, 30, 60, 80]
    case 'draw':
      return [40, 80, 40]
    case 'lose':
      return [120]
    case 'start':
      return 18
    case 'splash':
      return 0 // Vibration needs a gesture too; nothing to gain.
  }
}

function defaultVibrate(): BrowserFeedbackDeps['vibrate'] {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return undefined
  return (pattern) => navigator.vibrate(pattern)
}

function defaultCreateAudio(): AudioLike | null {
  const w = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }
  const Ctor = w.AudioContext ?? w.webkitAudioContext
  return Ctor ? new Ctor() : null
}

function playNote(audio: AudioLike, { hz, at, length }: Note) {
  const start = audio.currentTime + at
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(hz, start)
  // Quick attack then exponential decay, so tones click in and fade instead of popping.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(0.18, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  osc.connect(gain).connect(audio.destination)
  osc.start(start)
  osc.stop(start + length + 0.02)
}

/**
 * Sound via Web Audio and haptics via the Vibration API. Either may be missing
 * (iPhone Safari has no vibration); play() degrades quietly and never throws.
 */
export function createBrowserFeedback(deps: BrowserFeedbackDeps = {}): Feedback {
  const vibrate = 'vibrate' in deps ? deps.vibrate : defaultVibrate()
  const createAudio = deps.createAudio ?? defaultCreateAudio
  let audio: AudioLike | null | undefined

  return {
    play(event) {
      try {
        const pattern = vibrationFor(event)
        if (pattern !== 0) vibrate?.(pattern)
      } catch {
        // Haptics are best-effort.
      }
      try {
        // Created lazily: browsers only allow audio after a user gesture, and the first move is one.
        if (audio === undefined) audio = createAudio()
        if (!audio) return
        if (audio.state === 'suspended') {
          // No gesture yet. The splash is dropped: queued notes would all fire together on the first tap.
          if (event.kind === 'splash') return
          void audio.resume().catch(() => {})
        }
        for (const note of notesFor(event)) playNote(audio, note)
      } catch {
        audio = null // Audio is broken here; stop trying.
      }
    },
  }
}
