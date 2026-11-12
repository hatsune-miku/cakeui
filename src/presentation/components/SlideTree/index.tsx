import { type ComponentPropsWithRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'

import { cx } from '../../../utils'
import { SlideTreeLabelsContext } from '../../slide-tree-context'

export interface SlideTreeLabels {
  expand: string
  collapse: string
}
export interface SlideTreeProps extends ComponentPropsWithRef<'nav'> {
  labels?: Partial<SlideTreeLabels>
}

function itemButton(item: Element | null) {
  return item?.querySelector<HTMLButtonElement>(':scope > .cake-slide-tree-row > .cake-slide-tree-link')
}

export function SlideTree({ children, className, labels, ref, onKeyDown, ...props }: SlideTreeProps) {
  const root = useRef<HTMLElement>(null)
  const lastCurrent = useRef<HTMLElement | null>(null)
  useImperativeHandle(ref, () => root.current!, [])
  // External navigation reveals the newly selected branch without scrolling the document.
  useLayoutEffect(() => {
    const node = root.current!
    const current = node.querySelector<HTMLElement>('.cake-slide-tree-link[aria-current="page"]')
    if (!current || current === lastCurrent.current) return
    lastCurrent.current = current
    let group = current.closest('.cake-slide-tree-children')
    while (group) {
      if (group.hasAttribute('hidden')) {
        group.parentElement
          ?.querySelector<HTMLButtonElement>(':scope > .cake-slide-tree-row > .cake-slide-tree-toggle')
          ?.click()
      }
      group = group.parentElement?.closest('.cake-slide-tree-children') ?? null
    }
    const frame = requestAnimationFrame(() => {
      if (!current.isConnected || current.closest('[hidden]')) return
      const bounds = current.getBoundingClientRect()
      const viewport = node.getBoundingClientRect()
      if (bounds.top < viewport.top) node.scrollTop += bounds.top - viewport.top - 4
      else if (bounds.bottom > viewport.bottom) node.scrollTop += bounds.bottom - viewport.bottom + 4
    })
    return () => cancelAnimationFrame(frame)
  })
  return (
    <SlideTreeLabelsContext.Provider
      value={{ expand: 'Expand child slides', collapse: 'Collapse child slides', ...labels }}
    >
      <nav
        aria-label="Slide tree"
        {...props}
        ref={root}
        className={cx('cake-slide-tree', className)}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
          const button = (event.target as Element).closest<HTMLButtonElement>('.cake-slide-tree-link')
          if (!button || button.closest('.cake-slide-tree') !== root.current) return
          const item = button.closest('.cake-slide-tree-item')!
          const toggle = item.querySelector<HTMLButtonElement>(
            ':scope > .cake-slide-tree-row > .cake-slide-tree-toggle'
          )
          const buttons = [...root.current!.querySelectorAll<HTMLButtonElement>('.cake-slide-tree-link')].filter(
            (node) => !node.disabled && !node.closest('[hidden]')
          )
          let target: HTMLButtonElement | null | undefined
          switch (event.key) {
            case 'ArrowDown':
              target = buttons[buttons.indexOf(button) + 1]
              break
            case 'ArrowUp':
              target = buttons[buttons.indexOf(button) - 1]
              break
            case 'Home':
              target = buttons[0]
              break
            case 'End':
              target = buttons.at(-1)
              break
            case 'ArrowRight':
              if (toggle?.getAttribute('aria-expanded') === 'false') toggle.click()
              else
                target = item.querySelector<HTMLButtonElement>(
                  ':scope > .cake-slide-tree-children > .cake-slide-tree-item > .cake-slide-tree-row > .cake-slide-tree-link'
                )
              break
            case 'ArrowLeft':
              if (toggle?.getAttribute('aria-expanded') === 'true') toggle.click()
              else target = itemButton(item.parentElement?.closest('.cake-slide-tree-item') ?? null)
              break
            default:
              return
          }
          event.preventDefault()
          event.stopPropagation()
          target?.focus({ preventScroll: true })
          if (target) {
            const bounds = target.getBoundingClientRect()
            const viewport = root.current!.getBoundingClientRect()
            if (bounds.top < viewport.top) root.current!.scrollTop += bounds.top - viewport.top - 4
            else if (bounds.bottom > viewport.bottom) root.current!.scrollTop += bounds.bottom - viewport.bottom + 4
          }
        }}
      >
        <ul className="cake-slide-tree-list">{children}</ul>
      </nav>
    </SlideTreeLabelsContext.Provider>
  )
}
