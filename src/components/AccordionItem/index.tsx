import type { ComponentPropsWithRef, ReactNode } from 'react'

import { cx } from '../../utils'

export interface AccordionItemProps extends Omit<ComponentPropsWithRef<'details'>, 'title'> {
  title: ReactNode
}
export function AccordionItem({ title, children, className, ...props }: AccordionItemProps) {
  return (
    <details {...props} className={cx('cake-accordion-item', className)}>
      <summary className="cake-accordion-summary">
        {title}
        <span className="cake-accordion-arrow" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="cake-accordion-content">{children}</div>
    </details>
  )
}
