import { type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export interface SlideCodeProps extends Omit<ComponentPropsWithRef<'pre'>, 'children'> {
  children: string
  language?: string
}

export function SlideCode({ children, language, className, ...props }: SlideCodeProps) {
  return (
    <pre tabIndex={0} {...props} className={cx('cake-slide-code', className)}>
      {language && <span className="cake-slide-code-language">{language}</span>}
      <code className="cake-slide-code-content">{children}</code>
    </pre>
  )
}
