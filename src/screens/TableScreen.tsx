import { useState } from 'react'
import { ChampionResult, useGame } from '../lib/gameState'
import { championDaysLeft } from '../lib/learning'
import { useScrollTop } from '../lib/useScrollTop'
import { TableNumber } from '../types'
import { ChampionResultScreen } from './ChampionResultScreen'
import { IntroStage } from './IntroStage'
import { QuizStage } from './QuizStage'
import { RoundSummary } from './RoundSummary'

type Stage = 'intro' | 'practice' | 'summary' | 'champion' | 'result'

export function TableScreen({ table, onHome }: { table: TableNumber; onHome: () => void }) {
  const { state, markIntroDone, finishChampion } = useGame()
  const [stage, setStage] = useState<Stage>(state.tables[table].introDone ? 'practice' : 'intro')
  const [score, setScore] = useState(0)
  const [result, setResult] = useState<ChampionResult | null>(null)
  /** מאלץ טעינה מחדש של סבב חדש גם כשנשארים באותו שלב */
  const [roundId, setRoundId] = useState(0)

  useScrollTop(`${stage}-${roundId}`)

  function startRound(next: Stage) {
    setRoundId((value) => value + 1)
    setStage(next)
  }

  if (stage === 'intro') {
    return (
      <IntroStage
        table={table}
        onDone={() => {
          markIntroDone(table)
          startRound('practice')
        }}
      />
    )
  }

  if (stage === 'practice' || stage === 'champion') {
    const mode = stage === 'champion' ? 'champion' : 'practice'
    return (
      <QuizStage
        key={`${mode}-${roundId}`}
        table={table}
        mode={mode}
        onQuit={onHome}
        onFinish={(finalScore) => {
          setScore(finalScore)
          if (mode === 'champion') {
            setResult(finishChampion(table, finalScore))
            setStage('result')
          } else {
            setStage('summary')
          }
        }}
      />
    )
  }

  if (stage === 'summary') {
    return (
      <RoundSummary
        childName={state.childName}
        score={score}
        onPracticeAgain={() => startRound('practice')}
        onChampion={() => startRound('champion')}
        onHome={onHome}
      />
    )
  }

  if (!result) return null

  return (
    <ChampionResultScreen
      table={table}
      childName={state.childName}
      score={score}
      result={result}
      daysLeft={championDaysLeft(state, table)}
      onRetry={() => startRound('practice')}
      onHome={onHome}
    />
  )
}
