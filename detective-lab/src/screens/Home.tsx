import { useState } from 'react'
import type { Content, Progress } from '../types.ts'
import { READY_TEXT, dayKey, daysToExam, readiness, skillState, type ReadyLabel } from '../engine/plan.ts'

export function topicReadiness(content: Content, p: Progress, topicId: string) {
  const skills = content.skills.filter((s) => s.topic === topicId)
  const rs = skills.map((s) => readiness(s, skillState(p, s.id)))
  const pct = Math.round(rs.reduce((a, r) => a + r.pct, 0) / rs.length)
  const order: ReadyLabel[] = ['new', 'started', 'almost', 'ready']
  // הנושא מוכן רק כשכל המיומנויות בו מוכנות
  const label = rs.every((r) => r.label === 'new') ? 'new' : order[Math.min(...rs.map((r) => Math.max(1, order.indexOf(r.label))))]
  return { pct, label, skills: skills.map((s, i) => ({ skill: s, ...rs[i] })) }
}

export function ExamCountdown({ p, onSetDate }: { p: Progress; onSetDate: (d: string | null) => void }) {
  const left = daysToExam(p)
  const [editing, setEditing] = useState(!p.examDate)
  if (editing || left === null) {
    return (
      <div className="exam-date">
        <label htmlFor="exam-date">מתי המבחן?</label>
        <input
          id="exam-date"
          type="date"
          min={dayKey()}
          value={p.examDate ?? ''}
          onChange={(e) => {
            onSetDate(e.target.value || null)
            if (e.target.value) setEditing(false)
          }}
        />
        <p className="muted">לפי התאריך האפליקציה מתכננת מתי לחזור על כל נושא.</p>
      </div>
    )
  }
  return (
    <button type="button" className="countdown" onClick={() => setEditing(true)} aria-label="שינוי תאריך המבחן">
      <span className="count-num">{left < 0 ? '✓' : left}</span>
      <span>{left < 0 ? 'המבחן עבר' : left === 0 ? 'המבחן היום' : left === 1 ? 'יום למבחן' : 'ימים למבחן'}</span>
    </button>
  )
}

interface Props {
  content: Content
  progress: Progress
  preview: { lessons: number; questions: number }
  onDaily: () => void
  onExtra: () => void
  onExam: () => void
  onNav: (to: 'library' | 'progress' | 'settings') => void
  onSetDate: (d: string | null) => void
}

export function Home({ content, progress, preview, onDaily, onExtra, onExam, onNav, onSetDate }: Props) {
  const today = dayKey()
  const day = progress.days[today]
  const done = !!day?.daily
  const [open, setOpen] = useState<string | null>(null)
  const left = daysToExam(progress)
  const lastExam = progress.exams[progress.exams.length - 1]
  const seenAll = content.skills.every((s) => skillState(progress, s.id).seen)

  return (
    <main className="screen home">
      <header className="home-head">
        <div>
          <p className="eyebrow">מדעים · כיתה ז׳</p>
          <h1>הכנה למבחן</h1>
        </div>
        <ExamCountdown p={progress} onSetDate={onSetDate} />
      </header>

      <section className="card today">
        {!done ? (
          <>
            <p className="eyebrow">האימון של היום</p>
            <h2>כ-10 דקות</h2>
            <p className="muted">
              {preview.lessons ? `${preview.lessons === 1 ? 'נושא חדש אחד' : `${preview.lessons} נושאים חדשים`} עם דוגמה פתורה, ו-` : ''}
              {preview.questions} שאלות מעורבבות מכל מה שלמדת.
            </p>
            <button type="button" className="btn primary wide" onClick={onDaily}>
              {Object.keys(progress.days).length ? 'התחל את האימון' : 'התחל את האימון הראשון'}
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">האימון של היום הושלם</p>
            <h2>
              {day.firstTry} מתוך {day.questions} <span className="muted small">נכון בניסיון הראשון היום</span>
            </h2>
            <p className="muted">מחר יחכו לך חזרות על מה שלמדת. אם בא לך, אפשר עוד סבב קצר עכשיו.</p>
            <button type="button" className="btn ghost wide" onClick={onExtra}>
              עוד סבב קצר
            </button>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>מוכנות לפי נושא</h2>
          <button type="button" className="link-btn" onClick={() => onNav('progress')}>
            פירוט
          </button>
        </div>
        <ul className="topics">
          {content.topics.map((t) => {
            const r = topicReadiness(content, progress, t.id)
            return (
              <li key={t.id}>
                <button type="button" className="topic-row" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
                  <span className="topic-name">{t.name}</span>
                  <span className={`badge lv-${r.label}`}>{READY_TEXT[r.label]}</span>
                </button>
                <div className="bar" aria-hidden="true">
                  <span className={`lv-${r.label}`} style={{ width: `${r.label === 'new' ? 0 : Math.max(6, r.pct)}%` }} />
                </div>
                {open === t.id && (
                  <ul className="skill-list">
                    {r.skills.map((s) => (
                      <li key={s.skill.id}>
                        <span>{s.skill.title}</span>
                        <span className="muted">{READY_TEXT[s.label]}{s.label !== 'new' && s.pct ? ` · ${s.pct}%` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
        <p className="muted small">המוכנות מחושבת לפי התשובות האחרונות בניסיון הראשון, לא לפי מספר האימונים.</p>
      </section>

      <section className="card">
        <h2>סימולציית מבחן</h2>
        <p className="muted">
          שאלות מכל הנושאים, בלי רמזים ובלי ניסיון נוסף, כמו במבחן. בלי הגבלת זמן.
          {left !== null && left <= 2 && left >= 0 ? ' זה הזמן המומלץ לעשות אותה.' : !seenAll ? ' מומלץ אחרי שעברת על כל הנושאים.' : ''}
        </p>
        {lastExam && (
          <p className="muted small">
            בפעם האחרונה: {lastExam.correct} מתוך {lastExam.total}.
          </p>
        )}
        <button type="button" className="btn ghost wide" onClick={onExam}>
          התחל סימולציה
        </button>
      </section>

      <nav className="home-nav" aria-label="עוד">
        <button type="button" className="nav-btn" onClick={() => onNav('library')}>
          סיכומי החומר
        </button>
        <button type="button" className="nav-btn" onClick={() => onNav('progress')}>
          התקדמות ושיתוף
        </button>
        <button type="button" className="nav-btn" onClick={() => onNav('settings')}>
          הגדרות
        </button>
      </nav>
    </main>
  )
}
