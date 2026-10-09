import { useMemo, useState } from 'react'
import { useGame } from '../lib/gameState'
import { STATUS_LABEL, buildReport, factLabel, formatDay, reportText } from '../lib/report'
import { CHAMPION_PASS_SCORE, REQUIRED_CHAMPION_DAYS } from '../lib/storage'

/** דוח התקדמות לקריאה בלבד, בתוך מסך ההורים */
export function ParentReport() {
  const { state } = useGame()
  const report = useMemo(() => buildReport(state), [state])
  const [shareNote, setShareNote] = useState('')

  async function share() {
    const text = reportText(state, report)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'דוח לוח הכפל', text })
        setShareNote('')
        return
      }
      await navigator.clipboard.writeText(text)
      setShareNote('הדוח הועתק. אפשר להדביק אותו בוואטסאפ או במייל.')
    } catch (error) {
      // ביטול השיתוף על ידי המשתמש אינו שגיאה
      if (error instanceof DOMException && error.name === 'AbortError') return
      setShareNote('לא ניתן לשתף אוטומטית במכשיר הזה.')
    }
  }

  return (
    <div className="parent-panel report">
      <div className="report-summary">
        <div className="report-stat">
          <strong>
            {report.learnedCount}/{report.tables.length}
          </strong>
          <span>טבלאות נלמדו</span>
        </div>
        <div className="report-stat">
          <strong>{report.accuracy === null ? 'אין' : `${report.accuracy}%`}</strong>
          <span>תשובות נכונות</span>
        </div>
        <div className="report-stat">
          <strong>{report.totalAttempts}</strong>
          <span>תרגילים נענו</span>
        </div>
      </div>

      <div>
        <div className="meter-label">מצב כל טבלה</div>
        <ul className="report-tables">
          {report.tables.map((t) => (
            <li key={t.table} className={`report-table status-${t.status}`}>
              <div className="report-table-head">
                <strong>טבלת {t.table}</strong>
                <span className="report-badge">{STATUS_LABEL[t.status]}</span>
              </div>
              <div className="report-bar" aria-hidden="true">
                <span style={{ width: `${t.accuracy ?? 0}%` }} />
              </div>
              <p className="report-line">
                {t.accuracy === null ? 'עוד לא נענו תרגילים' : `${t.accuracy}% נכון (${t.correct} מתוך ${t.attempts})`}
                {t.bestScore > 0 && ` · שיא במבחן האלוף: ${t.bestScore} מתוך ${CHAMPION_PASS_SCORE}`}
              </p>
              {t.championDays.length > 0 && (
                <p className="report-line">
                  עברה את מבחן האלוף בימים: {t.championDays.map(formatDay).join(', ')}
                </p>
              )}
              {t.reviewCount > 0 && <p className="report-line">{t.reviewCount} תרגילים ממתינים לחזרה</p>}
            </li>
          ))}
        </ul>
        <p className="muted-note">
          טבלה נחשבת נלמדה אחרי מעבר מבחן האלוף בציון מלא ב-{REQUIRED_CHAMPION_DAYS} ימים שונים, או באישור ידני.
        </p>
      </div>

      <div>
        <div className="meter-label">תרגילים שכדאי לחזור עליהם</div>
        {report.hardFacts.length ? (
          <ul className="report-facts">
            {report.hardFacts.map((f) => (
              <li key={f.key}>
                <bdi dir="ltr">{factLabel(f)}</bdi>
                <span>
                  {f.correct} מתוך {f.attempts} נכון
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-note">אין עדיין תרגילים שנענו בטעות יותר מפעם אחת.</p>
        )}
        {report.reviewFacts.length > 0 && (
          <p className="muted-note">
            האפליקציה מחזירה אוטומטית {report.reviewFacts.length} תרגילים לתרגול, עד שתי תשובות נכונות ברצף בכל אחד.
          </p>
        )}
      </div>

      <div className="stack">
        <button className="btn turquoise" onClick={share}>
          שיתוף הדוח
        </button>
        {shareNote && <p className="muted-note">{shareNote}</p>}
        <p className="muted-note">
          הדוח מבוסס על הנתונים שבמכשיר הזה בלבד. אין בו מידע על זמן התרגול, כי האפליקציה אינה שומרת אותו.
        </p>
      </div>
    </div>
  )
}
