import { asset } from '../lib/assets'

interface SavingsMeterProps {
  saved: number
  goal: number
  compact?: boolean
}

export function SavingsMeter({ saved, goal, compact = false }: SavingsMeterProps) {
  const percent = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0
  const left = Math.max(0, goal - saved)
  /** מיקום הגיבורה על המד, מוגבל כדי שלא תחרוג מהמסילה בקצוות */
  const markerPercent = Math.min(96, Math.max(4, percent))

  return (
    <div className="meter">
      <div className="meter-head">
        <img className="meter-jar" src={asset('jar.png')} alt="צנצנת החיסכון" />
        <div>
          <div className="meter-amount">
            {saved} ₪ מתוך {goal} ₪
          </div>
          {!compact && <div className="meter-label">נשארו עוד {left} ₪ עד היעד</div>}
        </div>
      </div>
      <div
        className="meter-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={saved}
        aria-label="מד החיסכון"
      >
        <div className="meter-fill" style={{ width: `${percent}%` }} />
        <img
          className="meter-hero"
          src={asset('hero.png')}
          alt=""
          aria-hidden="true"
          style={{ insetInlineStart: `calc(${markerPercent}% - 22px)` }}
        />
      </div>
    </div>
  )
}
