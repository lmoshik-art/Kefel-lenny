export type TableNumber = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export const TABLES: TableNumber[] = [2, 3, 4, 5, 6, 7, 8, 9, 10]

/** מזהה תרגיל בודד, למשל "7x4" */
export type FactKey = string

export interface FactProgress {
  /** מספר תשובות נכונות רצופות מאז הטעות האחרונה */
  streak: number
  attempts: number
  correct: number
  /** התרגיל ממתין לחזרה עד שתי תשובות נכונות רצופות */
  needsReview: boolean
}

export interface TableProgress {
  introDone: boolean
  bestScore: number
  /** תאריכי מעבר שלב האלוף בציון גבוה, בפורמט YYYY-MM-DD */
  championDays: string[]
  /** הימים שבהם כבר שולם תגמול כספי על הטבלה הזו, תשלום אחד לכל טבלה ביום */
  paidDays: string[]
  /** סימון ידני של ההורה */
  parentApproved: boolean
}

export type VaultState = 'locked' | 'ready' | 'open'

export interface SaveState {
  version: number
  childName: string
  stars: number
  savedAmount: number
  rewardPerAchievement: number
  goalAmount: number
  vault: VaultState
  tables: Record<number, TableProgress>
  facts: Record<FactKey, FactProgress>
}

export interface Question {
  table: TableNumber
  multiplier: number
  answer: number
  options: number[]
  key: FactKey
}

export type HeroMood = 'idle' | 'cheer' | 'encourage' | 'celebrate'
