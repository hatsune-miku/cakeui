import type { ComponentPropsWithRef } from 'react'

import { type Tone, cx } from '../../utils'

export interface TagProps extends ComponentPropsWithRef<'span'> {
  tone?: Tone
  onRemove?: () => void
  removeLabel?: string
}
export function Tag({ tone = 'neutral', className, onRemove, removeLabel = 'Remove', children, ...props }: TagProps) {
  return (
    <span {...props} data-tone={tone} className={cx('cake-tag', className)}>
      {children}
      {onRemove && (
        <button type="button" className="cake-tag-remove" aria-label={removeLabel} onClick={onRemove}>
          ×
        </button>
      )}
    </span>
  )
}
