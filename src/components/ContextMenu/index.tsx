import { type ComponentPropsWithoutRef, type ReactNode, useEffect, useId, useRef, useState } from 'react'

import { MenuContext } from './context'

import { cx } from '../../utils'

export interface ContextMenuProps extends ComponentPropsWithoutRef<'div'> {
  menu: ReactNode
  menuLabel: string
  interactive?: boolean
}
export function ContextMenu({
  menu,
  menuLabel,
  interactive = false,
  className,
  children,
  onContextMenu,
  onMouseDown,
  onKeyDown,
  ...props
}: ContextMenuProps) {
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [point, setPoint] = useState<{ x: number; y: number; focusFirst: boolean } | null>(null)
  const [pressed, setPressed] = useState(false)
  const gesture = useRef({ pressed: false, suppressContextMenu: false })
  const search = useRef({ text: '', time: 0 })
  function close() {
    gesture.current.pressed = false
    setPressed(false)
    setPoint(null)
    previousFocus.current?.focus({ preventScroll: true })
  }
  function show(x: number, y: number, focusFirst = true) {
    search.current = { text: '', time: 0 }
    if (!popup.current?.contains(document.activeElement))
      previousFocus.current =
        document.activeElement instanceof HTMLElement && document.activeElement !== document.body
          ? document.activeElement
          : container.current
    setPoint({ x, y, focusFirst })
  }
  useEffect(() => {
    function cancelPress() {
      gesture.current.pressed = false
      setPressed(false)
    }
    function pointerDown(event: PointerEvent) {
      if (gesture.current.pressed) return
      gesture.current.suppressContextMenu = false
      if (popup.current?.matches(':popover-open') && !popup.current.contains(event.target as Node)) setPoint(null)
    }
    function mouseUp(event: MouseEvent) {
      if (event.button !== 2 || !gesture.current.pressed) return
      event.preventDefault()
      cancelPress()
      // Hit-test the release coordinates: focus, event targets and pointer capture
      // may still refer to the trigger or an item the pointer has already left.
      const item = document.elementFromPoint(event.clientX, event.clientY)?.closest('[role="menuitem"]')
      if (
        item instanceof HTMLButtonElement &&
        item.closest('[role="menu"]') === popup.current &&
        !item.matches(':disabled') &&
        item.getAttribute('aria-disabled') !== 'true'
      ) {
        close()
        item.click()
      }
    }
    function suppressNativeMenu(event: MouseEvent) {
      // Platforms dispatch contextmenu at different points in the right-click
      // sequence. Keep swallowing it through release until the next gesture.
      if (gesture.current.suppressContextMenu && event.button === 2) event.preventDefault()
    }
    function mouseMove(event: MouseEvent) {
      if (gesture.current.pressed && !(event.buttons & 2)) cancelPress()
    }
    function blur() {
      cancelPress()
      setPoint(null)
    }
    function visibilityChange() {
      if (document.hidden) blur()
    }
    document.addEventListener('pointerdown', pointerDown, true)
    document.addEventListener('pointerup', mouseUp, true)
    document.addEventListener('mouseup', mouseUp, true)
    document.addEventListener('contextmenu', suppressNativeMenu, true)
    document.addEventListener('auxclick', suppressNativeMenu, true)
    document.addEventListener('mousemove', mouseMove, true)
    document.addEventListener('pointercancel', cancelPress, true)
    document.addEventListener('visibilitychange', visibilityChange)
    window.addEventListener('blur', blur)
    return () => {
      gesture.current.pressed = false
      document.removeEventListener('pointerdown', pointerDown, true)
      document.removeEventListener('pointerup', mouseUp, true)
      document.removeEventListener('mouseup', mouseUp, true)
      document.removeEventListener('contextmenu', suppressNativeMenu, true)
      document.removeEventListener('auxclick', suppressNativeMenu, true)
      document.removeEventListener('mousemove', mouseMove, true)
      document.removeEventListener('pointercancel', cancelPress, true)
      document.removeEventListener('visibilitychange', visibilityChange)
      window.removeEventListener('blur', blur)
    }
  }, [interactive])
  useEffect(() => {
    const element = popup.current
    if (!point || !element) return
    element.showPopover()
    const rect = element.getBoundingClientRect()
    element.style.left = `${Math.max(8, Math.min(point.x, window.innerWidth - rect.width - 8))}px`
    element.style.top = `${Math.max(8, Math.min(point.y, window.innerHeight - rect.height - 8))}px`
    const first = element.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
    ;(point.focusFirst ? (first ?? element) : element).focus({ preventScroll: true })
    const scrollPositions: { element: HTMLElement; top: number; left: number }[] = []
    for (let anchor: HTMLElement | null = container.current; anchor; anchor = anchor.parentElement)
      scrollPositions.push({ element: anchor, top: anchor.scrollTop, left: anchor.scrollLeft })
    function dismiss() {
      gesture.current.pressed = false
      setPressed(false)
      setPoint(null)
    }
    function scroll(event: Event) {
      if (element?.contains(event.target as Node)) return
      // Focusing an offscreen trigger may queue a scroll event before opening.
      // Compare actual scroll positions so the press animation cannot dismiss it.
      if (
        scrollPositions.some(
          (anchor) => anchor.element.scrollTop !== anchor.top || anchor.element.scrollLeft !== anchor.left
        )
      )
        dismiss()
    }
    window.addEventListener('resize', dismiss)
    document.addEventListener('scroll', scroll, true)
    return () => {
      if (element.isConnected && element.matches(':popover-open')) element.hidePopover()
      window.removeEventListener('resize', dismiss)
      document.removeEventListener('scroll', scroll, true)
    }
  }, [point])
  return (
    <div
      tabIndex={0}
      {...props}
      ref={container}
      className={cx('cake-contextmenu', className)}
      data-interactive={interactive}
      data-pressed={interactive && pressed}
      aria-haspopup="menu"
      aria-controls={point ? id : undefined}
      onMouseDown={(event) => {
        onMouseDown?.(event)
        if (
          event.defaultPrevented ||
          !interactive ||
          event.button !== 2 ||
          popup.current?.contains(event.target as Node)
        )
          return
        event.preventDefault()
        event.stopPropagation()
        gesture.current = { pressed: true, suppressContextMenu: true }
        setPressed(true)
        show(event.clientX, event.clientY, false)
      }}
      onContextMenu={(event) => {
        onContextMenu?.(event)
        if (interactive && gesture.current.suppressContextMenu && event.button === 2) {
          event.preventDefault()
          return
        }
        if (event.defaultPrevented || popup.current?.contains(event.target as Node)) return
        event.preventDefault()
        event.stopPropagation()
        show(event.clientX, event.clientY)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
          event.preventDefault()
          gesture.current.suppressContextMenu = false
          const rect = event.currentTarget.getBoundingClientRect()
          show(rect.left + 12, rect.top + 12)
        }
      }}
    >
      {children}
      <MenuContext.Provider value={close}>
        <div
          id={id}
          ref={popup}
          // Linux can dispatch contextmenu before pointerup; an auto popover
          // would immediately light-dismiss on that same opening gesture.
          popover="manual"
          role="menu"
          aria-label={menuLabel}
          tabIndex={-1}
          className="cake-contextmenu-popup"
          onToggle={(event) => {
            if (event.newState === 'closed' && !event.currentTarget.matches(':popover-open')) {
              gesture.current.pressed = false
              setPressed(false)
              setPoint(null)
            }
          }}
          onKeyDown={(event) => {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
            )
            const current = items.indexOf(document.activeElement as HTMLButtonElement)
            if (event.key === 'Escape' || event.key === 'Tab') {
              event.preventDefault()
              event.stopPropagation()
              close()
              return
            }
            if (!items.length) return
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              const index =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : current < 0
                      ? event.key === 'ArrowDown'
                        ? 0
                        : items.length - 1
                      : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
              items[index].focus()
            } else if (
              event.key.length === 1 &&
              event.key !== ' ' &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              search.current.text = Date.now() - search.current.time > 600 ? event.key : search.current.text + event.key
              search.current.time = Date.now()
              const query = search.current.text.toLocaleLowerCase()
              const ordered = [...items.slice(current + 1), ...items.slice(0, current + 1)]
              ordered.find((item) => item.textContent?.trim().toLocaleLowerCase().startsWith(query))?.focus()
            }
          }}
        >
          {menu}
        </div>
      </MenuContext.Provider>
    </div>
  )
}
