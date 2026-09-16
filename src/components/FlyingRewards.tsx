import { useEffect, useState } from 'react'

export interface FlyBurst {
  id: number
  x: number
  y: number
  count: number
  kind: 'star' | 'coin'
}

const IMAGES: Record<FlyBurst['kind'], string> = {
  star: '/assets/medal.png',
  coin: '/assets/coin.png',
}

/** כוכבים ומטבעות שמתעופפים מנקודת הלחיצה אל מונה הכוכבים שבראש המסך */
export function FlyingRewards({ burst, targetSelector }: { burst: FlyBurst | null; targetSelector: string }) {
  const [active, setActive] = useState<FlyBurst | null>(null)
  const [target, setTarget] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!burst) return
    const node = document.querySelector(targetSelector)
    const rect = node?.getBoundingClientRect()
    setTarget({
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : 40,
    })
    setActive(burst)
    const timer = window.setTimeout(() => setActive(null), 1000)
    return () => window.clearTimeout(timer)
  }, [burst, targetSelector])

  if (!active) return null

  return (
    <div className="fly-layer" aria-hidden="true">
      {Array.from({ length: active.count }).map((_, index) => {
        const jitterX = (index - active.count / 2) * 18
        const jitterY = index * 6
        return (
          <img
            key={index}
            className="fly-item"
            src={IMAGES[active.kind]}
            alt=""
            style={{
              left: active.x + jitterX,
              top: active.y + jitterY,
              animationDelay: `${index * 70}ms`,
              ['--dx' as string]: `${target.x - active.x - jitterX}px`,
              ['--dy' as string]: `${target.y - active.y - jitterY}px`,
            }}
          />
        )
      })}
    </div>
  )
}
