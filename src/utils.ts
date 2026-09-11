export type Size = 'small' | 'medium' | 'large'
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export function cx(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ')
}

export function joinIds(...values: (string | undefined | false)[]) {
  return values.filter(Boolean).join(' ') || undefined
}
