import { SaveState, TABLES, TableProgress } from '../types'

const STORAGE_KEY = 'kefel-lenny-state-v1'

export const GOAL_AMOUNT = 300
export const DEFAULT_REWARD = 5
/** מספר הימים השונים שבהם צריך לעבור את שלב האלוף כדי שהטבלה תיחשב נלמדה */
export const REQUIRED_CHAMPION_DAYS = 2
/** ציון מינימלי בשלב האלוף כדי שהמעבר ייספר */
export const CHAMPION_PASS_SCORE = 5

function emptyTable(): TableProgress {
  return { introDone: false, bestScore: 0, championDays: [], parentApproved: false }
}

export function createInitialState(): SaveState {
  const tables: Record<number, TableProgress> = {}
  for (const table of TABLES) tables[table] = emptyTable()
  return {
    version: 1,
    childName: '',
    stars: 0,
    savedAmount: 0,
    rewardPerAchievement: DEFAULT_REWARD,
    goalAmount: GOAL_AMOUNT,
    vault: 'locked',
    tables,
    facts: {},
  }
}

/** משלים שדות חסרים כדי שגרסאות שמורות ישנות לא ישברו את האפליקציה */
function normalize(raw: Partial<SaveState>): SaveState {
  const base = createInitialState()
  const tables: Record<number, TableProgress> = {}
  for (const table of TABLES) {
    const saved = raw.tables?.[table]
    tables[table] = {
      introDone: Boolean(saved?.introDone),
      bestScore: Number(saved?.bestScore ?? 0),
      championDays: Array.isArray(saved?.championDays) ? saved!.championDays : [],
      parentApproved: Boolean(saved?.parentApproved),
    }
  }
  return {
    ...base,
    ...raw,
    childName: typeof raw.childName === 'string' ? raw.childName : '',
    stars: Number(raw.stars ?? 0),
    savedAmount: Number(raw.savedAmount ?? 0),
    rewardPerAchievement: Number(raw.rewardPerAchievement ?? DEFAULT_REWARD),
    goalAmount: Number(raw.goalAmount ?? GOAL_AMOUNT),
    vault: raw.vault === 'open' || raw.vault === 'ready' ? raw.vault : 'locked',
    tables,
    facts: raw.facts && typeof raw.facts === 'object' ? raw.facts : {},
  }
}

export function loadState(): SaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    return normalize(JSON.parse(raw) as Partial<SaveState>)
  } catch {
    return createInitialState()
  }
}

export function saveState(state: SaveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // אחסון חסום או מלא, המשחק ממשיך לעבוד בזיכרון בלבד
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // אין צורך בטיפול נוסף
  }
}

export function todayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
