import { type CSSProperties, type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export type SlideRatio = '16:9' | '4:3' | '16:10'

export interface SlideProps extends ComponentPropsWithRef<'section'> {
  ratio?: SlideRatio
  tone?: 'paper' | 'accent' | 'inverted'
  layout?: 'default' | 'center' | 'cover'
}

export function Slide({ ratio, tone = 'paper', layout = 'default', className, style, children, ...props }: SlideProps) {
  return (
    <section
      {...props}
      className={cx('cake-slide', className)}
      data-tone={tone}
      data-layout={layout}
      style={{ ...(ratio ? { '--cake-slide-ratio': ratio.replace(':', ' / ') } : {}), ...style } as CSSProperties}
    >
      <div className="cake-slide-content">{children}</div>
    </section>
  )
}
