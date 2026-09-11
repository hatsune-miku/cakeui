import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type CakeTheme = 'blue' | 'pink' | 'gold'
export type CakeMode = 'light' | 'dark' | 'system'
export interface CakeProviderProps extends ComponentPropsWithRef<'div'> {
  theme?: CakeTheme
  mode?: CakeMode
  density?: 'comfortable' | 'compact'
}

/** Optional, nestable CSS scope. No global state, portals, or runtime styling. */
export function CakeProvider({
  theme = 'blue',
  mode = 'system',
  density = 'comfortable',
  className,
  ...props
}: CakeProviderProps) {
  return (
    <div
      {...props}
      className={cx('cake-theme', className)}
      data-theme={theme}
      data-mode={mode}
      data-density={density}
    />
  )
}
