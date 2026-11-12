import {
  Children,
  type ComponentPropsWithRef,
  type ReactNode,
  useContext,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { cx } from '../../../utils'
import { SlideTreeLabelsContext } from '../../slide-tree-context'

export interface SlideTreeItemProps extends ComponentPropsWithRef<'button'> {
  label: ReactNode
  thumbnail?: ReactNode
  current?: boolean
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

export function SlideTreeItem({
  label,
  thumbnail,
  current = false,
  expanded,
  defaultExpanded = true,
  onExpandedChange,
  children,
  className,
  ref,
  ...props
}: SlideTreeItemProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const open = expanded ?? internalExpanded
  const hasChildren = Children.toArray(children).length > 0
  const groupId = useId()
  const button = useRef<HTMLButtonElement>(null)
  const group = useRef<HTMLUListElement>(null)
  const copy = useContext(SlideTreeLabelsContext)
  useImperativeHandle(ref, () => button.current!, [])
  useLayoutEffect(() => {
    if (!open && group.current?.contains(document.activeElement)) button.current?.focus({ preventScroll: true })
  }, [open])
  function toggle() {
    if (expanded === undefined) setInternalExpanded(!open)
    onExpandedChange?.(!open)
  }
  return (
    <li className="cake-slide-tree-item">
      <div className="cake-slide-tree-row">
        {hasChildren ? (
          <button
            type="button"
            className="cake-slide-tree-toggle"
            tabIndex={-1}
            aria-label={open ? copy.collapse : copy.expand}
            aria-expanded={open}
            aria-controls={groupId}
            onClick={toggle}
          >
            <span aria-hidden="true">{open ? '⌄' : '›'}</span>
          </button>
        ) : (
          <span className="cake-slide-tree-spacer" aria-hidden="true" />
        )}
        <button
          type="button"
          {...props}
          ref={button}
          className={cx('cake-slide-tree-link', className)}
          aria-current={current ? 'page' : undefined}
          aria-expanded={hasChildren ? open : undefined}
          aria-controls={hasChildren ? groupId : undefined}
        >
          {thumbnail != null && <span className="cake-slide-tree-thumbnail">{thumbnail}</span>}
          <span className="cake-slide-tree-label">{label}</span>
        </button>
      </div>
      {hasChildren && (
        <ul ref={group} id={groupId} className="cake-slide-tree-children" hidden={!open}>
          {children}
        </ul>
      )}
    </li>
  )
}
