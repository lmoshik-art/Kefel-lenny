export type Visual =
  | { kind: 'balance'; weights: number[]; tilt: 'level' | 'left' | 'right' }
  | { kind: 'cylinder'; max: number; major: number; minor: number; level: number }
  | { kind: 'air' }

interface QBase {
  id: string
  level: number
  prompt: string
  hint?: string
  explain: string
  /** צעדי פתרון שמוצגים אחרי טעות שנייה */
  steps?: string[]
  visual?: Visual
}

export interface ChoiceQ extends QBase { type: 'choice'; options: string[]; correct: number }
export interface SortQ extends QBase { type: 'sort'; categories: { id: string; label: string }[]; items: { text: string; cat: string }[] }
export interface MatchQ extends QBase { type: 'match'; pairs: { left: string; right: string }[] }
export interface NumberQ extends QBase { type: 'number'; value: number; unit?: string }

export type Question = ChoiceQ | SortQ | MatchQ | NumberQ

export type Relation = [string, string, number]
export type Generator =
  | { kind: 'balance' }
  | { kind: 'cylinder' }
  | { kind: 'convert'; relations: Relation[] }
  | { kind: 'compare'; relations: Relation[] }

export interface Lesson {
  points: string[]
  demo?: 'balance' | 'cylinder' | 'air'
  table?: { head: string[]; rows: string[][] }
  example: { prompt: string; steps: string[] }
}

export interface Skill {
  id: string
  topic: string
  title: string
  lesson: Lesson
  items: Question[]
  generators?: Generator[]
}

export interface Content {
  version: number
  title: string
  topics: { id: string; name: string }[]
  units: Record<string, { family: string; one: string; many: string }>
  skills: Skill[]
  exam: { perTopic: Record<string, number> }
}

/** שאלה מוכנה להצגה בתוך אימון */
export type RunItem =
  | { kind: 'lesson'; skillId: string }
  | { kind: 'question'; skillId: string; q: Question; scaffold?: boolean; repeat?: boolean; warmup?: boolean }

export interface SkillState {
  seen: boolean
  box: number
  level: number
  streak: number
  due: string | null
  lastBoxDay: string | null
  /** תוצאות אחרונות בניסיון ראשון, מהישנה לחדשה */
  recent: boolean[]
  lastIds: string[]
}

export interface DayLog { questions: number; firstTry: number; daily: boolean; sessions: number }

export interface ExamResult { date: string; correct: number; total: number; byTopic: Record<string, { correct: number; total: number }> }

export interface Settings { theme: 'auto' | 'light' | 'dark'; reduceMotion: boolean }

export interface Progress {
  version: 2
  onboarded: boolean
  examDate: string | null
  skills: Record<string, SkillState>
  days: Record<string, DayLog>
  confidence: { sureRight: number; sureWrong: number; unsureRight: number; unsureWrong: number }
  exams: ExamResult[]
  settings: Settings
}

/** תוצאה של שאלה אחת באימון */
export interface Outcome {
  skillId: string
  qid: string
  firstTry: boolean
  solved: boolean
  sure: boolean
  repeat: boolean
  warmup: boolean
}
