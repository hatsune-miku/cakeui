import { type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export type SlidePlayback = 'flat' | 'tree'
export interface SlidePlaybackMenuProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  value?: SlidePlayback
  onValueChange: (value: SlidePlayback) => void
  labels?: Partial<Record<SlidePlayback, string>>
}

/** Radio items for composition inside a menu; the host owns opening and keyboard focus. */
export function SlidePlaybackMenu({ value, onValueChange, labels, className, ...props }: SlidePlaybackMenuProps) {
  const copy = { flat: 'Flat playback', tree: 'Tree playback', ...labels }
  return (
    <div role="group" aria-label="Playback" {...props} className={cx('cake-slide-playback-menu', className)}>
      {(['flat', 'tree'] as const).map((mode) => (
        <button
          type="button"
          key={mode}
          role="menuitemradio"
          className="cake-slide-playback-menu-item"
          aria-checked={value === mode}
          onClick={() => onValueChange(mode)}
        >
          {copy[mode]}
          <span className="cake-slide-playback-menu-check" aria-hidden="true">
            {value === mode ? '✓' : ''}
          </span>
        </button>
      ))}
    </div>
  )
}
