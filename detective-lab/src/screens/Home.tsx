import type { Assets, Content, Progress } from '../types'
import { AmbientImage } from '../components/Scenes'

interface Props {
  content: Content
  assets: Assets | null
  progress: Progress
  onTrack: (t: 'beginner' | 'evidence') => void
  onOpenCase: (id: string) => void
  onEvidence: () => void
  onQuiz: () => void
  onReport: () => void
  onIntroClip: () => void
  onFinale: () => void
}

export function Home({ content, assets, progress, onTrack, onOpenCase, onEvidence, onQuiz, onReport, onIntroClip, onFinale }: Props) {
  const done = content.cases.filter((c) => progress.cases[c.id]?.completed)
  const allDone = done.length === content.cases.length
  const nextCase = content.cases.find((c) => !progress.cases[c.id]?.completed)

  return (
    <main className="screen home">
      <section className="hero">
        <AmbientImage slot={assets?.office} fallback="office" className="hero-art" />
        <div className="hero-text">
          <p className="kicker">משרד הבלש</p>
          <h1 className="title">{content.story.title}</h1>
          <p className="lead">{content.story.opening}</p>
          <p className="frame-note">{content.story.frameNote}</p>
          <button type="button" className="link-btn" onClick={onIntroClip}>
            צפייה בפתיח הקצר
          </button>
        </div>
      </section>

      <section className="tracks" aria-labelledby="tracks-title">
        <h2 id="tracks-title" className="section-title">בחר מסלול</h2>
        <div className="track-grid">
          <button type="button" className={`track ${progress.track === 'beginner' ? 'on' : ''}`} aria-pressed={progress.track === 'beginner'} onClick={() => onTrack('beginner')}>
            <b>בלש מתחיל</b>
            <span>לומדים מהתחלה: פתיח, הסבר, דוגמה מודרכת ואז משימות.</span>
          </button>
          <button type="button" className={`track ${progress.track === 'evidence' ? 'on' : ''}`} aria-pressed={progress.track === 'evidence'} onClick={() => onTrack('evidence')}>
            <b>בדיקת ראיות</b>
            <span>מה אני כבר יודע? סבב קצר מכל הנושאים, ובתיקים מתחילים ישר במשימות.</span>
          </button>
        </div>
        {progress.track === 'evidence' && (
          <div className="row center">
            <button type="button" className="btn primary big" onClick={onEvidence}>
              לסבב בדיקת הראיות (כ-10 משימות)
            </button>
          </div>
        )}
        {progress.track === 'beginner' && nextCase && (
          <div className="row center">
            <button type="button" className="btn primary big" onClick={() => onOpenCase(nextCase.id)}>
              {done.length ? 'להמשך: ' : 'להתחלה: '}תיק {nextCase.number}, {nextCase.title}
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="files-title">
        <h2 id="files-title" className="section-title">תיקי החקירה</h2>
        <ul className="files">
          {content.cases.map((c) => {
            const st = progress.cases[c.id]
            return (
              <li key={c.id}>
                <button type="button" className={`folder-card ${st?.completed ? 'done' : ''}`} onClick={() => onOpenCase(c.id)}>
                  <span className="folder-tab">תיק {c.number}</span>
                  <span className="folder-topic">{content.topics[c.topic]}</span>
                  <span className="folder-title">{c.title}</span>
                  <span className="folder-meta">
                    {c.tasks.length} משימות{c.lab ? ' · אזור מעבדה ממתין' : ''}
                  </span>
                  {st?.completed && <span className="mini-stamp">פוענח</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="board" aria-labelledby="board-title">
        <h2 id="board-title" className="section-title">לוח הראיות</h2>
        <div className="board-grid">
          {content.cases.map((c) =>
            progress.cases[c.id]?.completed ? (
              <div key={c.id} className="note-card">
                <span className="pin" aria-hidden="true" />
                <p>{c.clue}</p>
              </div>
            ) : (
              <div key={c.id} className="note-card empty">
                <p>פתק {c.number} ייחשף אחרי פענוח תיק {c.number}</p>
              </div>
            ),
          )}
        </div>
        {allDone && (
          <div className="row center">
            <button type="button" className="btn ghost" onClick={onFinale}>
              לפענוח התעלומה
            </button>
          </div>
        )}
      </section>

      <section className="final-row" aria-label="בוחן ודוח">
        <div className="paper">
          <h2>בוחן מסכם</h2>
          {allDone ? (
            <p>כל התיקים פוענחו. הבוחן כולל 10 שאלות על החומר שנלמד באפליקציה, עם הסבר אחרי כל תשובה.</p>
          ) : (
            <p>הבוחן מומלץ אחרי פענוח כל חמשת התיקים ({done.length} מתוך 5 פוענחו). אזורי המעבדה הממתינים אינם נכללים בו.</p>
          )}
          <button type="button" className={`btn ${allDone ? 'primary' : 'ghost'}`} onClick={onQuiz}>
            {allDone ? 'לבוחן המסכם' : 'לגשת לבוחן כבר עכשיו'}
          </button>
        </div>
        <div className="paper">
          <h2>הבנה לפי נושאים</h2>
          <p>פענוח התעלומה לבדו אינו מעיד על שליטה בחומר. הדוח מציג איך הלך בכל נושא בניסיון הראשון.</p>
          <button type="button" className="btn ghost" onClick={onReport}>
            לדוח ההבנה
          </button>
        </div>
      </section>
    </main>
  )
}
