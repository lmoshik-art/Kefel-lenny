import { useState } from 'react'
import type { Visual } from '../types.ts'

/* ההמחשות המדעיות נבנות כאן בקוד, כדי שהנתונים שמוצגים יהיו תמיד תואמים לתשובה הנכונה */

import { fmt } from '../engine/format.ts'

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

function CylinderSvg({ max, major, minor, level, stone = false, caption = true }: { max: number; major: number; minor: number; level: number; stone?: boolean; caption?: boolean }) {
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
        {stone && <path d={`M 108 ${bottom + 10} Q 104 ${bottom - 6} 116 ${bottom - 14} Q 132 ${bottom - 20} 142 ${bottom - 8} Q 148 ${bottom + 6} 136 ${bottom + 10} Z`} className="stone" />}
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
      {caption && <figcaption>שנתות ממוספרות כל {major} מ״ל. השנתות הקטנות מחלקות כל קטע ל-{major / minor} רווחים שווים.</figcaption>}
    </figure>
  )
}

export const AIR_PARTS = [
  { id: 'n2', label: 'חנקן', pct: 78, cls: 'air-n' },
  { id: 'o2', label: 'חמצן', pct: 21, cls: 'air-o' },
  { id: 'other', label: 'ארגון ושאר הגזים', pct: 1, cls: 'air-x' },
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
        כל משבצת היא 1% מהאוויר, בקירוב. המשבצת האחרונה היא ארגון (כ-0.93%) ושאר הגזים, ובהם פחמן דו-חמצני בכמות קטנה מאוד.
      </figcaption>
    </figure>
  )
}

function BoxSvg({ l, w, h }: { l: number; w: number; h: number }) {
  // תיבה בהטלה איזומטרית פשוטה; הפרופורציות מוגבלות כדי שהשרטוט יישאר קריא
  const max = Math.max(l, w, h)
  const sc = (n: number) => 40 + (n / max) * 110
  const L = sc(l)
  const W = sc(w) * 0.55
  const H = sc(h)
  const x0 = 60
  const y0 = 40 + W * 0.6 + H
  const dx = W * 0.8
  const dy = W * 0.6
  const P = (x: number, y: number) => `${x},${y}`
  return (
    <figure className="visual">
      <svg viewBox={`-30 0 ${L + dx + 170} ${y0 + 50}`} role="img" aria-label={`תיבה: אורך ${l} ס״מ, רוחב ${w} ס״מ, גובה ${h} ס״מ`}>
        <polygon points={[P(x0, y0), P(x0 + L, y0), P(x0 + L, y0 - H), P(x0, y0 - H)].join(' ')} className="box-front" />
        <polygon points={[P(x0, y0 - H), P(x0 + L, y0 - H), P(x0 + L + dx, y0 - H - dy), P(x0 + dx, y0 - H - dy)].join(' ')} className="box-top" />
        <polygon points={[P(x0 + L, y0), P(x0 + L + dx, y0 - dy), P(x0 + L + dx, y0 - H - dy), P(x0 + L, y0 - H)].join(' ')} className="box-side" />
        <text x={x0 + L / 2} y={y0 + 24} textAnchor="middle" className="dim-label">אורך {l} ס״מ</text>
        <text x={x0 - 8} y={y0 - H / 2} textAnchor="start" className="dim-label">גובה {h}</text>
        <text x={x0 + L + dx + 6} y={y0 - dy / 2} textAnchor="end" className="dim-label">רוחב {w}</text>
      </svg>
    </figure>
  )
}

function DisplaceView(v: Extract<Visual, { kind: 'displace' }>) {
  return (
    <figure className="visual displace">
      <div className="displace-row">
        <div>
          <CylinderSvg max={v.max} major={v.major} minor={v.minor} level={v.before} caption={false} />
          <p className="displace-tag">לפני</p>
        </div>
        <div>
          <CylinderSvg max={v.max} major={v.major} minor={v.minor} level={v.after} stone caption={false} />
          <p className="displace-tag">אחרי שהוכנסה אבן</p>
        </div>
      </div>
      <figcaption>שנתות ממוספרות כל {v.major} מ״ל, וכל שנתה קטנה שווה {v.minor} מ״ל.</figcaption>
    </figure>
  )
}

export function VisualView({ visual }: { visual: Visual }) {
  if (visual.kind === 'balance') return <BalanceSvg weights={visual.weights} tilt={visual.tilt} />
  if (visual.kind === 'cylinder') return <CylinderSvg {...visual} />
  if (visual.kind === 'box') return <BoxSvg {...visual} />
  if (visual.kind === 'displace') return <DisplaceView {...visual} />
  return <AirChart />
}

/* ---------- המחשות אינטראקטיביות בשיעורים ---------- */

export function BalanceDemo() {
  const objectMass = 175
  const available = [100, 50, 20, 5]
  const [onPan, setOnPan] = useState<number[]>([])
  const sum = onPan.reduce((s, w) => s + w, 0)
  const tilt = sum === objectMass ? 'level' : sum < objectMass ? 'left' : 'right'
  return (
    <div className="demo">
      <p className="demo-title">נסה בעצמך: אזן את המאזניים</p>
      <BalanceSvg weights={[...onPan].sort((a, b) => b - a)} tilt={tilt} objectLabel={tilt === 'level' ? String(objectMass) : '?'} />
      <div className="demo-controls" role="group" aria-label="הוספת משקולות">
        {available.map((w) => (
          <button key={w} type="button" className="btn small" disabled={onPan.length >= 4} onClick={() => setOnPan([...onPan, w])}>
            +{w} גרם
          </button>
        ))}
        <button type="button" className="btn small ghost" disabled={!onPan.length} onClick={() => setOnPan(onPan.slice(0, -1))}>
          הסר אחרונה
        </button>
      </div>
      <p className="status-line" aria-live="polite">
        סכום המשקולות: {sum} גרם.{' '}
        {tilt === 'level'
          ? `מאוזן: מסת הגוף היא ${objectMass} גרם.`
          : tilt === 'left'
            ? 'הכף עם הגוף נמוכה יותר: צריך להוסיף משקולת.'
            : 'הכף עם המשקולות נמוכה יותר: צריך להסיר משקולת.'}
      </p>
    </div>
  )
}

export function CylinderDemo() {
  const max = 100
  const major = 10
  const minor = 2
  const [level, setLevel] = useState(40)
  const set = (v: number) => setLevel(Math.max(0, Math.min(max, v)))
  const base = Math.floor(level / major) * major
  const steps = Math.round((level - base) / minor)
  return (
    <div className="demo">
      <p className="demo-title">נסה בעצמך: שנה את כמות הנוזל וקרא את המפלס</p>
      <CylinderSvg max={max} major={major} minor={minor} level={level} />
      <div className="demo-controls" role="group" aria-label="שינוי כמות הנוזל">
        <button type="button" className="btn small" onClick={() => set(level + minor)}>+{minor} מ״ל</button>
        <button type="button" className="btn small" onClick={() => set(level - minor)}>-{minor} מ״ל</button>
        <button type="button" className="btn small ghost" onClick={() => set(level + major)}>+{major} מ״ל</button>
        <button type="button" className="btn small ghost" onClick={() => set(level - major)}>-{major} מ״ל</button>
      </div>
      <p className="status-line" aria-live="polite">
        השנתה הממוספרת מתחת למפלס: {base}
        {steps > 0 ? `, ועוד ${steps} × ${minor} מ״ל` : ''}. הנפח: <b>{fmt(level)} מ״ל</b>.
      </p>
    </div>
  )
}

export function BoxDemo() {
  const [d, setD] = useState({ l: 4, w: 3, h: 2 })
  const set = (k: 'l' | 'w' | 'h', delta: number) => setD({ ...d, [k]: Math.max(1, Math.min(10, d[k] + delta)) })
  const names = { l: 'אורך', w: 'רוחב', h: 'גובה' } as const
  return (
    <div className="demo">
      <p className="demo-title">נסה בעצמך: שנה את המידות וראה את הנפח</p>
      <BoxSvg {...d} />
      <div className="demo-controls">
        {(['l', 'w', 'h'] as const).map((k) => (
          <span key={k} className="stepper" role="group" aria-label={names[k]}>
            <button type="button" className="btn small ghost" onClick={() => set(k, -1)} aria-label={`הקטן ${names[k]}`}>-</button>
            <span>{names[k]} {d[k]}</span>
            <button type="button" className="btn small ghost" onClick={() => set(k, 1)} aria-label={`הגדל ${names[k]}`}>+</button>
          </span>
        ))}
      </div>
      <p className="status-line" aria-live="polite">
        <bdi dir="ltr">{d.l} × {d.w} × {d.h} = {d.l * d.w * d.h}</bdi> סמ״ק: נכנסות בתיבה {d.l * d.w * d.h} קוביות של 1 סמ״ק.
      </p>
    </div>
  )
}

export function DisplaceDemo() {
  const before = 40
  const [stone, setStone] = useState(false)
  return (
    <div className="demo">
      <p className="demo-title">נסה בעצמך: הכנס את האבן למשורה</p>
      <div className="displace-row">
        <CylinderSvg max={100} major={10} minor={5} level={stone ? before + 15 : before} stone={stone} caption={false} />
      </div>
      <div className="demo-controls">
        <button type="button" className="btn small" onClick={() => setStone(!stone)}>{stone ? 'הוצא את האבן' : 'הכנס את האבן'}</button>
      </div>
      <p className="status-line" aria-live="polite">
        {stone ? <>המפלס עלה מ-40 ל-55 מ״ל. נפח האבן: <bdi dir="ltr">55 - 40 = 15</bdi> מ״ל.</> : 'במשורה 40 מ״ל מים. כל שנתה קטנה שווה 5 מ״ל.'}
      </p>
    </div>
  )
}
