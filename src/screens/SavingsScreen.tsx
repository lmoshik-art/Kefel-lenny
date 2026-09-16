import { useEffect, useState } from 'react'
import { Confetti } from '../components/Confetti'
import { Hero } from '../components/Hero'
import { SavingsMeter } from '../components/SavingsMeter'
import { sounds } from '../lib/audio'
import { useGame } from '../lib/gameState'
import { learnedTables } from '../lib/learning'
import { TABLES } from '../types'

export function SavingsScreen({ onHome }: { onHome: () => void }) {
  const { state, vaultStatus } = useGame()
  const [burst, setBurst] = useState(vaultStatus === 'open')
  const learned = learnedTables(state)
  const moneyDone = state.savedAmount >= state.goalAmount
  const tablesDone = learned.length === TABLES.length
  const left = Math.max(0, state.goalAmount - state.savedAmount)

  useEffect(() => {
    if (vaultStatus !== 'open') return
    sounds.vault()
    setBurst(true)
    const timer = window.setTimeout(() => setBurst(false), 3200)
    return () => window.clearTimeout(timer)
  }, [vaultStatus])

  return (
    <div className="screen">
      {burst && <Confetti pieces={80} />}
      <div className="top-bar">
        <h1 className="title">החיסכון של {state.childName}</h1>
        <button className="icon-btn" onClick={onHome} aria-label="חזרה למסך הבית">
          ✕
        </button>
      </div>

      <SavingsMeter saved={state.savedAmount} goal={state.goalAmount} />

      <div className="vault-card">
        {vaultStatus === 'open' ? (
          <>
            <img className="vault-img burst" src="/assets/gift.png" alt="הכספת נפתחה" />
            <div className="big-amount">{state.savedAmount} ₪</div>
            <p className="speech">הכספת נפתחה! הכסף שלך והרווחת אותו בעבודה אמיתית.</p>
            <Hero mood="celebrate" size={180} />
          </>
        ) : (
          <>
            <img
              className={`vault-img${vaultStatus === 'ready' ? ' shake' : ''}`}
              src="/assets/chest.png"
              alt="כספת נעולה"
            />
            <div className="big-amount">{state.savedAmount} ₪</div>
            <p className="meter-label">
              {vaultStatus === 'ready'
                ? 'הכספת מוכנה להיפתח, צריך רק אישור של אבא או אמא'
                : `הכסף נעול בכספת. נשארו עוד ${left} ₪ ועוד קצת לימוד`}
            </p>
          </>
        )}
      </div>

      <div className="checklist">
        <div className="check-row">
          <span className={`check-mark${moneyDone ? ' done' : ''}`}>{moneyDone ? '✓' : '1'}</span>
          <span>
            להגיע ל-{state.goalAmount} ₪ ({state.savedAmount} ₪ עד עכשיו)
          </span>
        </div>
        <div className="check-row">
          <span className={`check-mark${tablesDone ? ' done' : ''}`}>{tablesDone ? '✓' : '2'}</span>
          <span>
            לדעת את כל הטבלאות ({learned.length} מתוך {TABLES.length} נלמדו)
          </span>
        </div>
      </div>

      <div className="chip-row">
        {TABLES.map((table) => (
          <span key={table} className={`chip${learned.includes(table) ? ' on' : ''}`}>
            {table}
          </span>
        ))}
      </div>

      <div className="spacer" />
      <button className="btn secondary" onClick={onHome}>
        חזרה לטבלאות
      </button>
    </div>
  )
}
