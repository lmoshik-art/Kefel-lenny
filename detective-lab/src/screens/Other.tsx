import { useEffect, useRef, useState } from 'react'
import type { Content, Progress, Settings } from '../types.ts'
import { LessonView } from './Session.tsx'
import { ExamCountdown, topicReadiness } from './Home.tsx'
import { READY_TEXT, dayKey, readiness, skillState } from '../engine/plan.ts'

export function Library({ content, skillId, onOpen, onBack }: { content: Content; skillId: string | null; onOpen: (id: string) => void; onBack: () => void }) {
  const skill = skillId ? content.skills.find((s) => s.id === skillId) : null
  if (skill) {
    return (
      <main className="screen">
        <button type="button" className="link-btn" onClick={onBack}>
          חזרה לסיכומים
        </button>
        <LessonView skill={skill} eyebrow="סיכום" />
      </main>
    )
  }
  return (
    <main className="screen">
      <h1 className="page-title">סיכומי החומר</h1>
      <p className="muted">לחזרה מהירה לפני אימון. הלמידה העיקרית קורית כשעונים על שאלות, לא כשקוראים.</p>
      {content.topics.map((t) => (
        <section key={t.id} className="card">
          <h2>{t.name}</h2>
          <ul className="lib-list">
            {content.skills
              .filter((s) => s.topic === t.id)
              .map((s) => (
                <li key={s.id}>
                  <button type="button" className="nav-btn" onClick={() => onOpen(s.id)}>
                    {s.title}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  )
}

function formatDay(d: string) {
  const [, m, day] = d.split('-')
  return `${Number(day)}.${Number(m)}`
}

export function reportText(content: Content, p: Progress): string {
  const days = Object.entries(p.days).sort(([a], [b]) => a.localeCompare(b))
  const q = days.reduce((s, [, d]) => s + d.questions, 0)
  const f = days.reduce((s, [, d]) => s + d.firstTry, 0)
  const lines = ['דוח הכנה למבחן במדעים', '']
  lines.push(`ימי אימון: ${days.length}${days.length ? ` (${days.map(([d]) => formatDay(d)).join(', ')})` : ''}`)
  lines.push(`שאלות: ${q}, מהן ${f} נכון בניסיון הראשון${q ? ` (${Math.round((f / q) * 100)}%)` : ''}`)
  lines.push('', 'מוכנות לפי נושא:')
  for (const t of content.topics) {
    const r = topicReadiness(content, p, t.id)
    lines.push(`${t.name}: ${READY_TEXT[r.label]}${r.label !== 'new' ? ` (${r.pct}%)` : ''}`)
  }
  const weak = content.skills.filter((s) => {
    const r = readiness(s, skillState(p, s.id))
    return r.label === 'started' && skillState(p, s.id).recent.length >= 2
  })
  if (weak.length) lines.push('', `כדאי לחזק: ${weak.map((s) => s.title).join(', ')}`)
  if (p.exams.length) {
    const e = p.exams[p.exams.length - 1]
    lines.push('', `סימולציית מבחן אחרונה: ${e.correct} מתוך ${e.total}`)
  }
  return lines.join('\n')
}

export function ProgressScreen({ content, progress, onBack }: { content: Content; progress: Progress; onBack: () => void }) {
  const [note, setNote] = useState('')
  const days = Object.entries(progress.days).sort(([a], [b]) => a.localeCompare(b))
  const c = progress.confidence
  const share = async () => {
    const text = reportText(content, progress)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'דוח הכנה למבחן', text })
        return
      }
      await navigator.clipboard.writeText(text)
      setNote('הדוח הועתק. אפשר להדביק אותו בוואטסאפ או במייל.')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setNote('לא ניתן לשתף אוטומטית במכשיר הזה.')
    }
  }
  return (
    <main className="screen">
      <button type="button" className="link-btn" onClick={onBack}>
        חזרה
      </button>
      <h1 className="page-title">התקדמות</h1>

      <section className="card">
        <h2>ימי אימון</h2>
        {days.length ? (
          <ul className="days">
            {days.map(([d, log]) => (
              <li key={d}>
                <span>{formatDay(d)}</span>
                <span className="muted">
                  {log.questions} שאלות · {log.firstTry} נכון בניסיון הראשון
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">עוד לא היה אימון.</p>
        )}
      </section>

      <section className="card">
        <h2>כמה אתה בטוח, וכמה אתה צודק</h2>
        <ul className="conf">
          <li>
            <b>{c.unsureRight}</b> פעמים לא היית בטוח, וצדקת.
          </li>
          <li>
            <b>{c.sureRight}</b> פעמים היית בטוח, וצדקת.
          </li>
          <li>
            <b>{c.sureWrong}</b> פעמים היית בטוח וטעית. הטעויות האלה חוזרות לתרגול, כי תיקון שלהן נזכר טוב במיוחד.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>מוכנות לפי מיומנות</h2>
        {content.topics.map((t) => (
          <div key={t.id} className="skill-group">
            <h3>{t.name}</h3>
            <ul className="skill-list">
              {content.skills
                .filter((s) => s.topic === t.id)
                .map((s) => {
                  const r = readiness(s, skillState(progress, s.id))
                  return (
                    <li key={s.id}>
                      <span>{s.title}</span>
                      <span className={`badge lv-${r.label}`}>
                        {READY_TEXT[r.label]}
                        {r.label !== 'new' && r.pct ? ` · ${r.pct}%` : ''}
                      </span>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </section>

      {progress.exams.length > 0 && (
        <section className="card">
          <h2>סימולציות מבחן</h2>
          <ul className="days">
            {progress.exams.map((e, i) => (
              <li key={i}>
                <span>{formatDay(e.date)}</span>
                <span className="muted">
                  {e.correct} מתוך {e.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>שיתוף עם ההורים</h2>
        <p className="muted">שולח סיכום קצר בוואטסאפ או במייל. הנתונים נשמרים רק במכשיר הזה.</p>
        <button type="button" className="btn primary wide" onClick={share}>
          שיתוף הדוח
        </button>
        {note && <p className="muted">{note}</p>}
      </section>
    </main>
  )
}

export function SettingsScreen({ progress, onSettings, onSetDate, onReset, onBack }: { progress: Progress; onSettings: (s: Settings) => void; onSetDate: (d: string | null) => void; onReset: () => void; onBack: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const s = progress.settings
  return (
    <main className="screen">
      <button type="button" className="link-btn" onClick={onBack}>
        חזרה
      </button>
      <h1 className="page-title">הגדרות</h1>
      <section className="card">
        <h2>תאריך המבחן</h2>
        <ExamCountdown p={progress} onSetDate={onSetDate} />
      </section>
      <section className="card">
        <h2>תצוגה</h2>
        <div className="seg n3" role="radiogroup" aria-label="ערכת צבעים">
          {(
            [
              ['auto', 'לפי המכשיר'],
              ['light', 'בהיר'],
              ['dark', 'כהה'],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={s.theme === v} className={`seg-btn ${s.theme === v ? 'on' : ''}`} onClick={() => onSettings({ ...s, theme: v })}>
              {label}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={s.reduceMotion} onChange={() => onSettings({ ...s, reduceMotion: !s.reduceMotion })} />
          <span>הפחתת תנועה</span>
        </label>
      </section>
      <section className="card">
        <h2>איפוס</h2>
        <p className="muted">מוחק את כל ההתקדמות במכשיר הזה.</p>
        {confirm ? (
          <div className="row">
            <button type="button" className="btn danger" onClick={onReset}>
              כן, לאפס
            </button>
            <button type="button" className="btn ghost" onClick={() => setConfirm(false)}>
              ביטול
            </button>
          </div>
        ) : (
          <button type="button" className="btn ghost" onClick={() => setConfirm(true)}>
            איפוס התקדמות
          </button>
        )}
      </section>
      <p className="muted small center">אין הרשמה ואין איסוף מידע אישי. הכול נשמר רק במכשיר.</p>
    </main>
  )
}

export function Onboarding({ progress, onSetDate, onStart }: { progress: Progress; onSetDate: (d: string | null) => void; onStart: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <main className="screen">
      <section className="card onboarding">
        <p className="eyebrow">מדעים · כיתה ז׳</p>
        <h1 ref={ref} tabIndex={-1}>
          הכנה למבחן, 10 דקות ביום
        </h1>
        <ul className="points">
          <li>
            <b>שאלות במקום קריאה.</b> לפי המחקר, לענות על שאלות ולחזור עליהן בכמה ימים שונים זו הדרך הכי יעילה להתכונן.
          </li>
          <li>
            <b>כל יום אימון קצר.</b> חזרות על מה שלמדת, ומדי פעם נושא חדש עם דוגמה פתורה.
          </li>
          <li>
            <b>״בטוח״ או ״לא בטוח״.</b> לפני כל בדיקה מסמנים. ככה רואים כמה אתה באמת יודע, וטעויות שהיית בטוח בהן חוזרות לתרגול.
          </li>
          <li>
            <b>טעות היא מידע, לא עונש.</b> מקבלים רמז, מנסים שוב, ושאלה דומה חוזרת בהמשך.
          </li>
        </ul>
        <ExamCountdown p={progress} onSetDate={onSetDate} />
        <button type="button" className="btn primary wide" onClick={onStart}>
          {progress.examDate ? 'מתחילים' : 'מתחילים (אפשר לקבוע תאריך אחר כך)'}
        </button>
        <p className="muted small">אין הרשמה. ההתקדמות נשמרת רק במכשיר הזה. היום: {dayKey().split('-').reverse().join('.')}</p>
      </section>
    </main>
  )
}
