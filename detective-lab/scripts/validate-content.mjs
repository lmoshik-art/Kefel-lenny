// בדיקת תקינות של קובץ התוכן ושל מחוללי השאלות. רץ לפני כל בנייה: npm run validate
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { build } from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// הידור מודולי ה-TypeScript של המחוללים לקובץ זמני, כדי שהבדיקה תרוץ בכל גרסת Node
const tmp = mkdtempSync(join(tmpdir(), 'validate-'))
const out = join(tmp, 'engine.mjs')
await build({
  stdin: { contents: "export * from './src/engine/generators.ts'; export * from './src/engine/format.ts'", resolveDir: root, loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  logLevel: 'silent',
})
const { generate, maxLevel, decimals, sameNumber } = await import(pathToFileURL(out).href)
rmSync(tmp, { recursive: true, force: true })
const content = JSON.parse(readFileSync(join(root, 'public/content/content.json'), 'utf8'))

const errors = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)
const topics = new Set(content.topics.map((t) => t.id))
// מונחים שאינם בחומר. ״כבד/קל מהאוויר״ מותר, כי כך הוא מופיע במצגת
const BANNED = [/משקל(?!ות)/, /כבידה/, /צפיפות/, /אטום/, /מולקול/, /משוואה/, /\u2014/, /\u2013/, /רצח/, /עישון/, /אלכוהול/]

function scan(where, obj) {
  const text = JSON.stringify(obj)
  for (const re of BANNED) if (re.test(text)) err(where, `מכיל מונח או סימן אסור: ${re}`)
}

function checkQuestion(q, where) {
  if (!q.id || !q.prompt || !q.explain) err(where, 'חסרים מזהה, ניסוח או הסבר')
  if (!(q.level >= 1 && q.level <= 3)) err(where, 'רמה חייבת להיות 1 עד 3')
  switch (q.type) {
    case 'choice':
      if (!(q.correct >= 0 && q.correct < q.options.length)) err(where, 'אינדקס תשובה שגוי')
      if (new Set(q.options).size !== q.options.length) err(where, 'אפשרויות כפולות')
      break
    case 'sort': {
      const cats = new Set(q.categories.map((c) => c.id))
      for (const it of q.items) if (!cats.has(it.cat)) err(where, `קטגוריה לא קיימת: ${it.text}`)
      for (const c of cats) if (!q.items.some((it) => it.cat === c)) err(where, `קטגוריה ריקה: ${c}`)
      if (new Set(q.items.map((i) => i.text)).size !== q.items.length) err(where, 'פריטים כפולים')
      break
    }
    case 'match':
      if (new Set(q.pairs.map((p) => p.left)).size !== q.pairs.length) err(where, 'צד ימין כפול')
      if (new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) err(where, 'צד שמאל כפול')
      break
    case 'number':
      if (typeof q.value !== 'number' || !Number.isFinite(q.value)) err(where, 'ערך מספרי לא תקין')
      if (decimals(q.value) > 4) err(where, `תשובה עם יותר מדי ספרות אחרי הנקודה: ${q.value}`)
      break
    case 'order':
      if (q.items.length < 3 || new Set(q.items).size !== q.items.length) err(where, 'סידור צריך לפחות 3 פריטים שונים')
      if (!Array.isArray(q.ends) || q.ends.length !== 2) err(where, 'חסרות תוויות לקצוות')
      break
    default:
      err(where, `סוג שאלה לא מוכר: ${q.type}`)
  }
  if (q.visual?.kind === 'balance' && q.type === 'number') {
    const sum = q.visual.weights.reduce((s, w) => s + w, 0)
    if (q.visual.tilt !== 'level' || !sameNumber(sum, q.value)) err(where, 'המאזניים לא תואמים לתשובה')
  }
  if (q.visual?.kind === 'cylinder') {
    const { max, major, minor, level } = q.visual
    if (!Number.isInteger(major / minor) || !Number.isInteger(max / major)) err(where, 'שנתות לא עקביות')
    if (!Number.isInteger(Math.round((level / minor) * 1e9) / 1e9) || level <= 0 || level > max) err(where, `מפלס ${level} לא על שנתה`)
    if (q.type === 'number' && !sameNumber(level, q.value)) err(where, 'המפלס לא תואם לתשובה')
  }
  if (q.visual?.kind === 'displace') {
    const { max, minor, before, after } = q.visual
    for (const v of [before, after]) if (!Number.isInteger(Math.round((v / minor) * 1e9) / 1e9) || v <= 0 || v > max) err(where, `מפלס ${v} לא על שנתה`)
    if (!sameNumber(after - before, q.value)) err(where, 'הפרש המפלסים לא תואם לתשובה')
  }
  if (q.visual?.kind === 'box' && !sameNumber(q.visual.l * q.visual.w * q.visual.h, q.value)) err(where, 'נפח התיבה לא תואם')
  scan(where, q)
}

// מספרים אקראיים קבועים, כדי שהבדיקה תהיה זהה בכל הרצה
let seed = 12345
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

let count = 0
const ids = new Set()
for (const sk of content.skills) {
  const where = `מיומנות ${sk.id}`
  if (!topics.has(sk.topic)) err(where, `נושא לא מוכר: ${sk.topic}`)
  if (!sk.lesson?.points?.length || sk.lesson.points.length > 3) err(where, 'בשיעור צריכות להיות 1 עד 3 נקודות')
  if (!sk.lesson?.example?.steps?.length) err(where, 'חסרה דוגמה פתורה')
  scan(where, sk.lesson)
  for (const q of sk.items) {
    if (ids.has(q.id)) err(where, `מזהה כפול: ${q.id}`)
    ids.add(q.id)
    checkQuestion(q, `${where} / ${q.id}`)
    count++
  }
  // כל רמה צריכה שאלות זמינות: סטטיות או ממחולל
  for (let lv = 1; lv <= maxLevel(sk); lv++) {
    if (!sk.generators?.length && !sk.items.some((q) => q.level <= lv)) err(where, `אין שאלות לרמה ${lv}`)
  }
  for (const g of sk.generators ?? []) {
    if (g.relations) {
      for (const [big, small, f] of g.relations) {
        if (!content.units[big] || !content.units[small]) err(where, `יחידה לא מוכרת: ${big} או ${small}`)
        else if (content.units[big].family !== content.units[small].family) err(where, `המרה בין משפחות שונות: ${big}, ${small}`)
        if (!(f >= 1)) err(where, `מקדם המרה לא תקין: ${f}`)
      }
    }
    for (let lv = 1; lv <= 3; lv++) {
      for (let n = 0; n < 150; n++) {
        const q = generate(content, g, lv, rng)
        checkQuestion(q, `${where} / מחולל ${g.kind} רמה ${lv}`)
        // בדיקה עצמאית של התשובה בהמרות
        if (g.kind === 'convert') {
          const m = q.id.match(/^gen:conv:(\w+):(\w+):([\d.]+)$/)
          const rel = g.relations.find(([b, s]) => (b === m[1] && s === m[2]) || (b === m[2] && s === m[1]))
          const v = Number(m[3])
          const expected = rel[0] === m[1] ? v * rel[2] : v / rel[2]
          if (!sameNumber(expected, q.value)) err(where, `המרה שגויה: ${q.prompt} -> ${q.value}`)
          if (decimals(v) > 2) err(where, `ערך שאלה עם יותר מדי ספרות: ${v}`)
        }
        if (g.kind === 'compare' && q.options.some((o) => o.startsWith('-'))) err(where, `ערך שלילי בהשוואה: ${q.prompt}`)
        count++
      }
    }
  }
}
for (const [t, n] of Object.entries(content.exam.perTopic)) if (!topics.has(t) || !(n > 0)) err('בוחן', `נושא לא תקין: ${t}`)
for (const t of topics) if (!content.skills.some((s) => s.topic === t)) err('נושאים', `אין מיומנויות בנושא ${t}`)

if (errors.length) {
  console.error(`נמצאו ${errors.length} בעיות:`)
  for (const e of [...new Set(errors)].slice(0, 60)) console.error(' - ' + e)
  process.exit(1)
}
console.log(`התוכן תקין: ${content.skills.length} מיומנויות, ${count} שאלות ושאלות שנוצרו נבדקו.`)
