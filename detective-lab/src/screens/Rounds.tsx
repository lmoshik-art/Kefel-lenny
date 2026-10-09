import { useMemo, useState } from 'react'
import type { Content, Progress, RunTask, TaskResult, TopicId } from '../types'
import { TaskRunner } from '../components/TaskRunner'
import { Rich } from '../components/Rich'
import { LEVEL_LABEL, TOPIC_ORDER, topicLevel } from '../storage'

type Tally = Partial<Record<TopicId, { correct: number; total: number }>>

export function tally(results: TaskResult[], firstTryOnly = true): Tally {
  const t: Tally = {}
  for (const r of results) {
    if (r.repeat) continue
    const cur = t[r.topic] ?? { correct: 0, total: 0 }
    cur.total++
    if (firstTryOnly ? r.firstTry : r.solved) cur.correct++
    t[r.topic] = cur
  }
  return t
}

function TallyTable({ t, content, onPractice }: { t: Tally; content: Content; onPractice: (topic: TopicId) => void }) {
  return (
    <table className="tally">
      <caption className="sr-only">תוצאות לפי נושא</caption>
      <thead>
        <tr>
          <th scope="col">נושא</th>
          <th scope="col">נכון בניסיון הראשון</th>
          <th scope="col">המלצה</th>
        </tr>
      </thead>
      <tbody>
        {TOPIC_ORDER.filter((k) => t[k]).map((k) => {
          const v = t[k]!
          const full = v.correct === v.total
          return (
            <tr key={k}>
              <th scope="row">{content.topics[k]}</th>
              <td>
                {v.correct} מתוך {v.total}
              </td>
              <td>
                {full ? (
                  'נראה טוב'
                ) : (
                  <button type="button" className="link-btn inline" onClick={() => onPractice(k)}>
                    לתרגול בתיק
                  </button>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

interface RoundProps {
  content: Content
  progress: Progress
  onDone: (results: TaskResult[]) => void
  onPractice: (topic: TopicId) => void
  onHome: () => void
}

/** סבב בדיקת ראיות: שתי משימות מכל נושא, בבחירה אקראית מהתיקים */
export function EvidenceRound({ content, progress, onDone, onPractice, onHome }: RoundProps) {
  const [round, setRound] = useState(0)
  const tasks: RunTask[] = useMemo(() => {
    const out: RunTask[] = []
    for (const c of content.cases) {
      const pool = [...c.tasks].sort(() => Math.random() - 0.5).slice(0, 2)
      for (const t of pool) {
        const pick = t.twin && Math.random() < 0.5 ? { ...t.twin, twin: t } : t
        out.push({ ...pick, topic: c.topic } as RunTask)
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, round])
  const [results, setResults] = useState<TaskResult[] | null>(null)

  if (results) {
    const t = tally(results)
    return (
      <main className="screen">
        <h1 className="case-title">תוצאות בדיקת הראיות</h1>
        <div className="paper">
          <p>כך נראית ההבנה שלך בכל נושא, לפי תשובות בניסיון הראשון:</p>
          <TallyTable t={t} content={content} onPractice={onPractice} />
        </div>
        <div className="row center">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setResults(null)
              setRound(round + 1)
            }}
          >
            סבב חדש
          </button>
          <button type="button" className="btn primary" onClick={onHome}>
            חזרה למשרד
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="screen">
      <h1 className="case-title">בדיקת ראיות: מה אני כבר יודע?</h1>
      <TaskRunner
        key={round}
        tasks={tasks}
        mode="practice"
        sound={progress.settings.sound}
        topicNames={content.topics}
        onExit={onHome}
        onFinish={(r) => {
          setResults(r)
          onDone(r)
        }}
      />
    </main>
  )
}

/** הבוחן המסכם: רק החומר הזמין באפליקציה. בכל ניסיון שני מוצגות השאלות המקבילות */
export function Quiz({ content, progress, onDone, onPractice, onHome }: RoundProps) {
  const [attempt, setAttempt] = useState(progress.quiz.attempts)
  const [results, setResults] = useState<TaskResult[] | null>(null)
  const tasks: RunTask[] = useMemo(
    () => content.quiz.map((q) => (attempt % 2 === 1 && q.twin ? { ...q.twin, topic: q.topic } : { ...q, twin: undefined })) as RunTask[],
    [content, attempt],
  )

  if (results) {
    const t = tally(results)
    const correct = results.filter((r) => r.firstTry).length
    const wrong = results.filter((r) => !r.firstTry)
    return (
      <main className="screen">
        <h1 className="case-title">תוצאות הבוחן המסכם</h1>
        <div className="paper">
          <p className="big-number">
            {correct} מתוך {results.length}
          </p>
          <p>הציון אינו כולל את אזורי המעבדה שממתינים לחומר מהמחברת.</p>
          <TallyTable t={t} content={content} onPractice={onPractice} />
        </div>
        {wrong.length > 0 && (
          <div className="paper">
            <h2>שאלות שכדאי לחזור עליהן</h2>
            <ul className="clean-list">
              {wrong.map((r) => {
                const task = tasks.find((x) => x.id === r.taskId)
                return task ? (
                  <li key={r.taskId}>
                    <b>{task.prompt}</b>
                    <br />
                    <Rich text={task.explain} />
                  </li>
                ) : null
              })}
            </ul>
          </div>
        )}
        <div className="row center">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setResults(null)
              setAttempt(attempt + 1)
            }}
          >
            בוחן חוזר (שאלות מקבילות)
          </button>
          <button type="button" className="btn primary" onClick={onHome}>
            חזרה למשרד
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="screen">
      <h1 className="case-title">בוחן מסכם</h1>
      <p className="note center">שאלה אחת בכל פעם, בלי הגבלת זמן. אחרי כל תשובה יוצג הסבר קצר.</p>
      <TaskRunner
        key={attempt}
        tasks={tasks}
        mode="quiz"
        sound={progress.settings.sound}
        topicNames={content.topics}
        onExit={onHome}
        onFinish={(r) => {
          setResults(r)
          onDone(r)
        }}
      />
    </main>
  )
}

export function Report({ content, progress, onPractice, onHome }: { content: Content; progress: Progress; onPractice: (topic: TopicId) => void; onHome: () => void }) {
  return (
    <main className="screen">
      <h1 className="case-title">הבנה לפי נושאים</h1>
      <div className="paper">
        <p>
          הדוח מבוסס על 12 התשובות האחרונות בכל נושא, בניסיון הראשון, מכל התיקים, מבדיקות הראיות ומהבוחן. פענוח התעלומה לבדו אינו מעיד על שליטה בחומר.
        </p>
        <ul className="mastery">
          {TOPIC_ORDER.map((k) => {
            const lv = topicLevel(progress.topicHistory[k])
            return (
              <li key={k} className={`mastery-row lv-${lv.level}`}>
                <div className="mastery-head">
                  <b>{content.topics[k]}</b>
                  <span>{LEVEL_LABEL[lv.level]}</span>
                </div>
                <div className="bar" role="img" aria-label={lv.level === 'none' ? 'אין מספיק נתונים' : `${lv.pct} אחוז נכון בניסיון הראשון`}>
                  <span style={{ width: `${lv.level === 'none' ? 0 : lv.pct}%` }} />
                </div>
                <div className="mastery-foot">
                  <small>{lv.n ? `${lv.n} תשובות נבדקו${lv.level !== 'none' ? `, ${lv.pct}% נכון בניסיון הראשון` : ''}` : 'עוד לא נפתרו משימות בנושא'}</small>
                  <button type="button" className="link-btn inline" onClick={() => onPractice(k)}>
                    לתיק
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="note">מעבדות המסה, הנפח והפד״ח ממתינות לחומר מהמחברת ואינן נכללות בדוח.</p>
      </div>
      <div className="row center">
        <button type="button" className="btn primary" onClick={onHome}>
          חזרה למשרד
        </button>
      </div>
    </main>
  )
}
