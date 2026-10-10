import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChoiceQ, MatchQ, NumberQ, OrderQ, Question, SortQ } from '../types.ts'
import { VisualView } from './Visuals.tsx'
import { Rich } from './Rich.tsx'
import { fmt, parseNumber, sameNumber } from '../engine/format.ts'

/** ערבוב יציב לפי מזהה השאלה, כדי שהסדר לא ישתנה בין רינדורים */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export type Phase = 'answer' | 'retry' | 'correct' | 'revealed'

/** כל סוג שאלה מחזיר בודק תשובה, כדי שהכפתורים יהיו משותפים */
type Checker = () => { ready: boolean; correct: boolean; info?: string }

interface ViewProps<T> {
  q: T
  locked: boolean
  reveal: boolean
  register: (c: Checker) => void
  onChange: () => void
}

function ChoiceView({ q, locked, reveal, register, onChange }: ViewProps<ChoiceQ>) {
  const order = useMemo(() => seededShuffle(q.options.map((_, i) => i), q.id), [q])
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number[]>([])
  register(() => {
    if (picked === null) return { ready: false, correct: false }
    const ok = picked === q.correct
    if (!ok) setWrong((w) => [...w, picked])
    return { ready: true, correct: ok }
  })
  return (
    <div className="choices" role="radiogroup" aria-label="אפשרויות תשובה">
      {order.map((i) => {
        const cls = [
          'choice',
          picked === i ? 'picked' : '',
          wrong.includes(i) ? 'wrong' : '',
          (reveal || (locked && picked === i)) && i === q.correct ? 'right' : '',
        ].join(' ')
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={picked === i}
            className={cls}
            disabled={locked || wrong.includes(i)}
            onClick={() => {
              setPicked(i)
              onChange()
            }}
          >
            <Rich text={q.options[i]} />
          </button>
        )
      })}
    </div>
  )
}

function SortView({ q, locked, reveal, register, onChange }: ViewProps<SortQ>) {
  const items = useMemo(() => seededShuffle(q.items, q.id), [q])
  const [assign, setAssign] = useState<Record<string, string>>({})
  const [marked, setMarked] = useState<string[]>([])
  register(() => {
    if (!items.every((it) => assign[it.text])) return { ready: false, correct: false }
    const bad = items.filter((it) => assign[it.text] !== it.cat).map((it) => it.text)
    setMarked(bad)
    return { ready: true, correct: !bad.length, info: bad.length ? `${bad.length === 1 ? 'פריט אחד לא במקום' : `${bad.length} פריטים לא במקום`}. הם מסומנים.` : undefined }
  })
  return (
    <ul className="sort-list">
      {items.map((it) => (
        <li key={it.text} className={`sort-row ${marked.includes(it.text) ? 'wrong' : ''}`}>
          <span className="sort-item">{it.text}</span>
          <span className={`seg n${q.categories.length}`} role="radiogroup" aria-label={it.text}>
            {q.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={assign[it.text] === c.id}
                disabled={locked}
                className={`seg-btn ${assign[it.text] === c.id ? 'on' : ''} ${reveal && it.cat === c.id ? 'truth' : ''}`}
                onClick={() => {
                  setAssign({ ...assign, [it.text]: c.id })
                  setMarked(marked.filter((m) => m !== it.text))
                  onChange()
                }}
              >
                {c.label}
              </button>
            ))}
          </span>
          {reveal && assign[it.text] !== it.cat && <span className="truth-note">נכון: {q.categories.find((c) => c.id === it.cat)?.label}</span>}
        </li>
      ))}
    </ul>
  )
}

function MatchView({ q, locked, reveal, register, onChange }: ViewProps<MatchQ>) {
  const rights = useMemo(() => seededShuffle(q.pairs.map((p) => p.right), q.id), [q])
  const [sel, setSel] = useState<Record<string, string>>({})
  const [marked, setMarked] = useState<string[]>([])
  register(() => {
    if (!q.pairs.every((p) => sel[p.left])) return { ready: false, correct: false }
    const bad = q.pairs.filter((p) => sel[p.left] !== p.right).map((p) => p.left)
    setMarked(bad)
    return { ready: true, correct: !bad.length, info: bad.length ? `${bad.length === 1 ? 'התאמה אחת לא נכונה' : `${bad.length} התאמות לא נכונות`}. הן מסומנות.` : undefined }
  })
  return (
    <ul className="match-list">
      {q.pairs.map((p, i) => (
        <li key={p.left} className={`match-row ${marked.includes(p.left) ? 'wrong' : ''}`}>
          <label htmlFor={`m-${q.id}-${i}`} className="match-left">{p.left}</label>
          <select
            id={`m-${q.id}-${i}`}
            value={sel[p.left] ?? ''}
            disabled={locked}
            onChange={(e) => {
              setSel({ ...sel, [p.left]: e.target.value })
              setMarked(marked.filter((m) => m !== p.left))
              onChange()
            }}
          >
            <option value="">בחר...</option>
            {rights.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {reveal && sel[p.left] !== p.right && <span className="truth-note">נכון: {p.right}</span>}
        </li>
      ))}
    </ul>
  )
}

function NumberView({ q, locked, reveal, register, onChange }: ViewProps<NumberQ>) {
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!locked) ref.current?.focus({ preventScroll: true })
  }, [locked])
  register(() => {
    if (!raw.trim()) return { ready: false, correct: false }
    const n = parseNumber(raw)
    if (n === null) {
      setErr('כתוב מספר בלבד, למשל 1500 או 0.5')
      return { ready: false, correct: false }
    }
    setErr('')
    return { ready: true, correct: sameNumber(n, q.value) }
  })
  return (
    <div className="number-form">
      <label htmlFor={`n-${q.id}`} className="sr-only">התשובה שלך</label>
      <div className="number-row">
        <input
          id={`n-${q.id}`}
          ref={ref}
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={raw}
          disabled={locked}
          onChange={(e) => {
            setRaw(e.target.value)
            onChange()
          }}
        />
        {q.unit && <span className="unit">{q.unit}</span>}
      </div>
      {err && <p className="input-error">{err}</p>}
      {reveal && <p className="truth-note">התשובה: <bdi dir="ltr">{fmt(q.value)}</bdi> {q.unit}</p>}
    </div>
  )
}

function OrderView({ q, locked, reveal, register, onChange }: ViewProps<OrderQ>) {
  const initial = useMemo(() => {
    let o = seededShuffle(q.items, q.id)
    if (o.every((x, i) => x === q.items[i])) o = [...o.slice(1), o[0]]
    return o
  }, [q])
  const [list, setList] = useState(initial)
  const [wrongAt, setWrongAt] = useState<number[]>([])
  register(() => {
    const bad = list.map((x, i) => (x === q.items[i] ? -1 : i)).filter((i) => i >= 0)
    setWrongAt(bad)
    return { ready: true, correct: !bad.length, info: bad.length ? `${bad.length} פריטים לא במקום הנכון. הם מסומנים.` : undefined }
  })
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    setList(next)
    setWrongAt([])
    onChange()
  }
  return (
    <div className="order">
      <p className="order-end">{q.ends[0]}</p>
      <ol className="order-list">
        {list.map((x, i) => (
          <li key={x} className={`order-row ${wrongAt.includes(i) ? 'wrong' : ''}`}>
            <span className="order-text">{x}</span>
            <span className="order-btns">
              <button type="button" className="icon-btn" disabled={locked || i === 0} onClick={() => move(i, -1)} aria-label={`הזז למעלה: ${x}`}>▲</button>
              <button type="button" className="icon-btn" disabled={locked || i === list.length - 1} onClick={() => move(i, 1)} aria-label={`הזז למטה: ${x}`}>▼</button>
            </span>
          </li>
        ))}
      </ol>
      <p className="order-end">{q.ends[1]}</p>
      {reveal && <p className="truth-note">הסדר הנכון: {q.items.join(', ')}</p>}
    </div>
  )
}

interface CardProps {
  q: Question
  mode: 'practice' | 'exam'
  scaffold?: boolean
  onResult: (r: { firstTry: boolean; solved: boolean; sure: boolean }) => void
  onNext: () => void
  isLast: boolean
}

export function QuestionCard({ q, mode, scaffold, onResult, onNext, isLast }: CardProps) {
  const [phase, setPhase] = useState<Phase>('answer')
  const [sure, setSure] = useState(true)
  const [info, setInfo] = useState<string | undefined>()
  const [needAnswer, setNeedAnswer] = useState(false)
  const checker = useRef<Checker>(() => ({ ready: false, correct: false }))
  const feedbackRef = useRef<HTMLDivElement>(null)
  // חשיפת השאלה הנוכחית לבדיקות אוטומטיות בדפדפן
  ;(window as unknown as { __q?: Question }).__q = q
  const register = (c: Checker) => {
    checker.current = c
  }

  useEffect(() => {
    if (phase !== 'answer') feedbackRef.current?.focus()
  }, [phase])

  const check = (isSure: boolean) => {
    const r = checker.current()
    if (!r.ready) {
      setNeedAnswer(true)
      return
    }
    setNeedAnswer(false)
    setInfo(r.info)
    if (phase === 'answer') setSure(isSure)
    const s = phase === 'answer' ? isSure : sure
    if (r.correct) {
      setPhase('correct')
      onResult({ firstTry: phase === 'answer', solved: true, sure: s })
    } else if (phase === 'answer' && mode === 'practice') {
      setPhase('retry')
    } else {
      setPhase('revealed')
      onResult({ firstTry: false, solved: false, sure: s })
    }
  }

  const locked = phase === 'correct' || phase === 'revealed'
  const props = { locked, reveal: phase === 'revealed', register, onChange: () => setNeedAnswer(false) }

  return (
    <>
      <section className="card question" aria-labelledby={`q-${q.id}`}>
        <h2 id={`q-${q.id}`} className="q-prompt">
          <Rich text={q.prompt} />
        </h2>
        {q.visual && <VisualView visual={q.visual} />}
        {scaffold && phase === 'answer' && q.hint && (
          <p className="scaffold">
            <b>תזכורת מהדוגמה:</b> <Rich text={q.hint} />
          </p>
        )}
        {q.type === 'choice' && <ChoiceView q={q} {...props} />}
        {q.type === 'sort' && <SortView q={q} {...props} />}
        {q.type === 'match' && <MatchView q={q} {...props} />}
        {q.type === 'number' && <NumberView q={q} {...props} />}
        {q.type === 'order' && <OrderView q={q} {...props} />}

        {!locked && (
          <div className="check-row">
            {phase === 'answer' ? (
              <>
                <button type="button" className="btn primary" onClick={() => check(true)}>
                  בדיקה: אני בטוח
                </button>
                <button type="button" className="btn ghost" onClick={() => check(false)}>
                  בדיקה: לא בטוח
                </button>
              </>
            ) : (
              <button type="button" className="btn primary" onClick={() => check(sure)}>
                בדיקה
              </button>
            )}
          </div>
        )}
        {needAnswer && <p className="input-error">צריך להשלים תשובה לפני הבדיקה.</p>}
      </section>

      {phase !== 'answer' && (
        <div className={`feedback ${phase}`} ref={feedbackRef} tabIndex={-1} role="status" aria-live="polite">
          {phase === 'correct' && (
            <>
              <p className="fb-title">{sure ? 'נכון.' : 'נכון, למרות שלא היית בטוח.'}</p>
              <p>
                <Rich text={q.explain} />
              </p>
            </>
          )}
          {phase === 'retry' && (
            <>
              <p className="fb-title">לא מדויק. יש ניסיון נוסף.</p>
              {info && <p>{info}</p>}
              <p>
                <b>רמז:</b> <Rich text={q.hint ?? 'קרא שוב את השאלה ובדוק כל נתון.'} />
              </p>
            </>
          )}
          {phase === 'revealed' && (
            <>
              <p className="fb-title">{mode === 'exam' ? 'לא נכון. ככה פותרים:' : sure ? 'טעות בביטחון. שים לב לפתרון, נחזור לזה:' : 'ככה פותרים:'}</p>
              {q.steps ? (
                <ol className="steps">
                  {q.steps.map((s, i) => (
                    <li key={i}>
                      <Rich text={s} />
                    </li>
                  ))}
                </ol>
              ) : (
                <p>
                  <Rich text={q.explain} />
                </p>
              )}
              {mode === 'practice' && <p className="muted">שאלה דומה תחזור בהמשך האימון.</p>}
            </>
          )}
          {locked && (
            <button type="button" className="btn primary" onClick={onNext} autoFocus>
              {isLast ? 'לסיכום' : 'הבא'}
            </button>
          )}
        </div>
      )}
    </>
  )
}
