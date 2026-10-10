/** מספרים בתצוגה כמו בחומר הלימוד: 1,000 ו-0.5 */
export function fmt(n: number): string {
  const r = Math.round(n * 1e6) / 1e6
  return r.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

/** קורא תשובה מספרית: מקבל 1000, 1,000, 0.5 ו-0,5 */
export function parseNumber(raw: string): number | null {
  let t = raw.trim().replace(/\s/g, '')
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '')
  else t = t.replace(',', '.')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null
  return Number(t)
}

export function sameNumber(a: number, b: number) {
  return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b))
}

export function decimals(n: number): number {
  const s = String(Math.round(n * 1e9) / 1e9)
  const i = s.indexOf('.')
  return i < 0 ? 0 : s.length - i - 1
}
