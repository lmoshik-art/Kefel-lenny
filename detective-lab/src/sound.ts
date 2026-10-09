/** צלילים עדינים שנוצרים בדפדפן, בלי קבצים. כבויים כברירת מחדל ואינם נדרשים להבנת שום שאלה */
let ctx: AudioContext | null = null
let rainNodes: { src: AudioBufferSourceNode; gain: GainNode } | null = null

function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, vol = 0.06) {
  const a = audio()
  if (!a) return
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = 'sine'
  o.frequency.value = freq
  g.gain.setValueAtTime(0, a.currentTime + start)
  g.gain.linearRampToValueAtTime(vol, a.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur)
  o.connect(g).connect(a.destination)
  o.start(a.currentTime + start)
  o.stop(a.currentTime + start + dur + 0.05)
}

export function playCorrect() {
  tone(523, 0, 0.25)
  tone(784, 0.12, 0.35)
}

export function playTryAgain() {
  tone(330, 0, 0.3, 0.04)
}

export function playStamp() {
  tone(196, 0, 0.18, 0.08)
}

export function setRain(on: boolean) {
  const a = audio()
  if (!a) return
  if (!on) {
    if (rainNodes) {
      const { src, gain } = rainNodes
      gain.gain.linearRampToValueAtTime(0, a.currentTime + 0.5)
      src.stop(a.currentTime + 0.6)
      rainNodes = null
    }
    return
  }
  if (rainNodes) return
  const len = a.sampleRate * 3
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  const src = a.createBufferSource()
  src.buffer = buf
  src.loop = true
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1200
  const gain = a.createGain()
  gain.gain.value = 0
  gain.gain.linearRampToValueAtTime(0.18, a.currentTime + 1)
  src.connect(filter).connect(gain).connect(a.destination)
  src.start()
  rainNodes = { src, gain }
}
