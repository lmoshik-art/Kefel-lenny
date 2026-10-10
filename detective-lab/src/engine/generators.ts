import type { ChoiceQ, Content, Generator, NumberQ, Question, Relation, Skill } from '../types.ts'
import { decimals, fmt } from './format.ts'

/* מחוללי שאלות: מספרים חדשים בכל פעם, כך שהחזרות בודקות הבנה ולא זיכרון של תשובה */

export type Rng = () => number

const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)]

function sample<T>(rng: Rng, arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0])
  return out
}

function label(content: Content, unit: string, n: number) {
  const u = content.units[unit]
  return n === 1 ? u.one : u.many
}

function convert(content: Content, rel: Relation, level: number, rng: Rng): NumberQ {
  const [big, small, f] = rel
  let toSmall: boolean
  let value: number
  if (f === 1) {
    toSmall = rng() < 0.5
    value = pick(rng, [5, 20, 250, 500, 750])
  } else if (level === 1) {
    toSmall = true
    value = pick(rng, f >= 365 ? [1, 2, 3] : f >= 1e6 ? [1, 2, 3, 4, 5] : [2, 3, 4, 5, 6, 7, 8, 9])
  } else if (level === 2) {
    toSmall = false
    value = f * pick(rng, f >= 365 ? [1, 2, 3] : [2, 3, 4, 5, 6, 7, 8, 9])
  } else {
    toSmall = rng() < 0.5
    const pool = toSmall
      ? [0.5, 1.5, 2.5, 0.25, 3.5, 0.75].filter((v) => Number.isInteger(Math.round(v * f * 1e6) / 1e6))
      : [0.5, 0.25, 1.5, 2.5, 0.75, 0.1].map((k) => k * f).filter((v) => Number.isInteger(Math.round(v * 1e6) / 1e6))
    // ביחידות זמן מסוימות אין ערכים עשרוניים נוחים, ואז עוברים למספרים שלמים גדולים יותר
    value = pool.length ? pick(rng, pool) : toSmall ? pick(rng, [10, 12, 15, 20]) : f * pick(rng, [10, 12, 15, 20])
  }
  const from = toSmall ? big : small
  const to = toSmall ? small : big
  const answer = Math.round((toSmall ? value * f : value / f) * 1e6) / 1e6
  const op = f === 1 ? '=' : toSmall ? '×' : ':'
  const rule =
    f === 1
      ? `1 ${content.units[big].one} = 1 ${content.units[small].one}, ולכן המספר לא משתנה.`
      : toSmall
        ? `מיחידה גדולה (${content.units[big].one}) ליחידה קטנה (${content.units[small].one}) כופלים.`
        : `מיחידה קטנה (${content.units[small].one}) ליחידה גדולה (${content.units[big].one}) מחלקים.`
  const fact = `1 ${content.units[big].one} = ${fmt(f)} ${label(content, small, f)}.`
  const calc = f === 1 ? `${fmt(value)} = ${fmt(answer)}` : `${fmt(value)} ${op} ${fmt(f)} = ${fmt(answer)}`
  return {
    id: `gen:conv:${from}:${to}:${value}`,
    level,
    type: 'number',
    prompt: `השלם: ${fmt(value)} ${label(content, from, value)} = ? ${content.units[to].many}`,
    value: answer,
    unit: label(content, to, answer),
    hint: `${fact} ${rule}`,
    steps: [rule, fact, `${calc}.`],
    explain: `${calc}, ולכן ${fmt(value)} ${label(content, from, value)} = ${fmt(answer)} ${label(content, to, answer)}.`,
  }
}

function compare(content: Content, rel: Relation, level: number, rng: Rng): ChoiceQ {
  const [big, small, f] = rel
  const a = level >= 3 ? pick(rng, [1.2, 1.5, 2.5, 0.8, 0.3]) : pick(rng, [1, 2, 3, 4])
  const asSmall = Math.round(a * f * 1e6) / 1e6
  const step = f / 10
  const shift = pick(rng, [-1, 0, 1, -2, 2])
  const b = asSmall + shift * step
  const correct = b < asSmall ? 0 : b > asSmall ? 1 : 2
  const aText = `${fmt(a)} ${label(content, big, a)}`
  const bText = `${fmt(b)} ${label(content, small, b)}`
  const verdict = correct === 2 ? 'הכמויות שוות' : correct === 0 ? `${aText} גדול יותר` : `${bText} גדול יותר`
  return {
    id: `gen:cmp:${big}:${a}:${b}`,
    level,
    type: 'choice',
    prompt: `מה גדול יותר: ${aText} או ${bText}?`,
    options: [aText, bText, 'שתי הכמויות שוות'],
    correct,
    hint: `כדי להשוות, המר את שתי הכמויות לאותה יחידה. 1 ${content.units[big].one} = ${fmt(f)} ${label(content, small, f)}.`,
    steps: [
      `ממירים ל${content.units[small].many}: ${fmt(a)} × ${fmt(f)} = ${fmt(asSmall)}.`,
      `משווים ${fmt(asSmall)} ל-${fmt(b)}.`,
      `${verdict}.`,
    ],
    explain: `${aText} הם ${fmt(asSmall)} ${label(content, small, asSmall)}, ולכן ${verdict}.`,
  }
}

function balance(level: number, rng: Rng): NumberQ {
  const weights =
    level === 1
      ? sample(rng, [100, 50, 20, 10], 2)
      : level === 2
        ? sample(rng, [200, 100, 50, 20, 10, 5], 3)
        : sample(rng, [500, 200, 100, 50, 20, 20, 10, 5], 4)
  weights.sort((x, y) => y - x)
  const sum = weights.reduce((s, w) => s + w, 0)
  const calc = `${weights.join(' + ')} = ${sum}`
  return {
    id: `gen:bal:${weights.join('-')}`,
    level,
    type: 'number',
    prompt: 'המאזניים מאוזנים. הגוף בכף השמאלית והמשקולות בכף הימנית. מהי מסת הגוף בגרמים?',
    visual: { kind: 'balance', weights, tilt: 'level' },
    value: sum,
    unit: 'גרם',
    hint: 'כשהמאזניים מאוזנים, מסת הגוף שווה לסכום המשקולות. חבר את כל המספרים שבכף הימנית.',
    steps: ['המאזניים מאוזנים, ולכן מסת הגוף שווה לסכום המשקולות.', `${calc}.`, `מסת הגוף היא ${sum} גרם.`],
    explain: `${calc}, ולכן מסת הגוף היא ${sum} גרם.`,
  }
}

const CYLINDERS = [
  [{ max: 100, major: 10, minor: 5 }],
  [{ max: 100, major: 10, minor: 2 }, { max: 50, major: 10, minor: 1 }],
  [{ max: 250, major: 50, minor: 10 }],
]

function cylinder(level: number, rng: Rng): NumberQ {
  const c = pick(rng, CYLINDERS[level - 1])
  const options: number[] = []
  for (let v = c.minor; v < c.max; v += c.minor) if (v % c.major !== 0) options.push(v)
  const value = pick(rng, options)
  const base = Math.floor(value / c.major) * c.major
  const n = Math.round((value - base) / c.minor)
  const spaces = c.major / c.minor
  return {
    id: `gen:cyl:${c.max}:${c.minor}:${value}`,
    level,
    type: 'number',
    prompt: 'קרא את המפלס בכלי המדידה. מהו נפח הנוזל במ״ל?',
    visual: { kind: 'cylinder', ...c, level: value },
    value,
    unit: 'מ״ל',
    hint: `בין שתי שנתות ממוספרות יש ${c.major} מ״ל ו-${spaces} רווחים. כמה שווה כל שנתה קטנה?`,
    steps: [
      `${c.major} מ״ל מתחלקים ל-${spaces} רווחים, ולכן כל שנתה קטנה שווה ${c.minor} מ״ל.`,
      `המפלס נמצא ${n} שנתות קטנות מעל ${base}: ${n} × ${c.minor} = ${n * c.minor}.`,
      `${base} + ${n * c.minor} = ${value} מ״ל.`,
    ],
    explain: `כל שנתה קטנה שווה ${c.minor} מ״ל. המפלס ${n} שנתות מעל ${base}, ולכן הנפח ${value} מ״ל.`,
  }
}

function box(level: number, rng: Rng): NumberQ {
  const pool = level === 1 ? [2, 3, 4, 5] : level === 2 ? [3, 4, 5, 6, 8, 10] : [10, 20, 30, 40, 50, 70]
  const [l, w, h] = [pick(rng, pool), pick(rng, pool), pick(rng, pool)].sort((a, b) => b - a)
  const v = l * w * h
  const calc = `${l} × ${w} × ${h} = ${fmt(v)}`
  return {
    id: `gen:box:${l}:${w}:${h}`,
    level,
    type: 'number',
    prompt: `תיבה באורך ${l} ס״מ, ברוחב ${w} ס״מ ובגובה ${h} ס״מ. מהו הנפח שלה בסמ״ק?`,
    visual: { kind: 'box', l, w, h },
    value: v,
    unit: 'סמ״ק',
    hint: 'נפח תיבה = אורך × רוחב × גובה.',
    steps: ['נפח תיבה = אורך × רוחב × גובה.', `${calc}.`, `הנפח הוא ${fmt(v)} סמ״ק, כלומר נכנסות בתיבה ${fmt(v)} קוביות של 1 סמ״ק.`],
    explain: `${calc}, ולכן הנפח הוא ${fmt(v)} סמ״ק.`,
  }
}

const DISPLACE = [
  { max: 100, major: 10, minor: 5 },
  { max: 100, major: 10, minor: 2 },
  { max: 50, major: 10, minor: 1 },
]

function displace(level: number, rng: Rng): NumberQ {
  const c = DISPLACE[level - 1]
  const marks: number[] = []
  for (let v = c.minor * 2; v <= c.max * 0.6; v += c.minor) marks.push(v)
  const before = pick(rng, marks)
  const ups: number[] = []
  for (let d = c.minor; before + d <= c.max * 0.9; d += c.minor) if (d >= c.minor * 2) ups.push(d)
  const stone = pick(rng, ups)
  const after = before + stone
  return {
    id: `gen:dsp:${c.minor}:${before}:${after}`,
    level,
    type: 'number',
    prompt: 'אותה משורה לפני שהכניסו אבן ואחרי. מהו נפח האבן במ״ל?',
    visual: { kind: 'displace', ...c, before, after },
    value: stone,
    unit: 'מ״ל',
    hint: `קרא את שני המפלסים. כל שנתה קטנה שווה ${c.minor} מ״ל. נפח האבן = המפלס עם האבן פחות המפלס בהתחלה.`,
    steps: [`המפלס בהתחלה: ${before} מ״ל. המפלס עם האבן: ${after} מ״ל.`, `${after} פחות ${before} שווה ${stone}.`, `נפח האבן הוא ${stone} מ״ל, שהם ${stone} סמ״ק.`],
    explain: `${after} פחות ${before} שווה ${stone}, ולכן נפח האבן הוא ${stone} מ״ל.`,
  }
}

export function generate(content: Content, g: Generator, level: number, rng: Rng): Question {
  if (g.kind === 'balance') return balance(level, rng)
  if (g.kind === 'cylinder') return cylinder(level, rng)
  if (g.kind === 'box') return box(level, rng)
  if (g.kind === 'displace') return displace(level, rng)
  if (g.kind === 'compare') return compare(content, pick(rng, g.relations), Math.max(2, level), rng)
  return convert(content, pick(rng, g.relations), level, rng)
}

export function maxLevel(skill: Skill): number {
  if (skill.generators?.length) return 3
  return Math.max(1, ...skill.items.map((q) => q.level))
}

/** בוחר שאלה לרמה נתונה, ומעדיף שאלה שלא הוצגה לאחרונה */
export function pickQuestion(content: Content, skill: Skill, level: number, avoid: string[], rng: Rng): Question {
  const gens = (skill.generators ?? []).filter((g) => g.kind !== 'compare' || level >= 2)
  let statics = skill.items.filter((q) => q.level === level)
  if (!statics.length) statics = skill.items.filter((q) => q.level <= level)
  const fresh = statics.filter((q) => !avoid.includes(q.id))
  const useGen = gens.length && (!statics.length || rng() < (fresh.length ? 0.5 : 0.8))
  if (useGen) return generate(content, pick(rng, gens), level, rng)
  return pick(rng, fresh.length ? fresh : statics)
}

export { decimals }
