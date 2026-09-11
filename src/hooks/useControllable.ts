import { useState } from 'react'

export function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (value: T) => void) {
  const [internal, setInternal] = useState(defaultValue)
  const current = value === undefined ? internal : value
  function update(next: T) {
    if (value === undefined) setInternal(next)
    if (next !== current) onChange?.(next)
  }
  return [current, update] as const
}
