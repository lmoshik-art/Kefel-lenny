/** צלילי משוב קצרים שנוצרים ב-Web Audio API, בלי קבצי שמע חיצוניים */

type ToneStep = { frequency: number; start: number; duration: number; gain?: number; type?: OscillatorType }

let context: AudioContext | null = null
let muted = false

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      context = new Ctor()
    } catch {
      return null
    }
  }
  return context
}

/** ספארי באייפון דורש מחווה של המשתמש לפני הפעלת אודיו */
export function unlockAudio(): void {
  const ctx = getContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

export function setMuted(value: boolean): void {
  muted = value
}

export function isMuted(): boolean {
  return muted
}

function play(steps: ToneStep[]): void {
  if (muted) return
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  for (const step of steps) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = step.type ?? 'sine'
    oscillator.frequency.setValueAtTime(step.frequency, now + step.start)
    const peak = step.gain ?? 0.18
    gain.gain.setValueAtTime(0.0001, now + step.start)
    gain.gain.exponentialRampToValueAtTime(peak, now + step.start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + step.start + step.duration)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now + step.start)
    oscillator.stop(now + step.start + step.duration + 0.05)
  }
}

export const sounds = {
  tap(): void {
    play([{ frequency: 520, start: 0, duration: 0.09, gain: 0.1 }])
  },
  correct(): void {
    play([
      { frequency: 660, start: 0, duration: 0.14 },
      { frequency: 880, start: 0.1, duration: 0.18 },
      { frequency: 1170, start: 0.2, duration: 0.24, gain: 0.14 },
    ])
  },
  gentleMiss(): void {
    play([
      { frequency: 420, start: 0, duration: 0.16, gain: 0.12, type: 'triangle' },
      { frequency: 350, start: 0.12, duration: 0.22, gain: 0.1, type: 'triangle' },
    ])
  },
  star(): void {
    play([
      { frequency: 1320, start: 0, duration: 0.1, gain: 0.1 },
      { frequency: 1760, start: 0.07, duration: 0.14, gain: 0.09 },
    ])
  },
  celebrate(): void {
    play([
      { frequency: 523, start: 0, duration: 0.18 },
      { frequency: 659, start: 0.14, duration: 0.18 },
      { frequency: 784, start: 0.28, duration: 0.2 },
      { frequency: 1047, start: 0.44, duration: 0.36, gain: 0.16 },
    ])
  },
  vault(): void {
    play([
      { frequency: 392, start: 0, duration: 0.22, type: 'triangle' },
      { frequency: 523, start: 0.2, duration: 0.22, type: 'triangle' },
      { frequency: 659, start: 0.4, duration: 0.24 },
      { frequency: 880, start: 0.6, duration: 0.3 },
      { frequency: 1319, start: 0.86, duration: 0.5, gain: 0.16 },
    ])
  },
}
