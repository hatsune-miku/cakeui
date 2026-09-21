import { type ComponentPropsWithRef, type ReactNode } from 'react'

import { cx } from '../../../utils'
import { SlideText } from '../SlideText'
import { SlideTitle } from '../SlideTitle'

export interface SlideHeaderProps extends Omit<ComponentPropsWithRef<'header'>, 'title' | 'children'> {
  title: ReactNode
  label?: ReactNode
  description?: ReactNode
}

export function SlideHeader({ title, label, description, className, ...props }: SlideHeaderProps) {
  return (
    <header {...props} className={cx('cake-slide-header', className)}>
      {label != null && <div className="cake-slide-header-label">{label}</div>}
      <SlideTitle>{title}</SlideTitle>
      {description != null && <SlideText muted>{description}</SlideText>}
    </header>
  )
}
