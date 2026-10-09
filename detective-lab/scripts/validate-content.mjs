// בדיקת תקינות של קובץ התוכן. רץ אוטומטית לפני כל בנייה, וגם ידנית: npm run validate
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const content = JSON.parse(readFileSync(join(root, 'public/content/content.json'), 'utf8'))

const TOPICS = ['body-matter', 'mass', 'volume', 'units', 'air']
// מונחים שמחוץ לגבולות החומר שנמסר. "משקולות" הוא שם של כלי ולכן מותר
const BANNED = [/צפיפות/, /לחץ (ה?אוויר|אטמוספ|ה?גז)/, /בלחץ/, /אטום/, /מולקול/, /משוואה/, /משקל(?!ות)/, /כבידה/, /סמ״ק/, /סמ"ק/, /סנטימטר מעוקב/, /\u2014/, /\u2013/, /עישון/, /סיגרי/, /אלכוהול/, /רצח/, /אש\b/, /להבה/, /גפרור/]
const FACTOR = { 'kg>g': 1000, 'g>kg': 1 / 1000, 'l>ml': 1000, 'ml>l': 1 / 1000 }

const errors = []
const ids = new Set()
let count = 0
const err = (where, msg) => errors.push(`${where}: ${msg}`)
const close = (a, b) => Math.abs(a - b) < 1e-9

function scanText(where, obj) {
  const text = JSON.stringify(obj)
  for (const re of BANNED) if (re.test(text)) err(where, `מכיל מונח אסור או סימן אסור: ${re}`)
}

function checkTask(t, topic, where) {
  count++
  if (!TOPICS.includes(topic)) err(where, `נושא לא מוכר: ${topic}`)
  if (ids.has(t.id)) err(where, `מזהה כפול: ${t.id}`)
  ids.add(t.id)
  if (!t.prompt || !t.explain) err(where, 'חסרים ניסוח שאלה או הסבר')
  switch (t.type) {
    case 'choice':
      if (!Array.isArray(t.options) || t.options.length < 2) err(where, 'מעט מדי אפשרויות')
      if (!(t.correct >= 0 && t.correct < t.options.length)) err(where, 'אינדקס התשובה מחוץ לטווח')
      if (new Set(t.options).size !== t.options.length) err(where, 'אפשרויות כפולות')
      break
    case 'sort': {
      const cats = new Set(t.categories.map((c) => c.id))
      for (const it of t.items) if (!cats.has(it.cat)) err(where, `פריט "${it.text}" משויך לקטגוריה שאינה קיימת`)
      for (const c of cats) if (!t.items.some((it) => it.cat === c)) err(where, `קטגוריה ${c} ריקה`)
      if (new Set(t.items.map((i) => i.text)).size !== t.items.length) err(where, 'פריטים כפולים')
      break
    }
    case 'match':
      if (new Set(t.pairs.map((p) => p.left)).size !== t.pairs.length) err(where, 'צד ימין כפול בהתאמה')
      if (new Set(t.pairs.map((p) => p.right)).size !== t.pairs.length) err(where, 'צד שמאל כפול בהתאמה')
      break
    case 'number':
      if (typeof t.value !== 'number') err(where, 'חסר ערך מספרי')
      break
    default:
      err(where, `סוג משימה לא מוכר: ${t.type}`)
  }
  if (t.convert) {
    const f = FACTOR[`${t.convert.from}>${t.convert.to}`]
    if (!f) err(where, 'המרה לא נתמכת. מותרות רק ק״ג וגרם, ליטר ומיליליטר')
    else if (!close(t.convert.value * f, t.value)) err(where, `המרה שגויה: ${t.convert.value} ${t.convert.from} אינו ${t.value} ${t.convert.to}`)
  }
  if (t.visual?.kind === 'balance') {
    const sum = t.visual.weights.reduce((s, w) => s + w, 0)
    if (t.type === 'number' && t.visual.tilt !== 'level') err(where, 'שאלת קריאת מסה חייבת להציג מאזניים מאוזנים')
    if (t.type === 'number' && !close(sum, t.value)) err(where, `סכום המשקולות ${sum} אינו התשובה ${t.value}`)
    if (t.type === 'number' && !/ג׳|גרם/.test(t.unit ?? '')) err(where, 'יחידת התשובה במאזניים צריכה להיות גרם')
  }
  if (t.visual?.kind === 'cylinder') {
    const { max, major, minor, level } = t.visual
    if (!Number.isInteger(major / minor)) err(where, 'השנתות הממוספרות אינן כפולה של השנתות הקטנות')
    if (!Number.isInteger(max / major)) err(where, 'קצה הסקלה אינו שנתה ממוספרת')
    if (!Number.isInteger(Math.round((level / minor) * 1e9) / 1e9)) err(where, `המפלס ${level} אינו נופל על שנתה`)
    if (level <= 0 || level > max) err(where, 'המפלס מחוץ לסקלה')
    if (t.type === 'number' && !close(level, t.value)) err(where, `המפלס ${level} אינו התשובה ${t.value}`)
  }
  scanText(where, t)
  if (t.twin) {
    if (t.twin.type !== t.type) err(where, 'שאלה מקבילה חייבת להיות מאותו סוג')
    checkTask(t.twin, topic, `${where} (מקבילה)`)
  }
}

if (content.cases.length !== 5) err('תיקים', 'צריכים להיות בדיוק חמישה תיקים')
const caseTopics = content.cases.map((c) => c.topic)
for (const t of TOPICS) if (!caseTopics.includes(t)) err('תיקים', `אין תיק לנושא ${t}`)

for (const c of content.cases) {
  const where = `תיק ${c.number}`
  if (c.explanation.length > 3) err(where, 'ההסבר ארוך משלושה משפטים')
  if (c.tasks.length < 3 || c.tasks.length > 5) err(where, 'צריכות להיות 3 עד 5 משימות')
  if (new Set(c.tasks.map((t) => t.type)).size < 2) err(where, 'המשימות צריכות להיות מגוונות')
  scanText(where, { intro: c.intro, explanation: c.explanation, demo: c.demo, clue: c.clue })
  for (const t of c.tasks) checkTask(t, c.topic, `${where} / ${t.id}`)
  if (c.demo.kind === 'balance') {
    // בדיקה שאפשר לאזן את ההדגמה עם עד ארבע משקולות מהזמינות
    const ok = (target, n) => target === 0 || (n > 0 && c.demo.available.some((w) => w <= target && ok(target - w, n - 1)))
    if (!ok(c.demo.objectMass, 4)) err(where, 'אי אפשר לאזן את ההדגמה בעד ארבע משקולות')
  }
  if (c.demo.kind === 'cylinder' && c.demo.start % c.demo.minor !== 0) err(where, 'מפלס ההתחלה בהדגמה אינו על שנתה')
}

// אזורי המעבדה: בדיוק שלושה, וכל עוד הם ממתינים אסור שיהיה בהם תוכן
const labs = content.cases.filter((c) => c.lab)
if (labs.map((c) => c.topic).sort().join() !== ['air', 'mass', 'volume'].join()) err('מעבדות', 'צריכים להיות אזורי מעבדה למסה, לנפח ולפד״ח בלבד')
for (const c of labs) if (c.lab.status === 'pending' && c.lab.text) err(`מעבדה ${c.lab.title}`, 'במצב ממתין אסור שיהיה טקסט')

for (const q of content.quiz) checkTask(q, q.topic, `בוחן / ${q.id}`)
for (const t of TOPICS) if (!content.quiz.some((q) => q.topic === t)) err('בוחן', `אין שאלה בנושא ${t}`)
scanText('עלילה', content.story)

if (errors.length) {
  console.error(`נמצאו ${errors.length} בעיות בתוכן:`)
  for (const e of errors) console.error(' - ' + e)
  process.exit(1)
}
console.log(`התוכן תקין: ${count} משימות ושאלות נבדקו, כולן משויכות לחמשת נושאי המבחן.`)
