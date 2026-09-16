import { FormEvent, useState } from 'react'
import { Hero } from '../components/Hero'
import { sounds, unlockAudio } from '../lib/audio'
import { useGame } from '../lib/gameState'

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const { setChildName } = useGame()
  const [name, setName] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    unlockAudio()
    sounds.celebrate()
    setChildName(trimmed)
    onDone()
  }

  return (
    <div className="screen">
      <h1 className="title">לוח הכפל שלי</h1>
      <Hero mood="idle" size={220} />
      <p className="speech">היי! אני כאן כדי ללמוד איתך את לוח הכפל. איך קוראים לך?</p>
      <form className="stack" onSubmit={submit}>
        <input
          className="text-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="השם שלי"
          aria-label="השם שלי"
          maxLength={16}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button className="btn" type="submit" disabled={!name.trim()}>
          יאללה מתחילים
        </button>
      </form>
      <p className="muted-note">השם נשמר במכשיר בלבד ואפשר לשנות אותו דרך מסך ההורים.</p>
    </div>
  )
}
