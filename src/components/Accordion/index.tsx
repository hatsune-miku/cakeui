import type { ComponentPropsWithRef } from 'react'

import { cx } from '../../utils'

export type AccordionProps = ComponentPropsWithRef<'div'>
export function Accordion({ className, ...props }: AccordionProps) {
  return <div {...props} className={cx('cake-accordion', className)} />
}
