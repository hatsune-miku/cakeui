import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type SliderProps = Omit<ComponentPropsWithRef<'input'>, 'type'>
export function Slider({ className, ...props }: SliderProps) {
  return <input {...props} type="range" className={cx('cake-slider', className)} />
}
