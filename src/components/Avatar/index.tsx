import { type ComponentPropsWithRef, useState } from 'react'

import { type Size, cx } from '../../utils'

export interface AvatarProps extends ComponentPropsWithRef<'span'> {
  src?: string
  name: string
  size?: Size
}
export function Avatar({ src, name, size = 'medium', className, children, ...props }: AvatarProps) {
  const [failed, setFailed] = useState<string>()
  return (
    <span role="img" aria-label={name} {...props} className={cx('cake-avatar', className)} data-size={size}>
      {src && failed !== src ? (
        <img className="cake-avatar-image" src={src} alt="" onError={() => setFailed(src)} />
      ) : (
        (children ?? name.trim().slice(0, 2).toUpperCase())
      )}
    </span>
  )
}
