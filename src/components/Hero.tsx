import { useEffect, useState } from 'react'
import { HeroMood } from '../types'
import { asset } from '../lib/assets'

const SOURCES: Record<HeroMood, string> = {
  idle: asset('hero.png'),
  cheer: asset('hero-cheer.png'),
  encourage: asset('hero-encourage.png'),
  celebrate: asset('hero-celebrate.png'),
}

const ALTS: Record<HeroMood, string> = {
  idle: 'הגיבורה של האפליקציה',
  cheer: 'הגיבורה מריעה',
  encourage: 'הגיבורה מעודדת',
  celebrate: 'הגיבורה חוגגת',
}

interface HeroProps {
  mood: HeroMood
  size?: number
}

export function Hero({ mood, size = 240 }: HeroProps) {
  const [pop, setPop] = useState(false)

  useEffect(() => {
    setPop(true)
    const timer = window.setTimeout(() => setPop(false), 500)
    return () => window.clearTimeout(timer)
  }, [mood])

  return (
    <img
      className={`hero-img${pop ? ' pop' : ''}`}
      src={SOURCES[mood]}
      alt={ALTS[mood]}
      style={{ maxWidth: size }}
      draggable={false}
    />
  )
}
