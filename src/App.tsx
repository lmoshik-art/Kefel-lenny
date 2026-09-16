import { useEffect, useState } from 'react'
import { Background } from './components/Background'
import { unlockAudio } from './lib/audio'
import { useGame } from './lib/gameState'
import { useScrollTop } from './lib/useScrollTop'
import { HomeScreen } from './screens/HomeScreen'
import { ParentScreen } from './screens/ParentScreen'
import { SavingsScreen } from './screens/SavingsScreen'
import { TableScreen } from './screens/TableScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { TableNumber } from './types'

type Route =
  | { name: 'welcome' }
  | { name: 'home' }
  | { name: 'table'; table: TableNumber }
  | { name: 'savings' }
  | { name: 'parent' }

export function App() {
  const { state } = useGame()
  const [route, setRoute] = useState<Route>(() =>
    state.childName ? { name: 'home' } : { name: 'welcome' },
  )

  /** ספארי מאפשר אודיו רק אחרי מגע ראשון של המשתמש */
  useEffect(() => {
    const handler = () => unlockAudio()
    window.addEventListener('pointerdown', handler, { once: true })
    return () => window.removeEventListener('pointerdown', handler)
  }, [])

  useScrollTop(route.name === 'table' ? `table-${route.table}` : route.name)

  const activeTable = route.name === 'table' ? route.table : undefined

  return (
    <>
      <Background table={activeTable} />
      <div className="app-shell">
        {route.name === 'welcome' && <WelcomeScreen onDone={() => setRoute({ name: 'home' })} />}
        {route.name === 'home' && (
          <HomeScreen
            onPickTable={(table) => setRoute({ name: 'table', table })}
            onOpenSavings={() => setRoute({ name: 'savings' })}
            onOpenParent={() => setRoute({ name: 'parent' })}
          />
        )}
        {route.name === 'table' && (
          <TableScreen table={route.table} onHome={() => setRoute({ name: 'home' })} />
        )}
        {route.name === 'savings' && <SavingsScreen onHome={() => setRoute({ name: 'home' })} />}
        {route.name === 'parent' && <ParentScreen onExit={() => setRoute({ name: 'home' })} />}
      </div>
    </>
  )
}
