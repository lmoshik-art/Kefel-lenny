import { useMemo } from 'react'

const COLORS = ['#ff2d95', '#22e2d8', '#ffc63d', '#8a2be2', '#ffffff']

export function Confetti({ pieces = 60 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }).map((_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 600,
        duration: 1800 + Math.random() * 1600,
        color: COLORS[index % COLORS.length],
      })),
    [pieces],
  )

  return (
    <div className="fly-layer" aria-hidden="true">
      {items.map((item) => (
        <span
          key={item.id}
          className="confetti-piece"
          style={{
            left: `${item.left}%`,
            background: item.color,
            animationDelay: `${item.delay}ms`,
            animationDuration: `${item.duration}ms`,
          }}
        />
      ))}
    </div>
  )
}
