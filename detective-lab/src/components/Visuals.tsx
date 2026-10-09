import { useState } from 'react'
import type { Demo, Visual } from '../types'

/* ההמחשות המדעיות נבנות כאן בקוד, כדי שהנתונים שמוצגים יהיו תמיד תואמים לתשובה הנכונה */

export function fmt(n: number): string {
  return String(Math.round(n * 1e6) / 1e6)
}

const WEIGHT_H: Record<number, number> = { 500: 36, 200: 32, 100: 28, 50: 24, 20: 20, 10: 17, 5: 15 }

function BalanceSvg({ weights, tilt, objectLabel = '?' }: { weights: number[]; tilt: 'level' | 'left' | 'right'; objectLabel?: string }) {
  const deg = tilt === 'left' ? -8 : tilt === 'right' ? 8 : 0
  const a = (deg * Math.PI) / 180
  const px = 180
  const py = 62
  const half = 125
  const L = { x: px - half * Math.cos(a), y: py - half * Math.sin(a) }
  const R = { x: px + half * Math.cos(a), y: py + half * Math.sin(a) }
  const hang = 78
  const panW = 104
  const desc =
    tilt === 'level'
      ? 'מאזני כפות מאוזנים'
      : tilt === 'left'
        ? 'מאזני כפות: הכף השמאלית, עם הגוף, נמוכה יותר'
        : 'מאזני כפות: הכף הימנית, עם המשקולות, נמוכה יותר'
  const spacing = Math.min(25, (panW - 8) / Math.max(weights.length, 1))
  const startX = R.x - (spacing * weights.length) / 2 + spacing / 2

  return (
    <figure className="visual">
      <svg viewBox="0 0 360 230" role="img" aria-label={`${desc}. בכף הימנית משקולות: ${weights.map((w) => `${w} גרם`).join(', ')}.`}>
        <rect x="150" y="205" width="60" height="10" rx="3" className="metal" />
        <rect x="176" y={py} width="8" height="145" className="metal" />
        <g className="beam" style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${px}px ${py}px` }}>
          <rect x={px - half} y={py - 4} width={half * 2} height="8" rx="4" className="metal" />
        </g>
        <circle cx={px} cy={py} r="7" className="pivot" />
        {[L, R].map((p, i) => (
          <g key={i} className="pan-group">
            <line x1={p.x} y1={p.y} x2={p.x - panW / 2 + 6} y2={p.y + hang} className="string" />
            <line x1={p.x} y1={p.y} x2={p.x + panW / 2 - 6} y2={p.y + hang} className="string" />
            <path d={`M ${p.x - panW / 2} ${p.y + hang} Q ${p.x} ${p.y + hang + 18} ${p.x + panW / 2} ${p.y + hang} Z`} className="pan" />
          </g>
        ))}
        <rect x={L.x - 26} y={L.y + hang - 44} width="52" height="44" rx="4" className="object-box" />
        <text x={L.x} y={L.y + hang - 15} className="object-label" textAnchor="middle">{objectLabel}</text>
        {weights.map((w, i) => {
          const h = WEIGHT_H[w] ?? 18
          const cx = startX + i * spacing
          return (
            <g key={i}>
              <rect x={cx - spacing / 2 + 1.5} y={R.y + hang - h} width={spacing - 3} height={h} rx="3" className="weight" />
              <text x={cx} y={R.y + hang - h / 2 + 4} className="weight-label" textAnchor="middle">{w}</text>
            </g>
          )
        })}
      </svg>
      <figcaption>
        הגוף בכף השמאלית. בכף הימנית משקולות (המספרים בגרמים): {weights.map((w) => `${w} ג׳`).join(', ')}
      </figcaption>
    </figure>
  )
}

function CylinderSvg({ max, major, minor, level }: { max: number; major: number; minor: number; level: number }) {
  const bottom = 312
  const top = 42
  const y = (v: number) => bottom - (v * (bottom - top)) / max
  const ticks: number[] = []
  for (let v = minor; v <= max + 1e-9; v += minor) ticks.push(Math.round(v * 1e6) / 1e6)
  return (
    <figure className="visual">
      <svg viewBox="0 0 220 340" role="img" aria-label={`כלי מדידה מדורג עד ${max} מיליליטר. שנתות ממוספרות כל ${major} מ״ל ושנתות קטנות כל ${minor} מ״ל. המפלס מסומן בקו.`}>
        <path d={`M 92 ${top - 22} L 92 ${bottom + 6} Q 92 ${bottom + 14} 100 ${bottom + 14} L 152 ${bottom + 14} Q 160 ${bottom + 14} 160 ${bottom + 6} L 160 ${top - 22}`} className="glass" />
        <rect x="94" y={y(level)} width="64" height={bottom + 12 - y(level)} className="liquid" />
        <line x1="94" x2="158" y1={y(level)} y2={y(level)} className="level-line" />
        {ticks.map((v) => {
          const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-9
          return (
            <g key={v}>
              <line x1={isMajor ? 72 : 80} x2="92" y1={y(v)} y2={y(v)} className={isMajor ? 'tick-major' : 'tick-minor'} />
              {isMajor && (
                <text x="66" y={y(v) + 4.5} textAnchor="end" className="tick-label">{fmt(v)}</text>
              )}
            </g>
          )
        })}
        <line x1="72" x2="92" y1={bottom} y2={bottom} className="tick-major" />
        <text x="66" y={bottom + 4.5} textAnchor="end" className="tick-label">0</text>
        <text x="30" y="24" className="unit-label" textAnchor="middle">מ״ל</text>
      </svg>
      <figcaption>שנתות ממוספרות כל {major} מ״ל. השנתות הקטנות מחלקות כל קטע ל-{major / minor} רווחים שווים.</figcaption>
    </figure>
  )
}

export const AIR_PARTS = [
  { id: 'n2', label: 'חנקן', pct: 78, cls: 'air-n' },
  { id: 'o2', label: 'חמצן', pct: 21, cls: 'air-o' },
  { id: 'other', label: 'גזים אחרים (ובהם פחמן דו-חמצני)', pct: 1, cls: 'air-x' },
]

export function AirChart({ interactive = false }: { interactive?: boolean }) {
  const [focus, setFocus] = useState<string | null>(null)
  const cells: string[] = []
  AIR_PARTS.forEach((p) => {
    for (let i = 0; i < p.pct; i++) cells.push(p.id)
  })
  return (
    <figure className="visual air">
      <div className="air-grid" role="img" aria-label="תרשים של 100 משבצות: 78 חנקן, 21 חמצן ו-1 גזים אחרים, באוויר יבש בקירוב">
        {cells.map((id, i) => {
          const part = AIR_PARTS.find((p) => p.id === id)!
          return <span key={i} className={`cell ${part.cls} ${focus && focus !== id ? 'dim' : ''}`} />
        })}
      </div>
      <div className="air-legend">
        {AIR_PARTS.map((p) =>
          interactive ? (
            <button
              key={p.id}
              type="button"
              className={`legend-btn ${focus === p.id ? 'on' : ''}`}
              aria-pressed={focus === p.id}
              onClick={() => setFocus(focus === p.id ? null : p.id)}
            >
              <span className={`swatch ${p.cls}`} /> {p.label}: כ-{p.pct}%
            </button>
          ) : (
            <span key={p.id} className="legend-item">
              <span className={`swatch ${p.cls}`} /> {p.label}
            </span>
          ),
        )}
      </div>
      <figcaption>
        אוויר יבש, אחוזים מקורבים. כמות אדי המים באוויר משתנה, ולכן אינה מוצגת.
        {interactive && focus === 'other' && ' הפחמן הדו-חמצני הוא כ-0.04% בלבד, הרבה פחות ממשבצת אחת.'}
      </figcaption>
    </figure>
  )
}

export function VisualView({ visual }: { visual: Visual }) {
  if (visual.kind === 'balance') return <BalanceSvg weights={visual.weights} tilt={visual.tilt} />
  if (visual.kind === 'cylinder') return <CylinderSvg {...visual} />
  return <AirChart />
}

/* ---------- דוגמאות מודרכות ---------- */

function BodyMatterDemo({ demo }: { demo: Extract<Demo, { kind: 'bodyMatter' }> }) {
  const [open, setOpen] = useState<boolean[]>(demo.items.map(() => false))
  const all = open.every(Boolean)
  return (
    <>
      <div className="evidence-cards">
        {demo.items.map((it, i) => (
          <button
            key={i}
            type="button"
            className={`evidence-card ${open[i] ? 'open' : ''}`}
            aria-expanded={open[i]}
            onClick={() => setOpen(open.map((o, j) => (j === i ? !o : o)))}
          >
            <span className="card-tag">ראיה {i + 1}</span>
            <span className="card-body">{it.body}</span>
            {open[i] ? (
              <span className="card-reveal">
                <b>גוף:</b> {it.body}
                <br />
                <b>{it.materials.length > 1 ? 'חומרים' : 'חומר'}:</b> {it.materials.join(' ו')}
              </span>
            ) : (
              <span className="card-hint">לחץ לפתיחה</span>
            )}
          </button>
        ))}
      </div>
      {all && <p className="demo-conclusion">{demo.conclusion}</p>}
    </>
  )
}

function BalanceDemo({ demo }: { demo: Extract<Demo, { kind: 'balance' }> }) {
  const [onPan, setOnPan] = useState<number[]>([])
  const sum = onPan.reduce((s, w) => s + w, 0)
  const tilt = sum === demo.objectMass ? 'level' : sum < demo.objectMass ? 'left' : 'right'
  const sorted = [...onPan].sort((a, b) => b - a)
  return (
    <>
      <BalanceSvg weights={sorted} tilt={tilt} objectLabel={tilt === 'level' ? `${demo.objectMass}` : '?'} />
      <div className="demo-controls" role="group" aria-label="הוספת משקולות">
        {demo.available.map((w) => (
          <button key={w} type="button" className="btn small" onClick={() => onPan.length < 4 && setOnPan([...onPan, w])} disabled={onPan.length >= 4}>
            הוסף {w} ג׳
          </button>
        ))}
        <button type="button" className="btn small ghost" onClick={() => setOnPan(onPan.slice(0, -1))} disabled={!onPan.length}>
          הסר את האחרונה
        </button>
      </div>
      <p className="status-line" aria-live="polite">
        סכום המשקולות: {sum} ג׳.{' '}
        {tilt === 'level'
          ? `המאזניים מאוזנים, ולכן מסת הקופסה היא ${demo.objectMass} גרם.`
          : tilt === 'left'
            ? 'הכף עם הקופסה נמוכה יותר: מסת הקופסה גדולה מסכום המשקולות. הוסף משקולת.'
            : 'הכף עם המשקולות נמוכה יותר: סכום המשקולות גדול ממסת הקופסה. הסר משקולת.'}
        {onPan.length >= 4 && tilt !== 'level' ? ' אפשר לשים עד ארבע משקולות. נסה צירוף אחר.' : ''}
      </p>
      {tilt === 'level' && <p className="demo-conclusion">{demo.conclusion}</p>}
    </>
  )
}

function CylinderDemo({ demo }: { demo: Extract<Demo, { kind: 'cylinder' }> }) {
  const [level, setLevel] = useState(demo.start)
  const set = (v: number) => setLevel(Math.max(0, Math.min(demo.max, v)))
  const base = Math.floor(level / demo.major) * demo.major
  const steps = Math.round((level - base) / demo.minor)
  return (
    <>
      <CylinderSvg max={demo.max} major={demo.major} minor={demo.minor} level={level} />
      <div className="demo-controls" role="group" aria-label="שינוי כמות הנוזל">
        <button type="button" className="btn small" onClick={() => set(level + demo.minor)}>הוסף {demo.minor} מ״ל</button>
        <button type="button" className="btn small" onClick={() => set(level - demo.minor)}>הוצא {demo.minor} מ״ל</button>
        <button type="button" className="btn small ghost" onClick={() => set(level + demo.major)}>הוסף {demo.major} מ״ל</button>
        <button type="button" className="btn small ghost" onClick={() => set(level - demo.major)}>הוצא {demo.major} מ״ל</button>
      </div>
      <p className="status-line" aria-live="polite">
        קריאה: השנתה הממוספרת שמתחת למפלס היא {base}
        {steps > 0 ? `, ועוד ${steps} ${steps === 1 ? 'שנתה קטנה' : 'שנתות קטנות'} של ${demo.minor} מ״ל` : ''}. הנפח: <b>{level} מ״ל</b>.
      </p>
      <p className="demo-conclusion">{demo.conclusion}</p>
    </>
  )
}

const CONVERSIONS = [
  { id: 'kg-g', from: 'ק״ג', to: 'גרם', mul: true },
  { id: 'g-kg', from: 'גרם', to: 'ק״ג', mul: false },
  { id: 'l-ml', from: 'ליטר', to: 'מ״ל', mul: true },
  { id: 'ml-l', from: 'מ״ל', to: 'ליטר', mul: false },
]

function ConverterDemo({ demo }: { demo: Extract<Demo, { kind: 'converter' }> }) {
  const [conv, setConv] = useState(CONVERSIONS[0])
  const [val, setVal] = useState(2)
  const result = conv.mul ? val * 1000 : val / 1000
  return (
    <>
      <div className="demo-controls" role="radiogroup" aria-label="סוג ההמרה">
        {CONVERSIONS.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={conv.id === c.id} className={`btn small ${conv.id === c.id ? 'selected' : 'ghost'}`} onClick={() => setConv(c)}>
            {c.from} ← {c.to}
          </button>
        ))}
      </div>
      <div className="demo-controls" role="radiogroup" aria-label="כמות">
        {demo.presets.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={val === p} className={`btn small ${val === p ? 'selected' : 'ghost'}`} onClick={() => setVal(p)}>
            {fmt(p)}
          </button>
        ))}
      </div>
      <div className="converter-out" aria-live="polite">
        <span className="conv-val">{fmt(val)} {conv.from}</span>
        <span className="conv-op">{conv.mul ? '× 1000' : ': 1000'}</span>
        <span className="conv-val">{fmt(result)} {conv.to}</span>
      </div>
      <p className="status-line">
        {conv.mul ? 'מיחידה גדולה ליחידה קטנה כופלים ב-1000.' : 'מיחידה קטנה ליחידה גדולה מחלקים ב-1000.'}
      </p>
      <p className="demo-conclusion">{demo.conclusion}</p>
    </>
  )
}

export function DemoView({ demo }: { demo: Demo }) {
  return (
    <section className="paper demo" aria-labelledby="demo-title">
      <h3 id="demo-title">{demo.title}</h3>
      <p>{demo.instructions}</p>
      {demo.kind === 'bodyMatter' && <BodyMatterDemo demo={demo} />}
      {demo.kind === 'balance' && <BalanceDemo demo={demo} />}
      {demo.kind === 'cylinder' && <CylinderDemo demo={demo} />}
      {demo.kind === 'converter' && <ConverterDemo demo={demo} />}
      {demo.kind === 'air' && (
        <>
          <AirChart interactive />
          <p className="demo-conclusion">{demo.conclusion}</p>
        </>
      )}
      {'note' in demo && demo.note && <p className="note">{demo.note}</p>}
    </section>
  )
}
