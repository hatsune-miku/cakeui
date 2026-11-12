import { type CSSProperties, type ComponentPropsWithRef, useEffect, useLayoutEffect, useRef } from 'react'

import { cx } from '../../utils'

export type SliderProps = Omit<ComponentPropsWithRef<'input'>, 'type'>

function sliderRatio(value: unknown, min: unknown, max: unknown) {
  const low = min === undefined || min === '' ? 0 : Number(min)
  const high = max === undefined || max === '' ? 100 : Number(max)
  // An input without a value starts at the midpoint of its range.
  const current = value === undefined || value === '' ? low + (high - low) / 2 : Number(value)
  if (!(high > low) || !Number.isFinite(current)) return 0
  return Math.min(1, Math.max(0, (current - low) / (high - low)))
}
function paint(element: HTMLInputElement) {
  element.style.setProperty('--cake-slider-ratio', String(sliderRatio(element.value, element.min, element.max)))
}
/** A native range input. The filled length is the only state it mirrors into CSS. */
export function Slider({ className, style, ref, onInput, ...props }: SliderProps) {
  const input = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    if (input.current) paint(input.current)
  }, [props.value, props.min, props.max, props.step])
  useEffect(() => {
    const form = input.current?.form
    let timer: ReturnType<typeof setTimeout>
    function reset() {
      // Native reset applies its defaults after the reset event has finished.
      timer = setTimeout(() => {
        if (input.current) paint(input.current)
      }, 0)
    }
    form?.addEventListener('reset', reset)
    return () => {
      clearTimeout(timer)
      form?.removeEventListener('reset', reset)
    }
  }, [props.form])
  return (
    <input
      {...props}
      ref={(node) => {
        input.current = node
        if (typeof ref === 'function') return ref(node)
        if (ref) ref.current = node
      }}
      type="range"
      className={cx('cake-slider', className)}
      style={
        {
          '--cake-slider-ratio': sliderRatio(props.value ?? props.defaultValue, props.min, props.max),
          ...style,
        } as CSSProperties
      }
      onInput={(event) => {
        paint(event.currentTarget)
        onInput?.(event)
      }}
    />
  )
}
