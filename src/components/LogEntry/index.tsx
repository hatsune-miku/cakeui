import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export interface LogEntryProps extends ComponentPropsWithRef<'div'> {
  time?: string
  dateTime?: string
  level?: 'info' | 'success' | 'warning' | 'error' | 'debug'
}
export function LogEntry({ time, dateTime, level = 'info', className, children, ...props }: LogEntryProps) {
  return (
    <div {...props} className={cx('cake-logentry', className)} data-level={level}>
      <time className="cake-logentry-time" dateTime={dateTime} title={dateTime}>
        {time}
      </time>
      <span className="cake-logentry-level">{level}</span>
      <span className="cake-logentry-text">{children}</span>
    </div>
  )
}
