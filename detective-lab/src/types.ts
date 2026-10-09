export type TopicId = 'body-matter' | 'mass' | 'volume' | 'units' | 'air'

export type Visual =
  | { kind: 'balance'; weights: number[]; tilt: 'level' | 'left' | 'right' }
  | { kind: 'cylinder'; max: number; major: number; minor: number; level: number }
  | { kind: 'air' }

interface TaskBase {
  id: string
  prompt: string
  hint?: string
  explain: string
  takeaway?: string
  visual?: Visual
}

export interface ChoiceTask extends TaskBase { type: 'choice'; options: string[]; correct: number }
export interface SortTask extends TaskBase {
  type: 'sort'
  categories: { id: string; label: string }[]
  items: { text: string; cat: string }[]
}
export interface MatchTask extends TaskBase { type: 'match'; pairs: { left: string; right: string }[] }
export interface NumberTask extends TaskBase {
  type: 'number'
  value: number
  unit?: string
  convert?: { value: number; from: string; to: string }
}

export type TaskCore = ChoiceTask | SortTask | MatchTask | NumberTask
export type Task = TaskCore & { twin?: TaskCore; topic?: TopicId }

/** משימה מוכנה להרצה, עם הנושא שלה ועם סימון אם היא שאלה מקבילה לחזרה */
export type RunTask = TaskCore & { topic: TopicId; twin?: TaskCore; repeat?: boolean }

export type Demo =
  | { kind: 'bodyMatter'; title: string; instructions: string; items: { body: string; materials: string[] }[]; conclusion: string }
  | { kind: 'balance'; title: string; instructions: string; objectMass: number; available: number[]; conclusion: string; note?: string }
  | { kind: 'cylinder'; title: string; instructions: string; max: number; major: number; minor: number; start: number; conclusion: string; note?: string }
  | { kind: 'converter'; title: string; instructions: string; presets: number[]; conclusion: string }
  | { kind: 'air'; title: string; instructions: string; conclusion: string }

export interface Lab { title: string; status: 'pending' | 'ready'; text: string }

export interface CaseFile {
  id: string
  topic: TopicId
  number: number
  title: string
  intro: string
  explanation: string[]
  demo: Demo
  lab?: Lab
  clue: string
  tasks: Task[]
}

export interface Content {
  version: number
  topics: Record<TopicId, string>
  story: { title: string; opening: string; frameNote: string; finale: string }
  cases: CaseFile[]
  quiz: (Task & { topic: TopicId })[]
}

export interface AssetSlot { type: 'image' | 'video'; src: string; poster?: string; alt: string }
export interface Assets { office: AssetSlot; introClip: AssetSlot; evidence: AssetSlot; outroClip: AssetSlot; finale?: AssetSlot }

export interface TaskResult { taskId: string; topic: TopicId; firstTry: boolean; solved: boolean; repeat: boolean; takeaway?: string }

export interface Settings {
  theme: 'dark' | 'light'
  reduceMotion: boolean
  sound: boolean
  rain: boolean
  skipStory: boolean
}

export interface Progress {
  version: 1
  track: 'beginner' | 'evidence' | null
  introSeen: boolean
  cases: Record<string, { completed: boolean; solved: string[]; review: string[] }>
  topicHistory: Partial<Record<TopicId, boolean[]>>
  quiz: { attempts: number; last: Partial<Record<TopicId, { correct: number; total: number }>> | null }
  evidence: { last: Partial<Record<TopicId, { correct: number; total: number }>> | null }
  finaleSeen: boolean
  settings: Settings
}
