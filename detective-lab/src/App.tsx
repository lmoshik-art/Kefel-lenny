import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Content, Outcome, Progress, RunItem } from './types.ts'
import { clearProgress, defaultProgress, loadProgress, saveProgress } from './engine/storage.ts'
import { applyOutcome, buildExam, buildSession, dayKey, markSeen } from './engine/plan.ts'
import { Home } from './screens/Home.tsx'
import { Session } from './screens/Session.tsx'
import { Library, Onboarding, ProgressScreen, SettingsScreen } from './screens/Other.tsx'

const BASE = import.meta.env.BASE_URL

type View =
  | { name: 'home' }
  | { name: 'session'; mode: 'daily' | 'extra' | 'exam'; items: RunItem[]; key: number }
  | { name: 'library'; id: string | null }
  | { name: 'progress' }
  | { name: 'settings' }

export default function App() {
  const [content, setContent] = useState<Content | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [view, setView] = useState<View>({ name: 'home' })

  useEffect(() => {
    fetch(`${BASE}content/content.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then(setContent)
      .catch(() => setError('לא ניתן לטעון את החומר. בדוק את החיבור ורענן את הדף.'))
  }, [])

  useEffect(() => saveProgress(progress), [progress])

  useEffect(() => {
    const root = document.documentElement
    const theme = progress.settings.theme
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
    root.dataset.motion = progress.settings.reduceMotion ? 'reduce' : 'full'
  }, [progress.settings])

  // כפתור ״חזרה״ של הטלפון חוזר למסך הראשי במקום לצאת מהאפליקציה
  useEffect(() => {
    const onPop = () => setView({ name: 'home' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((v: View) => {
    if (v.name !== 'home') history.pushState({ v: v.name }, '')
    setView(v)
    window.scrollTo({ top: 0 })
  }, [])
  const home = useCallback(() => {
    setView({ name: 'home' })
    window.scrollTo({ top: 0 })
  }, [])

  const preview = useMemo(() => {
    if (!content) return { lessons: 0, questions: 0 }
    const items = buildSession(content, progress, Math.random)
    return { lessons: items.filter((i) => i.kind === 'lesson').length, questions: items.filter((i) => i.kind === 'question').length }
    // התצוגה המקדימה מחושבת מחדש רק כשמשתנה מספר המיומנויות שנלמדו או היום
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, Object.values(progress.skills).filter((s) => s.seen).length, view.name])

  if (error) return <main className="screen"><div className="card"><p>{error}</p></div></main>
  if (!content) return <main className="screen" aria-busy="true"><p className="muted center">טוען...</p></main>

  const setDate = (d: string | null) => setProgress((p) => ({ ...p, examDate: d }))

  if (!progress.onboarded) {
    return <Onboarding progress={progress} onSetDate={setDate} onStart={() => setProgress((p) => ({ ...p, onboarded: true }))} />
  }

  const start = (mode: 'daily' | 'extra' | 'exam') => {
    const items = mode === 'exam' ? buildExam(content, progress, Math.random) : buildSession(content, progress, Math.random, { extra: mode === 'extra' })
    go({ name: 'session', mode, items, key: Date.now() })
  }

  const finish = (mode: 'daily' | 'extra' | 'exam', outcomes: Outcome[]) => {
    const today = dayKey()
    setProgress((p) => {
      const day = p.days[today] ?? { questions: 0, firstTry: 0, daily: false, sessions: 0 }
      const next: Progress = { ...p, days: { ...p.days, [today]: { ...day, sessions: day.sessions + 1, daily: day.daily || mode === 'daily' } } }
      if (mode === 'exam') {
        const byTopic: Record<string, { correct: number; total: number }> = {}
        for (const o of outcomes) {
          const t = content.skills.find((s) => s.id === o.skillId)!.topic
          byTopic[t] = byTopic[t] ?? { correct: 0, total: 0 }
          byTopic[t].total++
          if (o.firstTry) byTopic[t].correct++
        }
        next.exams = [...p.exams, { date: today, correct: outcomes.filter((o) => o.firstTry).length, total: outcomes.length, byTopic }]
      }
      return next
    })
  }

  let screen: JSX.Element
  if (view.name === 'session') {
    screen = (
      <Session
        key={view.key}
        content={content}
        progress={progress}
        items={view.items}
        mode={view.mode}
        onOutcome={(o) => setProgress((p) => applyOutcome(content, p, o))}
        onLessonSeen={(id) => setProgress((p) => markSeen(p, id))}
        onFinish={(os) => finish(view.mode, os)}
        onExit={home}
      />
    )
  } else if (view.name === 'library') {
    screen = <Library content={content} skillId={view.id} onOpen={(id) => go({ name: 'library', id })} onBack={() => (view.id ? setView({ name: 'library', id: null }) : home())} />
  } else if (view.name === 'progress') {
    screen = <ProgressScreen content={content} progress={progress} onBack={home} />
  } else if (view.name === 'settings') {
    screen = (
      <SettingsScreen
        progress={progress}
        onSettings={(s) => setProgress((p) => ({ ...p, settings: s }))}
        onSetDate={setDate}
        onReset={() => {
          clearProgress()
          setProgress({ ...defaultProgress(), onboarded: true, settings: progress.settings })
          home()
        }}
        onBack={home}
      />
    )
  } else {
    screen = (
      <Home
        content={content}
        progress={progress}
        preview={preview}
        onDaily={() => start('daily')}
        onExtra={() => start('extra')}
        onExam={() => start('exam')}
        onNav={(to) => go(to === 'library' ? { name: 'library', id: null } : { name: to })}
        onSetDate={setDate}
      />
    )
  }
  return screen
}
