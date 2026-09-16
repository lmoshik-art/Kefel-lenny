import { useEffect, useState } from 'react'
import { HeroMood } from '../types'

const SOURCES: Record<HeroMood, string> = {
  idle: '/assets/hero.png',
  cheer: '/assets/hero-cheer.png',
  encourage: '/assets/hero-encourage.png',
  celebrate: '/assets/hero-celebrate.png',
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
