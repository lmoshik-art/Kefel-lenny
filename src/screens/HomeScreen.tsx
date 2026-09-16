import { useRef } from 'react'
import { SavingsMeter } from '../components/SavingsMeter'
import { StarsCounter } from '../components/StarsCounter'
import { sounds, unlockAudio } from '../lib/audio'
import { useGame } from '../lib/gameState'
import { isTableLearned } from '../lib/learning'
import { TABLES, TableNumber } from '../types'
import { asset } from '../lib/assets'

interface HomeScreenProps {
  onPickTable: (table: TableNumber) => void
  onOpenSavings: () => void
  onOpenParent: () => void
}

/** לחיצה ארוכה על הכפתור הקטן פותחת את מסך ההורים */
const LONG_PRESS_MS = 1200

export function HomeScreen({ onPickTable, onOpenSavings, onOpenParent }: HomeScreenProps) {
  const { state, vaultStatus } = useGame()
  const pressTimer = useRef<number | null>(null)

  function startPress() {
    pressTimer.current = window.setTimeout(() => {
      onOpenParent()
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <StarsCounter stars={state.stars} />
        <button
          className="parent-dot"
          aria-label="מסך הורים, לחיצה ארוכה"
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(event) => event.preventDefault()}
        >
          ⚙
        </button>
      </div>

      <SavingsMeter saved={state.savedAmount} goal={state.goalAmount} />

      <h1 className="title">היי {state.childName}, איזו טבלה היום?</h1>

      <div className="tables-grid">
        {TABLES.map((table) => (
          <button
            key={table}
            className="table-card"
            style={{ backgroundImage: `url(${asset(`bg-${table}.png`)})` }}
            onClick={() => {
              unlockAudio()
              sounds.tap()
              onPickTable(table)
            }}
            aria-label={`טבלת הכפל של ${table}${isTableLearned(state, table) ? ', הושלמה' : ''}`}
          >
            <span>{table}</span>
            {isTableLearned(state, table) && (
              <img className="badge" src={asset('trophy.png')} alt="" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      <button
        className={`btn gold${vaultStatus === 'ready' ? ' btn-bounce' : ''}`}
        onClick={() => {
          unlockAudio()
          sounds.tap()
          onOpenSavings()
        }}
      >
        <img src={asset('chest.png')} alt="" aria-hidden="true" width={38} height={38} />
        החיסכון שלי
      </button>
    </div>
  )
}
