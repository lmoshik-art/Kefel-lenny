import { useMemo, useState } from 'react'
import type { Assets, CaseFile, Content, Progress, RunTask, TaskResult } from '../types'
import { DemoView } from '../components/Visuals'
import { TaskRunner } from '../components/TaskRunner'
import { AmbientImage } from '../components/Scenes'
import { playStamp } from '../sound'

type Step = 'brief' | 'learn' | 'tasks' | 'summary'

export function LabPlaceholder({ lab }: { lab: NonNullable<CaseFile['lab']> }) {
  if (lab.status === 'ready' && lab.text) {
    return (
      <section className="paper lab ready">
        <h3>{lab.title}</h3>
        <p>{lab.text}</p>
      </section>
    )
  }
  return (
    <section className="lab pending" aria-label={`${lab.title}: ממתין לחומר מהמחברת`}>
      <span className="pending-stamp">ממתין לחומר מהמחברת</span>
      <h3>{lab.title}</h3>
      <p>
        האזור הזה יושלם לפי המחברת ודפי המעבדה של הכיתה. עד אז הוא אינו נכלל בתרגול, בציון או בבוחן המסכם.
      </p>
    </section>
  )
}

interface Props {
  file: CaseFile
  content: Content
  assets: Assets | null
  progress: Progress
  onComplete: (results: TaskResult[]) => void
  onHome: () => void
}

export function CaseScreen({ file, content, assets, progress, onComplete, onHome }: Props) {
  const evidenceTrack = progress.track === 'evidence'
  const [step, setStep] = useState<Step>(progress.settings.skipStory || evidenceTrack ? (evidenceTrack ? 'tasks' : 'learn') : 'brief')
  const [results, setResults] = useState<TaskResult[] | null>(null)
  const [runId, setRunId] = useState(0)

  const tasks: RunTask[] = useMemo(() => file.tasks.map((t) => ({ ...t, topic: file.topic })), [file])

  const finish = (r: TaskResult[]) => {
    if (progress.settings.sound) playStamp()
    setResults(r)
    setStep('summary')
    onComplete(r)
  }

  const solvedTake = results ? [...new Set(results.filter((r) => r.solved && r.takeaway).map((r) => r.takeaway!))] : []
  const reviewTake = results ? [...new Set(results.filter((r) => !r.firstTry && r.takeaway).map((r) => r.takeaway!))] : []

  return (
    <main className="screen case-screen">
      <header className="case-header">
        <button type="button" className="link-btn" onClick={onHome}>
          חזרה למשרד
        </button>
        <p className="case-kicker">תיק {file.number} · {content.topics[file.topic]}</p>
        <h1 className="case-title">{file.title}</h1>
        <nav className="steps" aria-label="שלבי התיק">
          {(['brief', 'learn', 'tasks'] as Step[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`step ${step === s ? 'on' : ''}`}
              aria-current={step === s ? 'step' : undefined}
              onClick={() => {
                if (s === 'tasks') setRunId(runId + 1)
                setStep(s)
              }}
            >
              {s === 'brief' ? 'פתיח' : s === 'learn' ? 'הסבר ודוגמה' : 'משימות'}
            </button>
          ))}
        </nav>
      </header>

      {step === 'brief' && (
        <section className="brief">
          <AmbientImage slot={assets?.evidence} fallback="evidence" className="brief-art" />
          <div className="paper story">
            <p className="story-text">{file.intro}</p>
            <div className="row">
              <button type="button" className="btn primary" onClick={() => setStep('learn')}>
                להסבר המדעי
              </button>
              <button type="button" className="btn ghost" onClick={() => setStep('tasks')}>
                דלג ישר למשימות
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'learn' && (
        <>
          <section className="paper explain" aria-labelledby="exp-title">
            <h2 id="exp-title">מה צריך לדעת</h2>
            {file.explanation.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </section>
          <DemoView demo={file.demo} />
          {file.lab && <LabPlaceholder lab={file.lab} />}
          <div className="row center">
            <button type="button" className="btn primary big" onClick={() => setStep('tasks')}>
              למשימות התיק ({file.tasks.length})
            </button>
          </div>
        </>
      )}

      {step === 'tasks' && (
        <>
          {evidenceTrack && (
            <p className="note center">
              מסלול בדיקת ראיות: מתחילים ישר במשימות.{' '}
              <button type="button" className="link-btn inline" onClick={() => setStep('learn')}>
                לקריאת ההסבר והדוגמה
              </button>
            </p>
          )}
          <TaskRunner
            key={runId}
            tasks={tasks}
            mode="practice"
            sound={progress.settings.sound}
            topicNames={content.topics}
            onFinish={finish}
            onExit={onHome}
          />
        </>
      )}

      {step === 'summary' && results && (
        <section className="summary">
          <div className="stamp-wrap">
            <span className="stamp">פוענח</span>
          </div>
          <div className="paper">
            <h2>ראיות שפענחת</h2>
            {solvedTake.length ? (
              <ul className="clean-list">
                {solvedTake.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <p>עוד לא נאספו ראיות בתיק הזה. כדאי לעבור שוב על ההסבר ולנסות שנית.</p>
            )}
          </div>
          <div className="paper">
            <h2>מה עוד כדאי לבדוק</h2>
            {reviewTake.length ? (
              <ul className="clean-list">
                {reviewTake.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <p>כל המשימות נפתרו בניסיון הראשון. אפשר לעבור לתיק הבא.</p>
            )}
            {file.lab && file.lab.status !== 'ready' && <p className="note">{file.lab.title}: ממתין לחומר מהמחברת, ולכן עדיין לא נבדק כאן.</p>}
          </div>
          <div className="note-card clue" role="note">
            <span className="pin" aria-hidden="true" />
            <p className="clue-label">פתק חדש בלוח הראיות</p>
            <p>{file.clue}</p>
          </div>
          <div className="row center">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setRunId(runId + 1)
                setResults(null)
                setStep('tasks')
              }}
            >
              תרגול חוזר בתיק
            </button>
            <button type="button" className="btn primary" onClick={onHome}>
              חזרה למשרד
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
