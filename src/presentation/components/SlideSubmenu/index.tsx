import {
  type ComponentPropsWithRef,
  type ReactNode,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { cx } from '../../../utils'

export interface SlideSubmenuProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  label: ReactNode
  children: ReactNode
  menuLabel: string
  backLabel?: string
  menuClassName?: string
}

/** A submenu for an existing menu host. The host owns selection and closing the full menu. */
export function SlideSubmenu({
  label,
  children,
  menuLabel,
  backLabel = 'Back',
  menuClassName,
  className,
  ref,
  disabled,
  onClick,
  onKeyDown,
  onPointerEnter,
  ...props
}: SlideSubmenuProps) {
  const id = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const focusOnOpen = useRef(false)
  const suppressHover = useRef(false)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'left' | 'right' | 'overlap'>('right')
  useImperativeHandle(ref, () => trigger.current!, [])

  function items() {
    return [
      ...(popup.current?.querySelectorAll<HTMLElement>(
        '[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])'
      ) ?? []),
    ].filter((item) => item.closest('[role="menu"]') === popup.current)
  }
  function cancelClose() {
    window.clearTimeout(closeTimer.current)
  }
  function close(restoreFocus = false) {
    cancelClose()
    suppressHover.current = restoreFocus
    setOpen(false)
    if (restoreFocus) trigger.current?.focus({ preventScroll: true })
  }
  function show(focus = false) {
    if (disabled) return
    cancelClose()
    suppressHover.current = false
    focusOnOpen.current = focus
    if (open && focus) (items()[0] ?? popup.current)?.focus({ preventScroll: true })
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open || disabled) return
    const menu = popup.current!
    const button = trigger.current!
    const parent = button.closest<HTMLElement>('[role="menu"]')
    const parentPopover = button.closest<HTMLElement>('[popover]')
    menu.showPopover()
    function position() {
      const anchor = button.getBoundingClientRect()
      const owner = parent?.getBoundingClientRect() ?? anchor
      menu.style.width = ''
      let rect = menu.getBoundingClientRect()
      const right = owner.right - 2
      const left = owner.left - rect.width + 2
      const side = right + rect.width <= innerWidth - 8 ? 'right' : left >= 8 ? 'left' : 'overlap'
      if (side === 'overlap') {
        menu.style.width = `${Math.min(owner.width, innerWidth - 16)}px`
        rect = menu.getBoundingClientRect()
      }
      menu.style.left = `${Math.max(8, Math.min(side === 'right' ? right : side === 'left' ? left : owner.left, innerWidth - rect.width - 8))}px`
      menu.style.top = `${Math.max(8, Math.min(anchor.top, innerHeight - rect.height - 8))}px`
      setPlacement(side)
    }
    position()
    if (focusOnOpen.current) (items()[0] ?? menu).focus({ preventScroll: true })
    const size = new ResizeObserver(position)
    size.observe(menu)
    function outside(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) close()
    }
    function scroll(event: Event) {
      if (!menu.contains(event.target as Node)) close()
    }
    function parentToggle(event: Event) {
      if ((event as ToggleEvent).newState === 'closed') close()
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('scroll', scroll, true)
    parentPopover?.addEventListener('beforetoggle', parentToggle)
    window.addEventListener('resize', position)
    return () => {
      cancelClose()
      size.disconnect()
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('scroll', scroll, true)
      parentPopover?.removeEventListener('beforetoggle', parentToggle)
      window.removeEventListener('resize', position)
      if (menu.matches(':popover-open')) menu.hidePopover()
    }
  }, [open, disabled])

  return (
    <div
      ref={wrapper}
      className="cake-slide-submenu"
      onPointerEnter={cancelClose}
      onPointerLeave={(event) => {
        suppressHover.current = false
        if (event.pointerType !== 'mouse' || !open || popup.current?.contains(document.activeElement)) return
        closeTimer.current = window.setTimeout(() => close(), 180)
      }}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close()
      }}
    >
      <button
        {...props}
        ref={trigger}
        type="button"
        role="menuitem"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open && !disabled}
        aria-controls={open && !disabled ? id : undefined}
        className={cx('cake-slide-submenu-trigger', className)}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) show(true)
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          if (!event.defaultPrevented && event.pointerType === 'mouse' && !suppressHover.current) show()
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented && event.key === 'ArrowRight') {
            event.preventDefault()
            event.stopPropagation()
            show(true)
          }
        }}
      >
        <span className="cake-slide-submenu-label">{label}</span>
        <span className="cake-slide-submenu-arrow" aria-hidden="true">
          ›
        </span>
      </button>
      {open && !disabled && (
        <div
          id={id}
          ref={popup}
          popover="manual"
          role="menu"
          aria-label={menuLabel}
          tabIndex={-1}
          className={cx('cake-slide-submenu-popup', menuClassName)}
          data-placement={placement}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key === 'Tab') return
            event.stopPropagation()
            if (event.key === 'Escape' || event.key === 'ArrowLeft') {
              event.preventDefault()
              close(true)
              return
            }
            const options = items()
            if (!options.length) return
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              const current = options.indexOf(document.activeElement as HTMLElement)
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? options.length - 1
                    : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
              options[next].focus()
            } else if (
              event.key.length === 1 &&
              event.key !== ' ' &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              const current = options.indexOf(document.activeElement as HTMLElement)
              const ordered = [...options.slice(current + 1), ...options.slice(0, current + 1)]
              ordered
                .find((option) =>
                  option.textContent?.trim().toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase())
                )
                ?.focus()
            }
          }}
        >
          {placement === 'overlap' && (
            <button type="button" role="menuitem" className="cake-slide-submenu-back" onClick={() => close(true)}>
              <span aria-hidden="true">‹</span> {backLabel}
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
