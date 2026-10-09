import type { Progress, TaskResult, TopicId } from './types'

const KEY = 'detective-lab-progress-v1'

export function defaultProgress(): Progress {
  return {
    version: 1,
    track: null,
    introSeen: false,
    cases: {},
    topicHistory: {},
    quiz: { attempts: 0, last: null },
    evidence: { last: null },
    finaleSeen: false,
    settings: { theme: 'dark', reduceMotion: false, sound: false, rain: false, skipStory: false },
  }
}

export function loadProgress(): Progress {
  const base = defaultProgress()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<Progress>
    if (saved.version !== 1) return base
    return { ...base, ...saved, settings: { ...base.settings, ...(saved.settings ?? {}) } }
  } catch {
    return base
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* אחסון לא זמין, למשל בחלון פרטי. האפליקציה ממשיכה לעבוד בלי שמירה */
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* אין מה לנקות */
  }
}

/** שומר את 12 התוצאות האחרונות בכל נושא, לפי הצלחה בניסיון הראשון */
export function recordResults(p: Progress, results: TaskResult[]): Progress {
  const history = { ...p.topicHistory }
  for (const r of results) {
    const list = [...(history[r.topic] ?? []), r.firstTry]
    history[r.topic] = list.slice(-12)
  }
  return { ...p, topicHistory: history }
}

export type Level = 'none' | 'weak' | 'growing' | 'strong'

export function topicLevel(history: boolean[] | undefined): { level: Level; pct: number; n: number } {
  const n = history?.length ?? 0
  if (!history || n < 3) return { level: 'none', pct: 0, n }
  const pct = Math.round((history.filter(Boolean).length / n) * 100)
  return { level: pct >= 80 ? 'strong' : pct >= 50 ? 'growing' : 'weak', pct, n }
}

export const LEVEL_LABEL: Record<Level, string> = {
  none: 'עדיין אין מספיק נתונים',
  weak: 'כדאי לחזור על הנושא',
  growing: 'בדרך הנכונה',
  strong: 'שליטה טובה',
}

export const TOPIC_ORDER: TopicId[] = ['body-matter', 'mass', 'volume', 'units', 'air']
