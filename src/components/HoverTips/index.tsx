import { type ReactElement, type ReactNode, cloneElement, useEffect, useId, useRef, useState } from 'react'

import { cx, joinIds } from '../../utils'

export interface HoverTipsProps {
  children: ReactElement<{ 'aria-describedby'?: string }>
  content: ReactNode
  delay?: number
  placement?: 'top' | 'bottom'
  className?: string
}
export function HoverTips({ children, content, delay = 180, placement = 'top', className }: HoverTipsProps) {
  const id = useId()
  const anchor = useRef<HTMLSpanElement>(null)
  const tip = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [open, setOpen] = useState(false)
  function close() {
    clearTimeout(timer.current)
    setOpen(false)
  }
  function show(immediate = false) {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(true), immediate ? 0 : delay)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const element = tip.current
    if (!open || !element) return
    element.showPopover()
    function position() {
      if (!anchor.current || !element) return
      const triggers = Array.from(anchor.current.children).filter((child) => child !== element)
      const rect = (triggers.length === 1 ? triggers[0] : anchor.current).getBoundingClientRect()
      const bounds = element.getBoundingClientRect()
      const offset = parseFloat(getComputedStyle(element).getPropertyValue('--cake-tip-offset')) || 8
      const top =
        placement === 'top' && rect.top > bounds.height + 16 ? rect.top - bounds.height - offset : rect.bottom + offset
      const left = Math.max(
        8,
        Math.min(rect.left + rect.width / 2 - bounds.width / 2, window.innerWidth - bounds.width - 8)
      )
      // Preserve fractional-pixel edge painting, matching AnyDrop's translated tooltip.
      element.style.left = `${left + bounds.width / 2}px`
      element.style.top = `${Math.max(8, Math.min(top, window.innerHeight - bounds.height - 8)) + bounds.height}px`
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    position()
    window.addEventListener('resize', position)
    document.addEventListener('scroll', position, true)
    document.addEventListener('keydown', escape)
    return () => {
      if (element.isConnected && element.matches(':popover-open')) element.hidePopover()
      window.removeEventListener('resize', position)
      document.removeEventListener('scroll', position, true)
      document.removeEventListener('keydown', escape)
    }
  }, [open, placement])
  return (
    <span
      ref={anchor}
      className={cx('cake-hovertips', className)}
      onPointerEnter={() => show()}
      onPointerLeave={() => {
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setOpen(false), 100)
      }}
      onFocus={() => show(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
      onClick={() => show(true)}
    >
      {cloneElement(children, { 'aria-describedby': joinIds(children.props['aria-describedby'], id) })}
      <span
        ref={tip}
        id={id}
        popover="manual"
        role="tooltip"
        className="cake-hovertips-content"
        onPointerEnter={() => {
          clearTimeout(timer.current)
        }}
      >
        {content}
      </span>
    </span>
  )
}
