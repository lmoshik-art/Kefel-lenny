import { useEffect } from 'react'
import { Confetti } from '../components/Confetti'
import { Hero } from '../components/Hero'
import { sounds } from '../lib/audio'
import { ChampionResult } from '../lib/gameState'
import { TableNumber } from '../types'
import { ROUND_LENGTH } from './QuizStage'
import { asset } from '../lib/assets'

interface ChampionResultScreenProps {
  table: TableNumber
  childName: string
  score: number
  result: ChampionResult
  daysLeft: number
  onRetry: () => void
  onHome: () => void
}

export function ChampionResultScreen({
  table,
  childName,
  score,
  result,
  daysLeft,
  onRetry,
  onHome,
}: ChampionResultScreenProps) {
  useEffect(() => {
    if (result.passed) sounds.celebrate()
    else sounds.star()
  }, [result.passed])

  return (
    <div className="screen">
      {result.passed && <Confetti />}
      <h1 className="title">
        {result.passed ? `אלופה של ${table}!` : `${score} מתוך ${ROUND_LENGTH}`}
      </h1>
      <Hero mood={result.passed ? 'celebrate' : 'encourage'} size={210} />

      {result.passed ? (
        <div className="stack">
          <img className="vault-img" src={asset('trophy.png')} alt="גביע" />
          <p className="speech reward-row">
            <img src={asset('coins-small.png')} alt="" aria-hidden="true" />
            <span>
              {childName}, ענית נכון על כל השאלות. נוספו לחיסכון שלך {result.reward} ₪.
            </span>
          </p>
          {result.learnedNow ? (
            <p className="speech">הטבלה של {table} מסומנת עכשיו כנלמדה. כל הכבוד!</p>
          ) : (
            daysLeft > 0 && (
              <p className="muted-note">
                כדי שהטבלה תסומן כנלמדה נשאר לעבור את מבחן האלוף עוד {daysLeft} פעמים, בימים אחרים.
              </p>
            )
          )}
        </div>
      ) : (
        <p className="speech">{childName}, היה קרוב. נתרגל עוד קצת ונחזור למבחן.</p>
      )}

      <div className="spacer" />
      <div className="stack">
        <button className="btn" onClick={onRetry}>
          {result.passed ? 'עוד סבב תרגול' : 'לתרגל שוב'}
        </button>
        <button className="btn secondary" onClick={onHome}>
          חזרה לטבלאות
        </button>
      </div>
    </div>
  )
}
