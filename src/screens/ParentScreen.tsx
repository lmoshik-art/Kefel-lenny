import { useState } from 'react'
import { sounds } from '../lib/audio'
import { useGame } from '../lib/gameState'
import { isTableLearned } from '../lib/learning'
import { TABLES } from '../types'

/** קוד כניסה קבוע למסך ההורים, מתועד ב-README */
const PARENT_CODE = '2580'
const REWARD_OPTIONS = [1, 2, 5, 10]
const MONEY_STEPS = [1, 5, 10]

export function ParentScreen({ onExit }: { onExit: () => void }) {
  const {
    state,
    vaultStatus,
    vaultEligible,
    addMoney,
    setRewardPerAchievement,
    setTableApproved,
    openVault,
    setChildName,
    resetAll,
  } = useGame()
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [name, setName] = useState(state.childName)

  function pressDigit(digit: string) {
    const next = (code + digit).slice(0, 4)
    setCode(next)
    setError(false)
    if (next.length === 4) {
      if (next === PARENT_CODE) {
        setUnlocked(true)
      } else {
        setError(true)
        setCode('')
      }
    }
  }

  if (!unlocked) {
    return (
      <div className="screen">
        <div className="top-bar">
          <h1 className="title">מסך הורים</h1>
          <button className="icon-btn" onClick={onExit} aria-label="יציאה">
            ✕
          </button>
        </div>
        <p className="muted-note">יש להקיש את קוד ההורים בן ארבע הספרות.</p>
        <div className="code-dots" aria-label={`הוקשו ${code.length} ספרות`}>
          {[0, 1, 2, 3].map((slot) => (
            <span key={slot} className={`code-dot${slot < code.length ? ' filled' : ''}`} />
          ))}
        </div>
        {error && <p className="muted-note danger">קוד שגוי, אפשר לנסות שוב.</p>}
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button key={digit} onClick={() => pressDigit(digit)}>
              {digit}
            </button>
          ))}
          <button onClick={() => setCode('')}>נקה</button>
          <button onClick={() => pressDigit('0')}>0</button>
          <button onClick={() => setCode((value) => value.slice(0, -1))}>מחק</button>
        </div>
        <div className="spacer" />
        <button className="btn secondary" onClick={onExit}>
          חזרה
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <h1 className="title">מסך הורים</h1>
        <button className="icon-btn" onClick={onExit} aria-label="יציאה">
          ✕
        </button>
      </div>

      <div className="parent-panel">
        <div className="parent-row">
          <span>נצבר עד כה</span>
          <strong>
            {state.savedAmount} ₪ מתוך {state.goalAmount} ₪
          </strong>
        </div>

        <div>
          <div className="meter-label">הוספה או הפחתה ידנית</div>
          <div className="chip-row">
            {MONEY_STEPS.map((step) => (
              <button key={`plus-${step}`} className="chip on" onClick={() => addMoney(step)}>
                +{step} ₪
              </button>
            ))}
            {MONEY_STEPS.map((step) => (
              <button key={`minus-${step}`} className="chip" onClick={() => addMoney(-step)}>
                -{step} ₪
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="meter-label">סכום על כל הישג (מעבר מבחן אלוף)</div>
          <div className="chip-row">
            {REWARD_OPTIONS.map((amount) => (
              <button
                key={amount}
                className={`chip${state.rewardPerAchievement === amount ? ' on' : ''}`}
                onClick={() => setRewardPerAchievement(amount)}
              >
                {amount} ₪
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="meter-label">אישור ידני שטבלה נלמדה</div>
          <div className="chip-row">
            {TABLES.map((table) => {
              const approved = state.tables[table].parentApproved
              return (
                <button
                  key={table}
                  className={`chip${isTableLearned(state, table) ? ' on' : ''}`}
                  onClick={() => setTableApproved(table, !approved)}
                  aria-pressed={approved}
                >
                  {table}
                  {approved ? ' ✓' : ''}
                </button>
              )
            })}
          </div>
          <p className="muted-note">
            טבלה מסומנת אוטומטית כנלמדה אחרי מעבר מבחן האלוף בציון מלא בשני ימים שונים. הלחיצה כאן
            מוסיפה או מבטלת אישור ידני.
          </p>
        </div>

        <div>
          <div className="meter-label">שם הילדה</div>
          <input
            className="text-input"
            value={name}
            maxLength={16}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => name.trim() && setChildName(name)}
            aria-label="שם הילדה"
          />
        </div>

        <div>
          <div className="meter-label">פתיחת הכספת</div>
          {vaultStatus === 'open' ? (
            <p className="muted-note">הכספת כבר נפתחה.</p>
          ) : (
            <>
              <button
                className="btn gold"
                disabled={!vaultEligible}
                onClick={() => {
                  sounds.vault()
                  openVault()
                  onExit()
                }}
              >
                אישור סופי לפתיחת הכספת
              </button>
              {!vaultEligible && (
                <p className="muted-note">
                  הכפתור נפתח רק כששני התנאים מתקיימים יחד: הגעה ל-{state.goalAmount} ₪ וסימון כל
                  הטבלאות 2 עד 10 כנלמדו.
                </p>
              )}
            </>
          )}
        </div>

        <div>
          {confirmReset ? (
            <div className="stack">
              <p className="muted-note danger">
                איפוס מוחק את השם, הכוכבים, הסכום שנצבר וההתקדמות בכל הטבלאות.
              </p>
              <button
                className="btn secondary"
                onClick={() => {
                  resetAll()
                  onExit()
                }}
              >
                כן, לאפס הכול
              </button>
              <button className="btn secondary" onClick={() => setConfirmReset(false)}>
                ביטול
              </button>
            </div>
          ) : (
            <button className="btn secondary" onClick={() => setConfirmReset(true)}>
              איפוס כל הנתונים
            </button>
          )}
        </div>
      </div>

      <div className="spacer" />
      <button className="btn" onClick={onExit}>
        חזרה לאפליקציה
      </button>
    </div>
  )
}
