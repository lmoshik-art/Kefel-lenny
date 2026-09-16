import { useEffect } from 'react'

/** מחזיר את הגלילה לראש המסך בכל מעבר מסך, כדי שהכותרת והכפתורים העליונים יישארו גלויים */
export function useScrollTop(key: unknown): void {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [key])
}
