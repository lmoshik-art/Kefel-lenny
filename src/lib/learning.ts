import { FactKey, FactProgress, Question, SaveState, TABLES, TableNumber } from '../types'
import { CHAMPION_PASS_SCORE, REQUIRED_CHAMPION_DAYS } from './storage'

export const MULTIPLIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
/** מספר התשובות הנכונות הרצופות שנדרשות כדי להוציא תרגיל ממאגר החזרה */
export const REVIEW_CLEAR_STREAK = 2
/** תשובה נכונה מתחת לסף הזה נחשבת שליפה מהירה מהזיכרון */
export const FAST_ANSWER_MS = 4000
export const BASE_STARS = 1
export const FAST_BONUS_STARS = 1

export function factKey(table: number, multiplier: number): FactKey {
  return `${table}x${multiplier}`
}

export function emptyFact(): FactProgress {
  return { streak: 0, attempts: 0, correct: 0, needsReview: false }
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** מייצר שתי תשובות שגויות קרובות לתשובה הנכונה, בלי חזרות ובלי מספרים שליליים */
function distractors(table: number, multiplier: number, answer: number): number[] {
  const candidates = new Set<number>()
  const neighbours = [
    table * (multiplier + 1),
    table * (multiplier - 1),
    answer + table,
    answer - table,
    answer + 1,
    answer - 1,
    answer + 2,
    answer + 10,
  ]
  for (const value of neighbours) {
    if (value > 0 && value !== answer) candidates.add(value)
  }
  const pool = shuffle([...candidates])
  const chosen = pool.slice(0, 2)
  let extra = answer + 3
  while (chosen.length < 2) {
    if (extra !== answer && !chosen.includes(extra)) chosen.push(extra)
    extra += 1
  }
  return chosen
}

export function buildQuestion(table: TableNumber, multiplier: number): Question {
  const answer = table * multiplier
  return {
    table,
    multiplier,
    answer,
    key: factKey(table, multiplier),
    options: shuffle([answer, ...distractors(table, multiplier, answer)]),
  }
}

/**
 * בוחר את התרגיל הבא: קודם כל תרגילים שממתינים לחזרה מרווחת,
 * אחרי זה תרגילים שנענו פחות, וכשאין הפרש, בחירה אקראית.
 */
export function nextMultiplier(
  state: SaveState,
  table: TableNumber,
  avoid: number[] = [],
): number {
  const available = MULTIPLIERS.filter((m) => !avoid.includes(m))
  const pool = available.length > 0 ? available : MULTIPLIERS
  const review = pool.filter((m) => state.facts[factKey(table, m)]?.needsReview)
  if (review.length > 0) return pick(review)
  const fresh = pool.filter((m) => !state.facts[factKey(table, m)])
  if (fresh.length > 0) return pick(fresh)
  const minAttempts = Math.min(...pool.map((m) => state.facts[factKey(table, m)]?.attempts ?? 0))
  const least = pool.filter((m) => (state.facts[factKey(table, m)]?.attempts ?? 0) === minAttempts)
  return pick(least)
}

/** מעדכן את התקדמות התרגיל לפי התשובה. תרגיל שטעו בו חוזר עד שתי תשובות נכונות רצופות */
export function updateFact(previous: FactProgress | undefined, correct: boolean): FactProgress {
  const fact = previous ? { ...previous } : emptyFact()
  fact.attempts += 1
  if (correct) {
    fact.correct += 1
    fact.streak += 1
    if (fact.needsReview && fact.streak >= REVIEW_CLEAR_STREAK) fact.needsReview = false
  } else {
    fact.streak = 0
    fact.needsReview = true
  }
  return fact
}

export function starsForAnswer(correct: boolean, elapsedMs: number): number {
  if (!correct) return 0
  return elapsedMs <= FAST_ANSWER_MS ? BASE_STARS + FAST_BONUS_STARS : BASE_STARS
}

export function isTableLearned(state: SaveState, table: TableNumber): boolean {
  const progress = state.tables[table]
  if (!progress) return false
  if (progress.parentApproved) return true
  return new Set(progress.championDays).size >= REQUIRED_CHAMPION_DAYS
}

export function learnedTables(state: SaveState): TableNumber[] {
  return TABLES.filter((table) => isTableLearned(state, table))
}

export function allTablesLearned(state: SaveState): boolean {
  return learnedTables(state).length === TABLES.length
}

export function isChampionPass(score: number): boolean {
  return score >= CHAMPION_PASS_SCORE
}

/** כמה ימים נוספים של מעבר בשלב האלוף נדרשים כדי לסמן את הטבלה כנלמדה */
export function championDaysLeft(state: SaveState, table: TableNumber): number {
  const progress = state.tables[table]
  if (!progress || progress.parentApproved) return 0
  return Math.max(0, REQUIRED_CHAMPION_DAYS - new Set(progress.championDays).size)
}
