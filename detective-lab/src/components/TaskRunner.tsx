import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChoiceTask, MatchTask, NumberTask, RunTask, SortTask, TaskCore, TaskResult } from '../types'
import { VisualView, fmt } from './Visuals'
import { playCorrect, playTryAgain } from '../sound'
import { Rich } from './Rich'

/** ערבוב יציב לפי מזהה המשימה, כדי שהסדר לא ישתנה בין רינדורים */
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

export function parseNumber(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null
  return Number(t)
}

type Status = 'answering' | 'hint' | 'correct' | 'revealed'

interface ViewProps<T> {
  task: T
  locked: boolean
  reveal: boolean
  onCheck: (correct: boolean, info?: string) => void
}

function ChoiceView({ task, locked, reveal, onCheck }: ViewProps<ChoiceTask>) {
  const order = useMemo(() => seededShuffle(task.options.map((_, i) => i), task.id), [task])
  const [picked, setPicked] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number[]>([])
  return (
    <div className="choices" role="group" aria-label="אפשרויות תשובה">
      {order.map((i, pos) => {
        const isCorrect = i === task.correct
        const cls = [
          'choice',
          picked === i && locked && isCorrect ? 'right' : '',
          wrong.includes(i) ? 'wrong' : '',
          reveal && isCorrect ? 'right' : '',
        ].join(' ')
        return (
          <button
            key={i}
            type="button"
            className={cls}
            disabled={locked || wrong.includes(i)}
            onClick={() => {
              setPicked(i)
              if (!isCorrect) setWrong([...wrong, i])
              onCheck(isCorrect)
            }}
          >
            <span className="choice-letter" aria-hidden="true">{'אבגד'[pos]}</span>
            <span>{task.options[i]}</span>
          </button>
        )
      })}
    </div>
  )
}

function SortView({ task, locked, reveal, onCheck }: ViewProps<SortTask>) {
  const items = useMemo(() => seededShuffle(task.items, task.id), [task])
  const [assign, setAssign] = useState<Record<string, string>>({})
  const [marked, setMarked] = useState<string[]>([])
  const complete = items.every((it) => assign[it.text])
  return (
    <>
      <ul className="sort-list">
        {items.map((it) => (
          <li key={it.text} className={`sort-row ${marked.includes(it.text) ? 'wrong' : ''} ${reveal ? 'revealed' : ''}`}>
            <span className="sort-item">{it.text}</span>
            <span className="seg" role="radiogroup" aria-label={`סיווג: ${it.text}`}>
              {task.categories.map((c) => {
                const on = assign[it.text] === c.id
                const show = reveal && it.cat === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={locked}
                    className={`seg-btn ${on ? 'on' : ''} ${show ? 'truth' : ''}`}
                    onClick={() => {
                      setAssign({ ...assign, [it.text]: c.id })
                      setMarked(marked.filter((m) => m !== it.text))
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </span>
            {reveal && assign[it.text] !== it.cat && (
              <span className="truth-note">נכון: {task.categories.find((c) => c.id === it.cat)?.label}</span>
            )}
          </li>
        ))}
      </ul>
      {!locked && (
        <button
          type="button"
          className="btn primary"
          disabled={!complete}
          onClick={() => {
            const bad = items.filter((it) => assign[it.text] !== it.cat).map((it) => it.text)
            setMarked(bad)
            onCheck(bad.length === 0, bad.length ? `${bad.length} ${bad.length === 1 ? 'פריט אינו' : 'פריטים אינם'} במקום, והם מסומנים.` : undefined)
          }}
        >
          {complete ? 'בדוק את המיון' : 'מיין את כל הפריטים כדי לבדוק'}
        </button>
      )}
    </>
  )
}

function MatchView({ task, locked, reveal, onCheck }: ViewProps<MatchTask>) {
  const rights = useMemo(() => seededShuffle(task.pairs.map((p) => p.right), task.id), [task])
  const [sel, setSel] = useState<Record<string, string>>({})
  const [marked, setMarked] = useState<string[]>([])
  const complete = task.pairs.every((p) => sel[p.left])
  return (
    <>
      <ul className="match-list">
        {task.pairs.map((p, i) => (
          <li key={p.left} className={`match-row ${marked.includes(p.left) ? 'wrong' : ''}`}>
            <label htmlFor={`m-${task.id}-${i}`} className="match-left">{p.left}</label>
            <select
              id={`m-${task.id}-${i}`}
              value={sel[p.left] ?? ''}
              disabled={locked}
              onChange={(e) => {
                setSel({ ...sel, [p.left]: e.target.value })
                setMarked(marked.filter((m) => m !== p.left))
              }}
            >
              <option value="">בחר...</option>
              {rights.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {reveal && <span className="truth-note">נכון: {p.right}</span>}
          </li>
        ))}
      </ul>
      {!locked && (
        <button
          type="button"
          className="btn primary"
          disabled={!complete}
          onClick={() => {
            const bad = task.pairs.filter((p) => sel[p.left] !== p.right).map((p) => p.left)
            setMarked(bad)
            onCheck(bad.length === 0, bad.length ? `${bad.length} ${bad.length === 1 ? 'התאמה אינה נכונה' : 'התאמות אינן נכונות'}, והן מסומנות.` : undefined)
          }}
        >
          {complete ? 'בדוק את ההתאמות' : 'השלם את כל ההתאמות כדי לבדוק'}
        </button>
      )}
    </>
  )
}

function NumberView({ task, locked, reveal, onCheck }: ViewProps<NumberTask>) {
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!locked) inputRef.current?.focus({ preventScroll: true })
  }, [locked])
  const submit = () => {
    const n = parseNumber(raw)
    if (n === null) {
      setErr('כתוב מספר בלבד, למשל 125 או 0.5')
      return
    }
    setErr('')
    onCheck(Math.abs(n - task.value) < 1e-9)
  }
  return (
    <form
      className="number-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!locked) submit()
      }}
    >
      <label htmlFor={`n-${task.id}`} className="sr-only">התשובה שלך</label>
      <div className="number-row">
        <input
          id={`n-${task.id}`}
          ref={inputRef}
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={raw}
          disabled={locked}
          onChange={(e) => setRaw(e.target.value)}
          aria-describedby={err ? `e-${task.id}` : undefined}
        />
        {task.unit && <span className="unit">{task.unit}</span>}
        {!locked && (
          <button type="submit" className="btn primary" disabled={!raw.trim()}>
            בדוק
          </button>
        )}
      </div>
      {err && <p id={`e-${task.id}`} className="input-error">{err}</p>}
      {reveal && (
        <p className="truth-note">
          התשובה הנכונה: {fmt(task.value)} {task.unit}
        </p>
      )}
    </form>
  )
}

function TaskBody(props: ViewProps<TaskCore>) {
  const { task } = props
  if (task.type === 'choice') return <ChoiceView {...props} task={task} />
  if (task.type === 'sort') return <SortView {...props} task={task} />
  if (task.type === 'match') return <MatchView {...props} task={task} />
  return <NumberView {...props} task={task} />
}

const TYPE_LABEL: Record<TaskCore['type'], string> = {
  choice: 'בחירה',
  sort: 'מיון',
  match: 'התאמה',
  number: 'חישוב וקריאה',
}

interface RunnerProps {
  tasks: RunTask[]
  mode: 'practice' | 'quiz'
  sound: boolean
  topicNames: Record<string, string>
  onFinish: (results: TaskResult[]) => void
  onExit: () => void
}

export function TaskRunner({ tasks, mode, sound, topicNames, onFinish, onExit }: RunnerProps) {
  const [queue, setQueue] = useState<RunTask[]>(tasks)
  const [idx, setIdx] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState<Status>('answering')
  const [info, setInfo] = useState<string | undefined>()
  const [results, setResults] = useState<TaskResult[]>([])
  const [addedTwin, setAddedTwin] = useState(false)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const task = queue[idx]

  useEffect(() => {
    if (status !== 'answering') feedbackRef.current?.focus()
  }, [status, attempts])

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [idx])

  const record = (firstTry: boolean, solved: boolean) =>
    setResults((r) => [...r, { taskId: task.id, topic: task.topic, firstTry, solved, repeat: !!task.repeat, takeaway: task.takeaway }])

  const onCheck = (correct: boolean, detail?: string) => {
    setInfo(detail)
    if (correct) {
      if (sound) playCorrect()
      setStatus('correct')
      record(attempts === 0, true)
      return
    }
    if (sound) playTryAgain()
    if (mode === 'practice' && attempts === 0) {
      setAttempts(1)
      setStatus('hint')
      return
    }
    setStatus('revealed')
    record(false, false)
    if (mode === 'practice' && task.twin && !task.repeat) {
      setQueue((q) => [...q, { ...task.twin!, topic: task.topic, repeat: true }])
      setAddedTwin(true)
    } else setAddedTwin(false)
  }

  const next = () => {
    if (idx + 1 >= queue.length) {
      onFinish(results)
      return
    }
    setIdx(idx + 1)
    setAttempts(0)
    setStatus('answering')
    setInfo(undefined)
    setAddedTwin(false)
  }

  const locked = status === 'correct' || status === 'revealed'

  return (
    <div className="runner" ref={topRef}>
      <div className="runner-head">
        <span className="pill">
          {mode === 'quiz' ? 'שאלה' : 'משימה'} {idx + 1} מתוך {queue.length}
        </span>
        <span className="pill subtle">{topicNames[task.topic]}</span>
        <span className="pill subtle">{TYPE_LABEL[task.type]}</span>
        {task.repeat && <span className="pill amber">שאלה מקבילה לחזרה</span>}
        <button type="button" className="link-btn" onClick={onExit}>
          יציאה
        </button>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${(idx / queue.length) * 100}%` }} />
      </div>

      <section className="paper task" key={`${task.id}-${idx}`} aria-labelledby={`q-${task.id}-${idx}`}>
        <h2 id={`q-${task.id}-${idx}`} className="task-prompt">{task.prompt}</h2>
        {task.visual && <VisualView visual={task.visual} />}
        <TaskBody task={task} locked={locked} reveal={status === 'revealed'} onCheck={onCheck} />
      </section>

      {status !== 'answering' && (
        <div className={`feedback ${status}`} ref={feedbackRef} tabIndex={-1} role="status" aria-live="polite">
          {status === 'correct' && (
            <>
              <p className="fb-title">{mode === 'quiz' ? 'תשובה נכונה.' : attempts === 0 ? 'הרמז מתאים לראיות.' : 'הפעם זה מתאים. כל הכבוד על הניסיון הנוסף.'}</p>
              <p>
                <Rich text={task.explain} />
              </p>
            </>
          )}
          {status === 'hint' && (
            <>
              <p className="fb-title">עוד לא. יש לך ניסיון נוסף.</p>
              {info && <p>{info}</p>}
              <p>
                <b>רמז:</b> <Rich text={task.hint ?? 'קרא שוב את השאלה ובדוק כל נתון.'} />
              </p>
            </>
          )}
          {status === 'revealed' && (
            <>
              <p className="fb-title">{mode === 'quiz' ? 'לא מדויק. הנה ההסבר:' : 'הנה הפתרון, בלי לאבד דבר:'}</p>
              {info && mode === 'quiz' && <p>{info}</p>}
              <p>
                <Rich text={task.explain} />
              </p>
              {addedTwin && <p className="note">בהמשך התיק תקבל שאלה מקבילה, כדי לתרגל את אותו רעיון שוב.</p>}
            </>
          )}
          {locked && (
            <button type="button" className="btn primary" onClick={next} autoFocus>
              {idx + 1 >= queue.length ? 'לסיום' : 'המשך'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
