import type { Progress } from '../types.ts'

const KEY = 'science-prep-v1'

export function defaultProgress(): Progress {
  return {
    version: 2,
    onboarded: false,
    examDate: null,
    skills: {},
    days: {},
    confidence: { sureRight: 0, sureWrong: 0, unsureRight: 0, unsureWrong: 0 },
    exams: [],
    settings: { theme: 'auto', reduceMotion: false },
  }
}

export function loadProgress(): Progress {
  const base = defaultProgress()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<Progress>
    if (saved.version !== 2) return base
    return { ...base, ...saved, settings: { ...base.settings, ...(saved.settings ?? {}) }, confidence: { ...base.confidence, ...(saved.confidence ?? {}) } }
  } catch {
    return base
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* אחסון לא זמין: האפליקציה ממשיכה בלי שמירה */
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY)
    // ניקוי ההתקדמות של הגרסה הקודמת של האפליקציה בנתיב הזה
    localStorage.removeItem('detective-lab-progress-v1')
  } catch {
    /* אין מה לנקות */
  }
}
