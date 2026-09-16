import { useEffect, useState } from 'react'

export function StarsCounter({ stars }: { stars: number }) {
  const [bump, setBump] = useState(false)

  useEffect(() => {
    if (stars === 0) return
    setBump(true)
    const timer = window.setTimeout(() => setBump(false), 420)
    return () => window.clearTimeout(timer)
  }, [stars])

  return (
    <div className={`stars-counter${bump ? ' bump' : ''}`} id="stars-counter">
      <img src="/assets/medal.png" alt="" aria-hidden="true" />
      <span>{stars}</span>
    </div>
  )
}
