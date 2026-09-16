import { useEffect } from 'react'
import { Confetti } from '../components/Confetti'
import { Hero } from '../components/Hero'
import { sounds } from '../lib/audio'
import { ROUND_LENGTH } from './QuizStage'

interface RoundSummaryProps {
  childName: string
  score: number
  onPracticeAgain: () => void
  onChampion: () => void
  onHome: () => void
}

/** חגיגה קצרה בסוף כל סבב תרגול של חמש שאלות */
export function RoundSummary({ childName, score, onPracticeAgain, onChampion, onHome }: RoundSummaryProps) {
  useEffect(() => {
    sounds.celebrate()
  }, [])

  const perfect = score === ROUND_LENGTH

  return (
    <div className="screen">
      <Confetti pieces={40} />
      <h1 className="title">
        {score} מתוך {ROUND_LENGTH}
      </h1>
      <Hero mood="celebrate" size={200} />
      <p className="speech">
        {perfect
          ? `${childName}, סבב מושלם! את מוכנה למבחן האלוף`
          : `${childName}, סבב יפה. עוד קצת תרגול ואת שם`}
      </p>
      <div className="spacer" />
      <div className="stack">
        <button className="btn turquoise" onClick={onChampion}>
          מבחן האלוף
        </button>
        <button className="btn" onClick={onPracticeAgain}>
          עוד סבב תרגול
        </button>
        <button className="btn secondary" onClick={onHome}>
          חזרה לטבלאות
        </button>
      </div>
    </div>
  )
}
