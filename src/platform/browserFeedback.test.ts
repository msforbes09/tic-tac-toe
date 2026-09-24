import { describe, expect, it, vi } from 'vitest'
import { createBrowserFeedback, type AudioLike } from './browserFeedback'

/** Minimal stand-in for AudioContext that records the tones it was asked to play. */
function fakeAudio(state: AudioContextState = 'running') {
  const tones: number[] = []
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() })
  const audio: AudioLike & { tones: number[]; resume: ReturnType<typeof vi.fn> } = {
    tones,
    currentTime: 0,
    state,
    destination: {} as AudioDestinationNode,
    resume: vi.fn(async () => {}),
    createOscillator: () => {
      const osc = {
        type: 'sine' as OscillatorType,
        frequency: { ...param(), setValueAtTime: vi.fn((hz: number) => tones.push(hz)) },
        connect: vi.fn((node) => node),
        start: vi.fn(),
        stop: vi.fn(),
      }
      return osc as unknown as OscillatorNode
    },
    createGain: () => ({ gain: param(), connect: vi.fn((node) => node) }) as unknown as GainNode,
  }
  return audio
}

describe('createBrowserFeedback', () => {
  it('gives a move a short buzz and a win a longer pattern', () => {
    const vibrate = vi.fn(() => true)
    const feedback = createBrowserFeedback({ vibrate, createAudio: () => fakeAudio() })
    feedback.play({ kind: 'move', player: 'X' })
    feedback.play({ kind: 'win', player: 'X' })
    const [movePattern] = vibrate.mock.calls[0] as unknown as [number]
    const [winPattern] = vibrate.mock.calls[1] as unknown as [number[]]
    expect(typeof movePattern).toBe('number')
    expect(Array.isArray(winPattern)).toBe(true)
    expect(winPattern.length).toBeGreaterThan(1)
  })

  it('plays a different pitch for X and O', () => {
    const audio = fakeAudio()
    const feedback = createBrowserFeedback({ createAudio: () => audio })
    feedback.play({ kind: 'move', player: 'X' })
    feedback.play({ kind: 'move', player: 'O' })
    expect(audio.tones).toHaveLength(2)
    expect(audio.tones[0]).not.toBe(audio.tones[1])
  })

  it('plays a rising run of notes for a win', () => {
    const audio = fakeAudio()
    createBrowserFeedback({ createAudio: () => audio }).play({ kind: 'win', player: 'O' })
    expect(audio.tones.length).toBeGreaterThanOrEqual(3)
    expect([...audio.tones].sort((a, b) => a - b)).toEqual(audio.tones)
  })

  it('plays a falling run of notes when you lose', () => {
    const audio = fakeAudio()
    createBrowserFeedback({ createAudio: () => audio }).play({ kind: 'lose' })
    expect(audio.tones.length).toBeGreaterThanOrEqual(3)
    expect([...audio.tones].sort((a, b) => b - a)).toEqual(audio.tones)
  })

  it('creates the audio context once and reuses it', () => {
    const createAudio = vi.fn(() => fakeAudio())
    const feedback = createBrowserFeedback({ createAudio })
    feedback.play({ kind: 'move', player: 'X' })
    feedback.play({ kind: 'draw' })
    expect(createAudio).toHaveBeenCalledTimes(1)
  })

  it('resumes a suspended audio context, which mobile browsers start in', () => {
    const audio = fakeAudio('suspended')
    createBrowserFeedback({ createAudio: () => audio }).play({ kind: 'move', player: 'X' })
    expect(audio.resume).toHaveBeenCalled()
  })

  it('still buzzes when audio is unavailable, and never throws', () => {
    const vibrate = vi.fn(() => true)
    const feedback = createBrowserFeedback({
      vibrate,
      createAudio: () => {
        throw new Error('no audio')
      },
    })
    expect(() => feedback.play({ kind: 'draw' })).not.toThrow()
    expect(vibrate).toHaveBeenCalledTimes(1)
  })

  it('is silent but safe with no vibration or audio support at all (e.g. jsdom, iPhone haptics)', () => {
    const feedback = createBrowserFeedback({ vibrate: undefined, createAudio: () => null })
    expect(() => feedback.play({ kind: 'win', player: 'X' })).not.toThrow()
  })

  it('plays a short two-note cue and a light buzz when a game starts', () => {
    const audio = fakeAudio()
    const vibrate = vi.fn(() => true)
    createBrowserFeedback({ vibrate, createAudio: () => audio }).play({ kind: 'start' })
    expect(audio.tones).toHaveLength(2)
    expect(vibrate).toHaveBeenCalledTimes(1)
  })
})
