import { type ComponentPropsWithoutRef, type ReactNode, type RefObject, useEffect, useId, useRef } from 'react'

import { getTabStops } from '../../focus'
import { cx } from '../../utils'
import { Button } from '../Button'

export interface DialogProps extends Omit<ComponentPropsWithoutRef<'dialog'>, 'open' | 'title'> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  closeLabel?: string
  closeOnBackdrop?: boolean
  initialFocus?: RefObject<HTMLElement | null>
}
/** Native top layer provides focus trapping, inert background and focus restoration. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  closeLabel = 'Close',
  closeOnBackdrop = true,
  initialFocus,
  className,
  children,
  onCancel,
  onClose,
  onClick,
  onKeyDown,
  ...props
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  const startedOnBackdrop = useRef(false)
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      element.showModal()
      const target =
        initialFocus?.current ??
        element.querySelector<HTMLElement>('[autofocus], [data-cake-autofocus="true"]') ??
        element.querySelector<HTMLElement>(
          '.cake-dialog-body input:not(:disabled):not([type="hidden"]), .cake-dialog-body select:not(:disabled), .cake-dialog-body textarea:not(:disabled), .cake-dialog-body button:not(:disabled)'
        )
      if (target && element.contains(target)) target.focus()
    }
    if (!open && element.open) element.close()
  }, [open, initialFocus])
  useEffect(() => {
    const element = dialog.current
    return () => {
      if (element?.open) element.close()
    }
  }, [])
  return (
    <dialog
      {...props}
      ref={dialog}
      className={cx('cake-dialog', className)}
      aria-labelledby={id + '-title'}
      aria-describedby={description ? id + '-description' : props['aria-describedby']}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (
          event.defaultPrevented ||
          event.key !== 'Tab' ||
          (event.target as HTMLElement).closest('dialog') !== event.currentTarget
        )
          return
        const stops = getTabStops(event.currentTarget)
        const first = stops[0]
        const last = stops.at(-1)
        if (!first) {
          event.preventDefault()
          event.currentTarget.focus()
          return
        }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      onCancel={(event) => {
        onCancel?.(event)
        const prevented = event.defaultPrevented
        event.preventDefault()
        if (!prevented) onOpenChange(false)
      }}
      onClose={(event) => {
        onClose?.(event)
        // Ignore the delayed close event if a controlled dialog has already reopened.
        if (open && !event.currentTarget.open) onOpenChange(false)
      }}
      onPointerDown={(event) => {
        props.onPointerDown?.(event)
        const rect = event.currentTarget.getBoundingClientRect()
        startedOnBackdrop.current =
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
      }}
      onClick={(event) => {
        onClick?.(event)
        if (
          !event.defaultPrevented &&
          closeOnBackdrop &&
          startedOnBackdrop.current &&
          event.target === event.currentTarget
        )
          onOpenChange(false)
        startedOnBackdrop.current = false
      }}
    >
      <div className="cake-dialog-header">
        <h2 className="cake-dialog-title" id={id + '-title'}>
          {title}
        </h2>
        <Button variant="ghost" size="small" aria-label={closeLabel} onClick={() => onOpenChange(false)}>
          ×
        </Button>
      </div>
      {description && (
        <p className="cake-dialog-description" id={id + '-description'}>
          {description}
        </p>
      )}
      <div className="cake-dialog-body">{children}</div>
      {footer && <div className="cake-dialog-footer">{footer}</div>}
    </dialog>
  )
}
