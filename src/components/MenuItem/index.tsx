import { type ComponentPropsWithRef, type ReactNode, useContext } from 'react'

import { cx } from '../../utils'
import { MenuContext } from '../ContextMenu/context'

export interface MenuItemProps extends ComponentPropsWithRef<'button'> {
  shortcut?: ReactNode
  danger?: boolean
}
export function MenuItem({ shortcut, danger = false, children, className, onClick, ...props }: MenuItemProps) {
  const close = useContext(MenuContext)
  return (
    <button
      {...props}
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={cx('cake-menuitem', className)}
      data-danger={danger}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) close?.()
      }}
    >
      <span className="cake-menuitem-label">{children}</span>
      {shortcut && <span className="cake-menuitem-shortcut">{shortcut}</span>}
    </button>
  )
}
