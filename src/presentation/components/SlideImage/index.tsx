import { type ComponentPropsWithRef } from 'react'

import { cx } from '../../../utils'

export interface SlideImageProps extends ComponentPropsWithRef<'img'> {
  alt: string
  fit?: 'contain' | 'cover'
}

export function SlideImage({ fit = 'contain', className, alt, ...props }: SlideImageProps) {
  return <img {...props} alt={alt} className={cx('cake-slide-image', className)} data-fit={fit} />
}
