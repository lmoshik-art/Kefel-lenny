import { useCallback, useEffect, useRef, useState } from 'react'
import { FlyBurst, FlyingRewards } from '../components/FlyingRewards'
import { Hero } from '../components/Hero'
import { StarsCounter } from '../components/StarsCounter'
import { sounds, unlockAudio } from '../lib/audio'
import { useGame } from '../lib/gameState'
import { buildQuestion, nextMultiplier } from '../lib/learning'
import { HeroMood, Question, TableNumber } from '../types'

export const ROUND_LENGTH = 5

interface QuizStageProps {
  table: TableNumber
  mode: 'practice' | 'champion'
  onFinish: (score: number) => void
  onQuit: () => void
}

interface Feedback {
  chosen: number
  correct: boolean
}

const CHEERS = ['יש! בדיוק', 'מעולה!', 'כל הכבוד!', 'סופר!', 'איזה דיוק!']
const ENCOURAGEMENTS = [
  'כמעט! בואי נסתכל יחד',
  'לא נורא בכלל, ככה לומדים',
  'יפה שניסית, הנה התשובה',
  'עוד רגע זה ייתפס',
]

function randomFrom(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)]
}

export function QuizStage({ table, mode, onFinish, onQuit }: QuizStageProps) {
  const { state, recordAnswer } = useGame()
  /** הפניה למצב העדכני, כדי שבחירת התרגיל הבא תתחשב בתשובות של הסבב הנוכחי */
  const stateRef = useRef(state)
  stateRef.current = state
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [question, setQuestion] = useState<Question | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [message, setMessage] = useState('')
  const [burst, setBurst] = useState<FlyBurst | null>(null)
  const askedAt = useRef<number>(Date.now())
  const recent = useRef<number[]>([])
  /** מונע ספירה כפולה של אותה שאלה בלחיצות מהירות */
  const locked = useRef(false)

  const loadQuestion = useCallback(() => {
    const multiplier = nextMultiplier(stateRef.current, table, recent.current.slice(-3))
    recent.current = [...recent.current, multiplier].slice(-3)
    setQuestion(buildQuestion(table, multiplier))
    setFeedback(null)
    setMessage('')
    askedAt.current = Date.now()
    locked.current = false
  }, [table])

  useEffect(() => {
    loadQuestion()
  }, [loadQuestion])

  function choose(option: number, event: React.MouseEvent<HTMLButtonElement>) {
    if (!question || locked.current) return
    locked.current = true
    unlockAudio()
    const correct = option === question.answer
    const elapsed = Date.now() - askedAt.current
    const result = recordAnswer(table, question.multiplier, correct, elapsed)
    setFeedback({ chosen: option, correct })

    if (correct) {
      setScore((value) => value + 1)
      setMessage(result.fast ? 'מהיר ומדויק!' : randomFrom(CHEERS))
      sounds.correct()
      const rect = event.currentTarget.getBoundingClientRect()
      setBurst({
        id: Date.now(),
        x: rect.left + rect.width / 2 - 22,
        y: rect.top,
        count: result.stars,
        kind: result.fast ? 'coin' : 'star',
      })
      window.setTimeout(() => sounds.star(), 180)
    } else {
      setMessage(`${randomFrom(ENCOURAGEMENTS)}: ${question.multiplier} × ${table} = ${question.answer}`)
      sounds.gentleMiss()
    }

    const delay = correct ? 1100 : 2100
    window.setTimeout(() => {
      const nextIndex = index + 1
      if (nextIndex >= ROUND_LENGTH) {
        onFinish(score + (correct ? 1 : 0))
        return
      }
      setIndex(nextIndex)
      loadQuestion()
    }, delay)
  }

  if (!question) return null

  const mood: HeroMood = feedback ? (feedback.correct ? 'cheer' : 'encourage') : 'idle'

  return (
    <div className="screen">
      <div className="top-bar">
        <StarsCounter stars={state.stars} />
        <button className="icon-btn" onClick={onQuit} aria-label="חזרה למסך הבית">
          ✕
        </button>
      </div>

      <div className="progress-dots" aria-label={`שאלה ${index + 1} מתוך ${ROUND_LENGTH}`}>
        {Array.from({ length: ROUND_LENGTH }).map((_, dotIndex) => (
          <span
            key={dotIndex}
            className={`dot${dotIndex < index ? ' done' : ''}${dotIndex === index ? ' active' : ''}`}
          />
        ))}
      </div>

      <h1 className="title">{mode === 'champion' ? `מבחן האלוף של ${table}` : `מתרגלים את ${table}`}</h1>

      <div className="question-card">
        <div className="question-text">
          {question.multiplier} × {table} = ?
        </div>
      </div>

      <div className="options">
        {question.options.map((option) => {
          const isChosen = feedback?.chosen === option
          const isAnswer = option === question.answer
          let className = 'option'
          if (feedback) {
            if (isChosen && feedback.correct) className += ' correct'
            else if (isChosen) className += ' gentle'
            if (!feedback.correct && isAnswer) className += ' reveal'
          }
          return (
            <button
              key={option}
              className={className}
              onClick={(event) => choose(option, event)}
              disabled={Boolean(feedback)}
            >
              {option}
            </button>
          )
        })}
      </div>

      {message && <p className="speech">{message}</p>}

      <div className="spacer" />
      <Hero mood={mood} size={160} />
      <FlyingRewards burst={burst} targetSelector="#stars-counter" />
    </div>
  )
}
