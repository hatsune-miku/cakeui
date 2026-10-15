/** Opaque sRGB only: #RGB, #RRGGBB, rgb(r,g,b), rgb(r g b), or percent RGB. */
export function normalizeThemeColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const input = value.trim()
  if (/^#?[\da-f]{6}$/i.test(input)) return '#' + input.replace('#', '').toLowerCase()
  if (/^#?[\da-f]{3}$/i.test(input))
    return (
      '#' +
      [...input.replace('#', '')]
        .map((c) => c + c)
        .join('')
        .toLowerCase()
    )
  const match = /^rgb\(\s*([^()]+)\s*\)$/i.exec(input)
  if (!match) return null
  const parts = match[1].trim().split(match[1].includes(',') ? /\s*,\s*/ : /\s+/)
  if (parts.length !== 3 || !parts.every((part) => /^(?:\d+(?:\.\d+)?|\.\d+)%?$/.test(part))) return null
  const percent = parts.every((part) => part.endsWith('%'))
  if (!percent && parts.some((part) => part.endsWith('%'))) return null
  const numbers = parts.map((part) => parseFloat(part))
  if (numbers.some((number) => number > (percent ? 100 : 255))) return null
  return hex(numbers.map((number) => (percent ? (number * 255) / 100 : number)))
}

export function channels(color: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16))
}
export function hex(values: number[]): string {
  return '#' + values.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')
}
export function mix(first: string, second: string, amount: number): string {
  const a = channels(first),
    b = channels(second)
  return hex(a.map((value, index) => value * (1 - amount) + b[index] * amount))
}
function luminance(color: string): number {
  const c = channels(color).map((value) => {
    const v = value / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722
}
/** WCAG relative-luminance contrast, without rounding the threshold. */
export function themeContrast(first: string, second: string): number {
  const a = normalizeThemeColor(first),
    b = normalizeThemeColor(second)
  if (!a || !b) throw new TypeError('Contrast requires two opaque HEX or RGB colors.')
  const x = luminance(a),
    y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** Move the adjustable color toward white/black, preserving its hue as far as possible. */
export function readable(adjustable: string, fixed: string, minimum = 4.6): string {
  if (themeContrast(adjustable, fixed) >= minimum) return adjustable
  const target = themeContrast('#000000', fixed) > themeContrast('#ffffff', fixed) ? '#000000' : '#ffffff'
  let low = 0,
    high = 1
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    if (themeContrast(mix(adjustable, target, mid), fixed) >= minimum) high = mid
    else low = mid
  }
  return mix(adjustable, target, high)
}
export function foregroundFor(background: string): string {
  return themeContrast(background, '#ffffff') >= themeContrast(background, '#161b22') ? '#ffffff' : '#161b22'
}

// Only for the fixed, audited compatibility snapshots, never for user input.
export function compositeLegacy(color: string, under: string): string {
  const normalized = normalizeThemeColor(color)
  if (normalized) return normalized
  if (/^#[\da-f]{4}$/i.test(color)) color = '#' + [...color.slice(1)].map((c) => c + c).join('')
  if (/^#[\da-f]{8}$/i.test(color)) return mix(under, color.slice(0, 7), parseInt(color.slice(7), 16) / 255)
  const rgba = /^rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/.exec(color)
  if (rgba) return mix(under, hex(rgba.slice(1, 4).map(Number)), Number(rgba[4]))
  throw new TypeError('Unknown legacy color: ' + color)
}
