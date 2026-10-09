import { useCallback, useEffect, useState } from 'react'
import type { Assets, Content, Progress, TaskResult, TopicId } from './types'
import { clearProgress, defaultProgress, loadProgress, recordResults, saveProgress } from './storage'
import { setRain } from './sound'
import { Home } from './screens/Home'
import { CaseScreen } from './screens/CaseScreen'
import { EvidenceRound, Quiz, Report, tally } from './screens/Rounds'
import { AmbientImage, ClipPlayer, OfficeScene, SettingsDialog } from './components/Scenes'

const BASE = import.meta.env.BASE_URL

type View = { name: 'home' } | { name: 'case'; id: string } | { name: 'evidence' } | { name: 'quiz' } | { name: 'report' } | { name: 'finale' }

function parseHash(): View {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [a, b] = h.split('/')
  if (a === 'case' && b) return { name: 'case', id: b }
  if (a === 'evidence' || a === 'quiz' || a === 'report' || a === 'finale') return { name: a }
  return { name: 'home' }
}

function toHash(v: View) {
  return v.name === 'home' ? '#/' : v.name === 'case' ? `#/case/${v.id}` : `#/${v.name}`
}

export default function App() {
  const [content, setContent] = useState<Content | null>(null)
  const [assets, setAssets] = useState<Assets | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [view, setView] = useState<View>(parseHash)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [clip, setClip] = useState<null | 'intro' | 'outro'>(null)

  useEffect(() => {
    fetch(`${BASE}content/content.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then(setContent)
      .catch(() => setError('לא ניתן לטעון את קובץ התוכן. בדוק את החיבור ונסה לרענן את הדף.'))
    fetch(`${BASE}content/assets.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setAssets)
      .catch(() => setAssets(null))
  }, [])

  useEffect(() => saveProgress(progress), [progress])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = progress.settings.theme
    root.dataset.motion = progress.settings.reduceMotion ? 'reduce' : 'full'
  }, [progress.settings.theme, progress.settings.reduceMotion])

  useEffect(() => {
    setRain(progress.settings.rain)
  }, [progress.settings.rain])

  useEffect(() => {
    const onHash = () => setView(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((v: View) => {
    if (window.location.hash !== toHash(v)) window.location.hash = toHash(v)
    setView(v)
    window.scrollTo({ top: 0 })
  }, [])

  const home = useCallback(() => go({ name: 'home' }), [go])
  const closeClip = useCallback(() => setClip(null), [])

  if (error) {
    return (
      <main className="screen">
        <div className="paper">
          <p>{error}</p>
        </div>
      </main>
    )
  }
  if (!content) {
    return (
      <main className="screen loading" aria-busy="true">
        <OfficeScene className="hero-art" />
        <p className="center">פותחים את התיקים...</p>
      </main>
    )
  }

  const practiceTopic = (topic: TopicId) => {
    const c = content.cases.find((x) => x.topic === topic)
    if (c) go({ name: 'case', id: c.id })
  }

  const completeCase = (caseId: string, results: TaskResult[]) => {
    setProgress((p) => {
      const solved = [...new Set(results.filter((r) => r.solved).map((r) => r.taskId))]
      const review = [...new Set(results.filter((r) => !r.firstTry).map((r) => r.taskId))]
      const next = recordResults(p, results)
      return { ...next, cases: { ...next.cases, [caseId]: { completed: true, solved, review } } }
    })
  }

  const allDone = content.cases.every((c) => progress.cases[c.id]?.completed)

  let screen: JSX.Element
  if (view.name === 'case') {
    const file = content.cases.find((c) => c.id === view.id)
    screen = file ? (
      <CaseScreen
        key={file.id}
        file={file}
        content={content}
        assets={assets}
        progress={progress}
        onHome={() => {
          if (allDone && !progress.finaleSeen) {
            setProgress((p) => ({ ...p, finaleSeen: true }))
            go({ name: 'finale' })
          } else home()
        }}
        onComplete={(r) => completeCase(file.id, r)}
      />
    ) : (
      <main className="screen">
        <p>התיק לא נמצא.</p>
      </main>
    )
  } else if (view.name === 'evidence') {
    screen = (
      <EvidenceRound
        content={content}
        progress={progress}
        onPractice={practiceTopic}
        onHome={home}
        onDone={(r) => setProgress((p) => ({ ...recordResults(p, r), evidence: { last: tally(r) } }))}
      />
    )
  } else if (view.name === 'quiz') {
    screen = (
      <Quiz
        content={content}
        progress={progress}
        onPractice={practiceTopic}
        onHome={home}
        onDone={(r) => setProgress((p) => ({ ...recordResults(p, r), quiz: { attempts: p.quiz.attempts + 1, last: tally(r) } }))}
      />
    )
  } else if (view.name === 'report') {
    screen = <Report content={content} progress={progress} onPractice={practiceTopic} onHome={home} />
  } else if (view.name === 'finale') {
    screen = (
      <main className="screen finale">
        <h1 className="case-title">התעלומה נפתרה</h1>
        <AmbientImage slot={assets?.finale} fallback="none" className="finale-art" />
        <div className="board-grid">
          {content.cases.map((c) => (
            <div key={c.id} className="note-card">
              <span className="pin" aria-hidden="true" />
              <p>{c.clue}</p>
            </div>
          ))}
        </div>
        <div className="paper story">
          <p className="story-text">{content.story.finale}</p>
          <p className="note">פתרון התעלומה הוא סוף הסיפור, לא מדד לשליטה בחומר. הבוחן המסכם ודוח ההבנה מראים מה כדאי לחזק.</p>
        </div>
        <div className="row center">
          <button type="button" className="btn ghost" onClick={() => setClip('outro')}>
            קליפ סגירת התיק
          </button>
          <button type="button" className="btn primary" onClick={() => go({ name: 'quiz' })}>
            לבוחן המסכם
          </button>
          <button type="button" className="btn ghost" onClick={home}>
            חזרה למשרד
          </button>
        </div>
      </main>
    )
  } else {
    screen = (
      <Home
        content={content}
        assets={assets}
        progress={progress}
        onTrack={(t) => setProgress((p) => ({ ...p, track: t }))}
        onOpenCase={(id) => go({ name: 'case', id })}
        onEvidence={() => go({ name: 'evidence' })}
        onQuiz={() => go({ name: 'quiz' })}
        onReport={() => go({ name: 'report' })}
        onIntroClip={() => setClip('intro')}
        onFinale={() => go({ name: 'finale' })}
      />
    )
  }

  return (
    <>
      <a href="#main" className="skip-link">
        דלג לתוכן
      </a>
      <header className="topbar">
        <button type="button" className="brand" onClick={home}>
          תעלומת המעבדה
        </button>
        <button type="button" className="btn small ghost" onClick={() => setSettingsOpen(true)}>
          הגדרות
        </button>
      </header>
      <div id="main">{screen}</div>
      <footer className="footer">
        <p>ההתקדמות נשמרת רק במכשיר הזה. אין הרשמה ואין איסוף מידע אישי.</p>
      </footer>
      {settingsOpen && (
        <SettingsDialog
          settings={progress.settings}
          onChange={(s) => setProgress((p) => ({ ...p, settings: s }))}
          onReset={() => {
            clearProgress()
            setProgress({ ...defaultProgress(), settings: progress.settings })
            setSettingsOpen(false)
            home()
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {clip && (
        <ClipPlayer
          slot={clip === 'intro' ? assets?.introClip : assets?.outroClip}
          variant={clip}
          caption={clip === 'intro' ? 'לילה גשום. בחלון המעבדה עדיין דולק אור.' : 'התיק נסגר.'}
          reduceMotion={progress.settings.reduceMotion}
          onClose={closeClip}
        />
      )}
    </>
  )
}
