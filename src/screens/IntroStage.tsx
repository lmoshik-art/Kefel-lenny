import { useState } from 'react'
import { Hero } from '../components/Hero'
import { sounds, unlockAudio } from '../lib/audio'
import { TableNumber } from '../types'

/** שלושת התרגילים שמוצגים בהיכרות הוויזואלית */
const DEMO_MULTIPLIERS = [2, 3, 5]

const ITEMS = ['/assets/coin.png', '/assets/medal.png', '/assets/trophy.png']

export function IntroStage({ table, onDone }: { table: TableNumber; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const groups = DEMO_MULTIPLIERS[index]
  const item = ITEMS[index % ITEMS.length]
  const total = table * groups
  const isLast = index === DEMO_MULTIPLIERS.length - 1

  function next() {
    unlockAudio()
    sounds.tap()
    if (isLast) {
      onDone()
      return
    }
    setIndex((value) => value + 1)
  }

  return (
    <div className="screen">
      <h1 className="title">מכירים את הטבלה של {table}</h1>
      <p className="speech">
        {groups} קבוצות של {table} זה ביחד {total}
      </p>

      <div className="groups">
        {Array.from({ length: groups }).map((_, groupIndex) => (
          <div
            key={groupIndex}
            className="group"
            style={{
              gridTemplateColumns: `repeat(${Math.min(table, 5)}, auto)`,
              animationDelay: `${groupIndex * 120}ms`,
            }}
          >
            {Array.from({ length: table }).map((__, itemIndex) => (
              <img key={itemIndex} src={item} alt="" aria-hidden="true" />
            ))}
          </div>
        ))}
      </div>

      <div className="question-card">
        <div className="question-text">
          {groups} × {table} = {total}
        </div>
      </div>

      <Hero mood="idle" size={150} />
      <div className="spacer" />
      <button className="btn" onClick={next}>
        {isLast ? 'עכשיו מתרגלים' : 'הבנתי, הלאה'}
      </button>
    </div>
  )
}
