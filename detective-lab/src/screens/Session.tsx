import { useMemo, useRef, useState } from 'react'
import type { Content, Outcome, Progress, RunItem, Skill } from '../types.ts'
import { QuestionCard } from '../components/QuestionCard.tsx'
import { AirChart, BalanceDemo, BoxDemo, CylinderDemo, DisplaceDemo } from '../components/Visuals.tsx'
import { Rich } from '../components/Rich.tsx'
import { addDays, dayKey, repeatItem, skillState } from '../engine/plan.ts'

export function LessonView({ skill, onDone, doneLabel = 'לתרגול', eyebrow = 'נושא חדש' }: { skill: Skill; onDone?: () => void; doneLabel?: string; eyebrow?: string }) {
  const [shown, setShown] = useState(0)
  const ex = skill.lesson.example
  return (
    <section className="card lesson" aria-labelledby={`l-${skill.id}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={`l-${skill.id}`}>{skill.title}</h2>
      <ul className="points">
        {skill.lesson.points.map((p, i) => (
          <li key={i}>
            <Rich text={p} />
          </li>
        ))}
      </ul>
      {skill.lesson.table && (
        <div className="table-wrap">
          <table className="facts">
            <thead>
              <tr>
                {skill.lesson.table.head.map((h) => (
                  <th key={h} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skill.lesson.table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} data-label={skill.lesson.table!.head[j]}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {skill.lesson.demo === 'balance' && <BalanceDemo />}
      {skill.lesson.demo === 'cylinder' && <CylinderDemo />}
      {skill.lesson.demo === 'air' && <AirChart interactive />}
      {skill.lesson.demo === 'box' && <BoxDemo />}
      {skill.lesson.demo === 'displace' && <DisplaceDemo />}

      <div className="worked">
        <p className="worked-title">דוגמה פתורה</p>
        <p className="worked-q">
          <Rich text={ex.prompt} />
        </p>
        <ol className="steps">
          {ex.steps.slice(0, shown).map((s, i) => (
            <li key={i}>
              <Rich text={s} />
            </li>
          ))}
        </ol>
        {shown < ex.steps.length ? (
          <button type="button" className="btn ghost" onClick={() => setShown(shown + 1)}>
            {shown === 0 ? 'הצג את הצעד הראשון' : 'הצעד הבא'}
          </button>
        ) : null}
      </div>
      {onDone && (
        <button type="button" className="btn primary wide" onClick={onDone} disabled={shown < ex.steps.length}>
          {shown < ex.steps.length ? 'עבור על כל צעדי הדוגמה כדי להמשיך' : doneLabel}
        </button>
      )}
    </section>
  )
}

interface Props {
  content: Content
  progress: Progress
  items: RunItem[]
  mode: 'daily' | 'extra' | 'exam'
  onOutcome: (o: Outcome) => void
  onLessonSeen: (skillId: string) => void
  onFinish: (outcomes: Outcome[]) => void
  onExit: () => void
}

export function Session({ content, progress, items, mode, onOutcome, onLessonSeen, onFinish, onExit }: Props) {
  const [queue, setQueue] = useState<RunItem[]>(items)
  const [idx, setIdx] = useState(0)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [finished, setFinished] = useState(false)
  const startLevels = useRef(Object.fromEntries(content.skills.map((s) => [s.id, skillState(progress, s.id).level])))
  const progressRef = useRef(progress)
  progressRef.current = progress
  const topRef = useRef<HTMLDivElement>(null)

  const skillOf = (id: string) => content.skills.find((s) => s.id === id)!
  const item = queue[idx]
  const qTotal = queue.filter((i) => i.kind === 'question').length
  const qDone = queue.slice(0, idx).filter((i) => i.kind === 'question').length

  const next = () => {
    if (idx + 1 >= queue.length) {
      setFinished(true)
      onFinish(outcomes)
    } else setIdx(idx + 1)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: 'start' }))
  }

  if (finished) {
    return <Summary content={content} progress={progress} outcomes={outcomes} mode={mode} startLevels={startLevels.current} onExit={onExit} />
  }

  return (
    <main className="screen session" ref={topRef}>
      <div className="session-head">
        <button type="button" className="link-btn" onClick={onExit}>
          יציאה
        </button>
        <span className="muted">
          {mode === 'exam' ? 'סימולציית מבחן' : 'אימון'} · שאלה {Math.min(qDone + 1, qTotal)} מתוך {qTotal}
        </span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${(qDone / Math.max(1, qTotal)) * 100}%` }} />
      </div>
      {item.kind === 'lesson' ? (
        <LessonView
          key={`lesson-${item.skillId}-${idx}`}
          skill={skillOf(item.skillId)}
          onDone={() => {
            onLessonSeen(item.skillId)
            next()
          }}
        />
      ) : (
        <>
          <p className="topic-tag">
            {skillOf(item.skillId).title}
            {item.repeat ? ' · שאלה חוזרת' : ''}
          </p>
          <QuestionCard
            key={`${item.q.id}-${idx}`}
            q={item.q}
            mode={mode === 'exam' ? 'exam' : 'practice'}
            scaffold={item.scaffold}
            isLast={idx + 1 >= queue.length}
            onNext={next}
            onResult={(r) => {
              const o: Outcome = { skillId: item.skillId, qid: item.q.id, firstTry: r.firstTry, solved: r.solved, sure: r.sure, repeat: !!item.repeat, warmup: !!item.warmup, exam: mode === 'exam' }
              setOutcomes((os) => [...os, o])
              onOutcome(o)
              // אחרי טעות, שאלה מקבילה חוזרת כמה שאלות אחר כך
              if (mode !== 'exam' && !r.firstTry && !item.repeat) {
                const rep = repeatItem(content, progressRef.current, item.skillId, item.q.id, Math.random)
                setQueue((qq) => {
                  const at = Math.min(qq.length, idx + 4)
                  return [...qq.slice(0, at), rep, ...qq.slice(at)]
                })
              }
            }}
          />
        </>
      )}
    </main>
  )
}

function Summary({ content, progress, outcomes, mode, startLevels, onExit }: { content: Content; progress: Progress; outcomes: Outcome[]; mode: Props['mode']; startLevels: Record<string, number>; onExit: () => void }) {
  const main = outcomes.filter((o) => !o.repeat)
  const first = main.filter((o) => o.firstTry).length
  const second = main.filter((o) => !o.firstTry && o.solved).length
  const unsureRight = outcomes.filter((o) => !o.sure && o.firstTry).length
  const sureWrong = outcomes.filter((o) => o.sure && !o.firstTry)
  const leveled = content.skills.filter((s) => skillState(progress, s.id).level > (startLevels[s.id] ?? 1))
  const tomorrow = addDays(dayKey(), 1)
  const dueTomorrow = content.skills.filter((s) => {
    const st = skillState(progress, s.id)
    return st.seen && st.due !== null && st.due <= tomorrow
  }).length
  const byTopic = useMemo(() => {
    const t: Record<string, { c: number; n: number }> = {}
    for (const o of main) {
      const topic = content.skills.find((s) => s.id === o.skillId)!.topic
      t[topic] = t[topic] ?? { c: 0, n: 0 }
      t[topic].n++
      if (o.firstTry) t[topic].c++
    }
    return t
  }, [main, content])
  const name = (id: string) => content.skills.find((s) => s.id === id)!.title

  return (
    <main className="screen">
      <section className="card summary">
        <p className="eyebrow">{mode === 'exam' ? 'סימולציית מבחן' : 'סיכום האימון'}</p>
        <h1 className="big-stat">
          {first} <span>מתוך {main.length} נכון בניסיון הראשון</span>
        </h1>
        {mode !== 'exam' && second > 0 && <p>עוד {second} תיקנת בעצמך בניסיון השני.</p>}

        {mode === 'exam' && (
          <ul className="topic-results">
            {content.topics
              .filter((t) => byTopic[t.id])
              .map((t) => (
                <li key={t.id}>
                  <span>{t.name}</span>
                  <b>
                    {byTopic[t.id].c} / {byTopic[t.id].n}
                  </b>
                </li>
              ))}
          </ul>
        )}

        {unsureRight > 0 && (
          <p className="insight">
            <b>{unsureRight === 1 ? 'פעם אחת' : `${unsureRight} פעמים`} סימנת ״לא בטוח״ וצדקת.</b> אתה יודע יותר ממה שנראה לך.
          </p>
        )}
        {sureWrong.length > 0 && (
          <p className="insight">
            היו {sureWrong.length === 1 ? 'טעות אחת' : `${sureWrong.length} טעויות`} שבהן היית בטוח: {[...new Set(sureWrong.map((o) => name(o.skillId)))].join(', ')}. אלה בדיוק הטעויות שהכי שווה לתקן, והן יחזרו בימים הקרובים.
          </p>
        )}
        {leveled.length > 0 && (
          <p className="insight">
            עלית רמה ב{leveled.map((s) => `״${s.title}״`).join(', ')}, אחרי שתי תשובות נכונות ברצף.
          </p>
        )}
        {mode !== 'exam' && <p className="muted">למחר מתוכננות חזרות ב-{dueTomorrow} נושאים. החזרה המרווחת היא מה שמקבע את החומר.</p>}
        <button type="button" className="btn primary wide" onClick={onExit}>
          חזרה למסך הראשי
        </button>
      </section>
    </main>
  )
}
