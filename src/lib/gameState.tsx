import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SaveState, TableNumber, VaultState } from '../types'
import { allTablesLearned, isChampionPass, starsForAnswer, updateFact, factKey } from './learning'
import {
  clearState,
  createInitialState,
  loadState,
  REQUIRED_CHAMPION_DAYS,
  saveState,
  todayKey,
} from './storage'

export interface AnswerResult {
  correct: boolean
  stars: number
  fast: boolean
}

export interface ChampionResult {
  passed: boolean
  reward: number
  learnedNow: boolean
}

interface GameContextValue {
  state: SaveState
  vaultStatus: VaultState
  vaultEligible: boolean
  setChildName: (name: string) => void
  markIntroDone: (table: TableNumber) => void
  recordAnswer: (
    table: TableNumber,
    multiplier: number,
    correct: boolean,
    elapsedMs: number,
  ) => AnswerResult
  finishChampion: (table: TableNumber, score: number) => ChampionResult
  addMoney: (amount: number) => void
  setRewardPerAchievement: (amount: number) => void
  setTableApproved: (table: TableNumber, approved: boolean) => void
  openVault: () => void
  resetAll: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SaveState>(() => loadState())
  /** עותק עדכני של המצב, כדי שפעולות שמחזירות ערך יחשבו על הנתונים האחרונים */
  const latest = useRef(state)
  latest.current = state

  useEffect(() => {
    saveState(state)
  }, [state])

  const setChildName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, childName: name.trim() }))
  }, [])

  const markIntroDone = useCallback((table: TableNumber) => {
    setState((prev) => ({
      ...prev,
      tables: { ...prev.tables, [table]: { ...prev.tables[table], introDone: true } },
    }))
  }, [])

  const recordAnswer = useCallback<GameContextValue['recordAnswer']>(
    (table, multiplier, correct, elapsedMs) => {
      const stars = starsForAnswer(correct, elapsedMs)
      const key = factKey(table, multiplier)
      setState((prev) => ({
        ...prev,
        stars: prev.stars + stars,
        facts: { ...prev.facts, [key]: updateFact(prev.facts[key], correct) },
      }))
      return { correct, stars, fast: stars > 1 }
    },
    [],
  )

  const finishChampion = useCallback<GameContextValue['finishChampion']>((table, score) => {
    const passed = isChampionPass(score)
    const previous = latest.current
    const progress = previous.tables[table]
    const reward = passed ? previous.rewardPerAchievement : 0
    const daysBefore = new Set(progress.championDays)
    const daysAfter = new Set(daysBefore)
    if (passed) daysAfter.add(todayKey())
    const learnedNow =
      daysBefore.size < REQUIRED_CHAMPION_DAYS && daysAfter.size >= REQUIRED_CHAMPION_DAYS

    const next: SaveState = {
      ...previous,
      tables: {
        ...previous.tables,
        [table]: {
          ...progress,
          bestScore: Math.max(progress.bestScore, score),
          championDays: [...daysAfter],
        },
      },
      savedAmount: Math.min(previous.goalAmount, previous.savedAmount + reward),
    }
    latest.current = next
    setState(next)

    return { passed, reward, learnedNow }
  }, [])

  const addMoney = useCallback((amount: number) => {
    setState((prev) => ({
      ...prev,
      savedAmount: Math.max(0, Math.min(prev.goalAmount, prev.savedAmount + amount)),
    }))
  }, [])

  const setRewardPerAchievement = useCallback((amount: number) => {
    setState((prev) => ({ ...prev, rewardPerAchievement: Math.max(0, amount) }))
  }, [])

  const setTableApproved = useCallback((table: TableNumber, approved: boolean) => {
    setState((prev) => ({
      ...prev,
      tables: { ...prev.tables, [table]: { ...prev.tables[table], parentApproved: approved } },
    }))
  }, [])

  const openVault = useCallback(() => {
    setState((prev) => ({ ...prev, vault: 'open' }))
  }, [])

  const resetAll = useCallback(() => {
    clearState()
    setState(createInitialState())
  }, [])

  const vaultEligible = state.savedAmount >= state.goalAmount && allTablesLearned(state)
  const vaultStatus: VaultState = state.vault === 'open' ? 'open' : vaultEligible ? 'ready' : 'locked'

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      vaultStatus,
      vaultEligible,
      setChildName,
      markIntroDone,
      recordAnswer,
      finishChampion,
      addMoney,
      setRewardPerAchievement,
      setTableApproved,
      openVault,
      resetAll,
    }),
    [
      state,
      vaultStatus,
      vaultEligible,
      setChildName,
      markIntroDone,
      recordAnswer,
      finishChampion,
      addMoney,
      setRewardPerAchievement,
      setTableApproved,
      openVault,
      resetAll,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used inside GameProvider')
  return context
}
