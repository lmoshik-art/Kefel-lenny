import { SaveState, TABLES, TableNumber } from '../types'
import { REQUIRED_CHAMPION_DAYS, CHAMPION_PASS_SCORE } from './storage'
import { MULTIPLIERS, factKey, isTableLearned } from './learning'

/** דוח התקדמות להורה. מחושב רק מהנתונים שכבר נשמרים במכשיר, בלי לשנות אותם */

export type TableStatus = 'learned' | 'approved' | 'progress' | 'started' | 'new'

export interface TableReport {
  table: TableNumber
  status: TableStatus
  attempts: number
  correct: number
  /** אחוז הצלחה מכל התשובות בטבלה, או null אם עוד לא נענו תרגילים */
  accuracy: number | null
  bestScore: number
  championDays: string[]
  reviewCount: number
}

export interface FactReport {
  key: string
  table: number
  multiplier: number
  attempts: number
  correct: number
  accuracy: number
  needsReview: boolean
}

export interface Report {
  tables: TableReport[]
  learnedCount: number
  totalAttempts: number
  totalCorrect: number
  accuracy: number | null
  hardFacts: FactReport[]
  reviewFacts: FactReport[]
}

const pct = (correct: number, attempts: number) => (attempts ? Math.round((correct / attempts) * 100) : null)

function tableStatus(state: SaveState, table: TableNumber, attempts: number): TableStatus {
  const progress = state.tables[table]
  const days = new Set(progress.championDays).size
  if (days >= REQUIRED_CHAMPION_DAYS) return 'learned'
  if (progress.parentApproved && isTableLearned(state, table)) return 'approved'
  if (days > 0) return 'progress'
  if (attempts > 0 || progress.introDone) return 'started'
  return 'new'
}

export function buildReport(state: SaveState): Report {
  const facts: FactReport[] = []
  const tables = TABLES.map((table) => {
    let attempts = 0
    let correct = 0
    let reviewCount = 0
    for (const m of MULTIPLIERS) {
      const fact = state.facts[factKey(table, m)]
      if (!fact) continue
      attempts += fact.attempts
      correct += fact.correct
      if (fact.needsReview) reviewCount += 1
      if (fact.attempts > 0) {
        facts.push({
          key: factKey(table, m),
          table,
          multiplier: m,
          attempts: fact.attempts,
          correct: fact.correct,
          accuracy: pct(fact.correct, fact.attempts)!,
          needsReview: fact.needsReview,
        })
      }
    }
    const progress = state.tables[table]
    return {
      table,
      status: tableStatus(state, table, attempts),
      attempts,
      correct,
      accuracy: pct(correct, attempts),
      bestScore: progress.bestScore,
      championDays: [...new Set(progress.championDays)].sort(),
      reviewCount,
    }
  })
  const totalAttempts = tables.reduce((s, t) => s + t.attempts, 0)
  const totalCorrect = tables.reduce((s, t) => s + t.correct, 0)
  // תרגילים קשים: נשאלו לפחות פעמיים והייתה בהם טעות, מהקשה ביותר
  const hardFacts = facts
    .filter((f) => f.attempts >= 2 && f.correct < f.attempts)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 8)
  const reviewFacts = facts.filter((f) => f.needsReview)
  return {
    tables,
    learnedCount: TABLES.filter((t) => isTableLearned(state, t)).length,
    totalAttempts,
    totalCorrect,
    accuracy: pct(totalCorrect, totalAttempts),
    hardFacts,
    reviewFacts,
  }
}

export const STATUS_LABEL: Record<TableStatus, string> = {
  learned: 'נלמדה',
  approved: 'אושרה ידנית',
  progress: 'עברה מבחן אלוף פעם אחת',
  started: 'בתרגול',
  new: 'עוד לא התחילה',
}

export function formatDay(day: string): string {
  const [y, m, d] = day.split('-')
  return y && m && d ? `${Number(d)}.${Number(m)}` : day
}

/** תרגיל בכיוון קריאה תקין גם בתוך משפט עברי */
export function factLabel(f: { table: number; multiplier: number }): string {
  return `${f.table} × ${f.multiplier} = ${f.table * f.multiplier}`
}

export function reportText(state: SaveState, report: Report): string {
  const name = state.childName ? ` של ${state.childName}` : ''
  const lines: string[] = [`דוח התקדמות בלוח הכפל${name}`, '']
  lines.push(`טבלאות שנלמדו: ${report.learnedCount} מתוך ${TABLES.length}`)
  lines.push(
    report.accuracy === null
      ? 'עוד לא נענו תרגילים.'
      : `תשובות נכונות: ${report.totalCorrect} מתוך ${report.totalAttempts} (${report.accuracy}%)`,
  )
  lines.push(`חיסכון: ${state.savedAmount} ₪ מתוך ${state.goalAmount} ₪`, '')
  lines.push('לפי טבלה:')
  for (const t of report.tables) {
    const acc = t.accuracy === null ? 'אין תשובות' : `${t.accuracy}% נכון`
    const best = t.bestScore ? `, שיא במבחן האלוף ${t.bestScore} מתוך ${CHAMPION_PASS_SCORE}` : ''
    lines.push(`טבלת ${t.table}: ${STATUS_LABEL[t.status]}, ${acc}${best}`)
  }
  if (report.hardFacts.length) {
    lines.push('', 'תרגילים שכדאי לחזור עליהם:')
    for (const f of report.hardFacts) lines.push(`${factLabel(f)} (${f.correct} מתוך ${f.attempts} נכון)`)
  }
  return lines.join('\n')
}
