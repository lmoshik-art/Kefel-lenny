import type { Content, Outcome, Progress, RunItem, Skill, SkillState } from '../types.ts'
import { maxLevel, pickQuestion, type Rng } from './generators.ts'

/* לוח החזרות: חזרה מרווחת (Leitner) לפי מיומנות, עם רמת קושי מסתגלת */

export const SESSION_QUESTIONS = 12
/** כמה ימים עד החזרה הבאה, לפי ״קופסה״. מותאם להכנה של כשבוע */
const INTERVALS = [0, 1, 2, 3, 5]

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n))
}

export function diffDays(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

export function emptySkill(): SkillState {
  return { seen: false, box: 0, level: 1, streak: 0, due: null, lastBoxDay: null, recent: [], lastIds: [] }
}

export function skillState(p: Progress, id: string): SkillState {
  return p.skills[id] ?? emptySkill()
}

export function daysToExam(p: Progress, today = dayKey()): number | null {
  return p.examDate ? diffDays(today, p.examDate) : null
}

export type ReadyLabel = 'new' | 'started' | 'almost' | 'ready'

export const READY_TEXT: Record<ReadyLabel, string> = {
  new: 'עוד לא התחלת',
  started: 'בתרגול',
  almost: 'כמעט מוכן',
  ready: 'מוכן',
}

/** מוכנות למיומנות: לפי 6 התשובות האחרונות בניסיון ראשון ולפי הרמה שהושגה */
export function readiness(skill: Skill, s: SkillState): { label: ReadyLabel; pct: number } {
  if (!s.seen) return { label: 'new', pct: 0 }
  const last = s.recent.slice(-6)
  if (!last.length) return { label: 'started', pct: 0 }
  const pct = Math.round((last.filter(Boolean).length / last.length) * 100)
  const top = s.level >= maxLevel(skill)
  if (last.length >= 4 && pct >= 80 && top) return { label: 'ready', pct }
  if (last.length >= 3 && pct >= 70) return { label: 'almost', pct }
  return { label: 'started', pct }
}

function interleave(groups: RunItem[][]): RunItem[] {
  const out: RunItem[] = []
  const queues = groups.map((g) => [...g])
  while (queues.some((q) => q.length)) {
    for (const q of queues) if (q.length) out.push(q.shift()!)
  }
  return out
}

/** בונה את האימון היומי: חימום בהצלחה, נושאים חדשים עם דוגמה, וחזרות מעורבבות */
export function buildSession(content: Content, p: Progress, rng: Rng, opts: { extra?: boolean } = {}): RunItem[] {
  const today = dayKey()
  const seen = content.skills.filter((sk) => skillState(p, sk.id).seen)
  const unseen = content.skills.filter((sk) => !skillState(p, sk.id).seen)
  const left = daysToExam(p, today)
  const horizon = left === null ? 5 : Math.max(1, left - 1)
  // כשנשארו מעט ימים מוצגים עד 4 נושאים חדשים ביום, כדי שהיום האחרון יוקדש לחזרה
  const cap = left !== null && left <= 5 ? 4 : 3
  let newCount = unseen.length ? Math.min(cap, Math.max(1, Math.ceil(unseen.length / horizon))) : 0
  if (opts.extra) newCount = Math.min(newCount, 1)

  const q = (sk: Skill, level: number, extra: Partial<RunItem & { kind: 'question' }> = {}): RunItem => {
    const st = skillState(p, sk.id)
    return { kind: 'question', skillId: sk.id, q: pickQuestion(content, sk, level, st.lastIds, rng), ...extra }
  }

  const items: RunItem[] = []
  // חימום: שתי שאלות ממיומנויות חזקות, ברמה נוחה, כדי לפתוח בהצלחה
  const strong = [...seen].sort((a, b) => readiness(b, skillState(p, b.id)).pct - readiness(a, skillState(p, a.id)).pct)
  for (const sk of strong.slice(0, 2)) items.push(q(sk, Math.max(1, skillState(p, sk.id).level - 1), { warmup: true }))

  for (const sk of unseen.slice(0, newCount)) {
    items.push({ kind: 'lesson', skillId: sk.id })
    items.push(q(sk, 1, { scaffold: true }))
    items.push(q(sk, 1))
  }

  const countQ = () => items.filter((i) => i.kind === 'question').length
  const due = seen
    .filter((sk) => {
      const st = skillState(p, sk.id)
      return !st.due || st.due <= today
    })
    .sort((a, b) => readiness(a, skillState(p, a.id)).pct - readiness(b, skillState(p, b.id)).pct)
  const pool = due.length ? due : [...seen].sort((a, b) => readiness(a, skillState(p, a.id)).pct - readiness(b, skillState(p, b.id)).pct)
  const groups: RunItem[][] = pool.map(() => [])
  let i = 0
  while (pool.length && countQ() + groups.flat().length < SESSION_QUESTIONS && i < 60) {
    const k = i % pool.length
    groups[k].push(q(pool[k], skillState(p, pool[k].id).level))
    i++
  }
  // אם אין מספיק חזרות (למשל ביום הראשון), מוסיפים תרגול בנושאים החדשים
  const reviews = interleave(groups)
  const newSkills = unseen.slice(0, newCount)
  let j = 0
  while (newSkills.length && countQ() + reviews.length < SESSION_QUESTIONS && j < 20) {
    reviews.push(q(newSkills[j % newSkills.length], 1))
    j++
  }
  return [...items, ...reviews]
}

/** שאלה מקבילה לחזרה בהמשך האימון, אחרי טעות */
export function repeatItem(content: Content, p: Progress, skillId: string, avoid: string, rng: Rng): RunItem {
  const sk = content.skills.find((s) => s.id === skillId)!
  const st = skillState(p, skillId)
  return { kind: 'question', skillId, q: pickQuestion(content, sk, Math.max(1, st.level), [...st.lastIds, avoid], rng), repeat: true }
}

export function markSeen(p: Progress, skillId: string): Progress {
  const st = skillState(p, skillId)
  return { ...p, skills: { ...p.skills, [skillId]: { ...st, seen: true } } }
}

/** מעדכן מיומנות אחרי תשובה. נספר רק הניסיון הראשון */
export function applyOutcome(content: Content, p: Progress, o: Outcome): Progress {
  const today = dayKey()
  const sk = content.skills.find((s) => s.id === o.skillId)!
  const prev = skillState(p, o.skillId)
  const st = { ...prev, seen: prev.seen || !o.exam }
  st.recent = [...st.recent, o.firstTry].slice(-8)
  st.lastIds = [...st.lastIds.filter((x) => x !== o.qid), o.qid].slice(-6)
  if (!o.warmup && !o.exam) {
    if (o.firstTry) {
      st.streak += 1
      if (st.streak >= 2 && st.level < maxLevel(sk)) {
        st.level += 1
        st.streak = 0
      }
      if (st.lastBoxDay !== today) {
        st.box = Math.min(st.box + 1, INTERVALS.length - 1)
        st.lastBoxDay = today
      }
    } else {
      st.streak = 0
      st.level = Math.max(1, st.level - 1)
      st.box = 1
      st.lastBoxDay = today
    }
    let due = addDays(today, Math.max(1, INTERVALS[st.box]))
    // כל מיומנות חוזרת לפחות פעם אחת לפני יום המבחן
    if (p.examDate) {
      const last = addDays(p.examDate, -1)
      if (due > last && last > today) due = last
    }
    st.due = due
  }
  const day = p.days[today] ?? { questions: 0, firstTry: 0, daily: false, sessions: 0 }
  const conf = { ...p.confidence }
  if (o.sure) o.firstTry ? conf.sureRight++ : conf.sureWrong++
  else o.firstTry ? conf.unsureRight++ : conf.unsureWrong++
  return {
    ...p,
    skills: { ...p.skills, [o.skillId]: st },
    days: { ...p.days, [today]: { ...day, questions: day.questions + 1, firstTry: day.firstTry + (o.firstTry ? 1 : 0) } },
    confidence: conf,
  }
}

/** סימולציית מבחן: שאלות מכל הנושאים ברמה 2 ומעלה, לפי משקל כל נושא */
export function buildExam(content: Content, p: Progress, rng: Rng): RunItem[] {
  const out: RunItem[] = []
  for (const [topic, n] of Object.entries(content.exam.perTopic)) {
    const skills = content.skills.filter((s) => s.topic === topic)
    for (let k = 0; k < n; k++) {
      const sk = skills[Math.floor(rng() * skills.length)]
      const level = Math.min(maxLevel(sk), 2 + (rng() < 0.4 ? 1 : 0))
      out.push({ kind: 'question', skillId: sk.id, q: pickQuestion(content, sk, level, skillState(p, sk.id).lastIds, rng) })
    }
  }
  // ערבוב מלא של סדר השאלות
  for (let k = out.length - 1; k > 0; k--) {
    const r = Math.floor(rng() * (k + 1))
    ;[out[k], out[r]] = [out[r], out[k]]
  }
  return out
}
