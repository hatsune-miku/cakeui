import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'

import type { ComboBoxProps } from '../..'
import { cx } from '../../../../utils'

type Choice = {
  index: number
  value: string
  label: string
  group: string
  disabled: boolean
  hidden: boolean
}

export function SearchableComboBox({
  ref,
  id,
  className,
  style,
  children,
  autoFocus,
  tabIndex,
  searchPlaceholder = 'Search…',
  emptyText = 'No matching options',
  ...props
}: Omit<ComboBoxProps, 'searchable'>) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-listbox`
  const native = useRef<HTMLSelectElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const composing = useRef(false)
  const [options, setOptions] = useState<Choice[]>([])
  const [selected, setSelected] = useState(-1)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)

  useImperativeHandle(ref, () => native.current!, [])

  function synchronize() {
    const element = native.current
    if (!element) return
    setOptions(
      Array.from(element.options, (option, index) => {
        const group = option.parentElement instanceof HTMLOptGroupElement ? option.parentElement : null
        return {
          index,
          value: option.value,
          label: option.label,
          group: group?.label ?? '',
          disabled: option.disabled || Boolean(group?.disabled),
          hidden: option.hidden || Boolean(group?.hidden),
        }
      })
    )
    setSelected(element.selectedIndex)
  }

  useLayoutEffect(synchronize, [children, props.value, props.defaultValue])

  useEffect(() => {
    const form = native.current?.form
    let timer: ReturnType<typeof setTimeout>
    function reset(event: Event) {
      // Native reset applies its defaults after the reset event has finished.
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (event.defaultPrevented) return
        synchronize()
        input.current?.setCustomValidity('')
        setOpen(false)
      }, 0)
    }
    form?.addEventListener('reset', reset)
    return () => {
      clearTimeout(timer)
      form?.removeEventListener('reset', reset)
    }
  }, [props.form])

  useEffect(() => {
    if (props.disabled) setOpen(false)
  }, [props.disabled])

  const needle = query.trim().toLocaleLowerCase()
  const visible = options.filter(
    (option) => !option.hidden && `${option.label} ${option.value}`.toLocaleLowerCase().includes(needle)
  )
  const enabled = visible.filter((option) => !option.disabled)
  const highlighted = enabled.find((option) => option.index === active) ?? enabled[0]
  const current = options.find((option) =>
    props.value === undefined ? option.index === selected : option.value === String(props.value)
  )

  function show() {
    if (native.current?.matches(':disabled') || open) return
    setQuery('')
    setActive(current?.index ?? -1)
    setOpen(true)
  }

  function choose(option: Choice) {
    const element = native.current
    if (!element || element.matches(':disabled') || option.disabled) return
    if (element.selectedIndex !== option.index) {
      element.selectedIndex = option.index
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    }
    synchronize()
    input.current?.setCustomValidity('')
    setOpen(false)
  }

  function position() {
    const element = popup.current
    const anchor = input.current
    if (!element || !anchor) return
    const rect = anchor.getBoundingClientRect()
    const width = Math.min(rect.width, window.innerWidth - 16)
    const below = window.innerHeight - rect.bottom
    const above = rect.top
    const flip = below < Math.min(240, element.scrollHeight + 14) && above > below
    const height = Math.max(0, Math.min(320, (flip ? above : below) - 14))
    element.style.width = `${width}px`
    element.style.maxHeight = `${height}px`
    element.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`
    element.style.top = `${flip ? Math.max(8, rect.top - 6 - Math.min(element.scrollHeight, height)) : rect.bottom + 6}px`
  }

  useLayoutEffect(() => {
    const element = popup.current
    if (!open || !element) return
    element.showPopover()
    position()
    function dismiss(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    function scroll(event: Event) {
      if (!element?.contains(event.target as Node)) position()
    }
    function blur() {
      setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss, true)
    document.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', position)
    window.addEventListener('blur', blur)
    return () => {
      if (element.isConnected && element.matches(':popover-open')) element.hidePopover()
      document.removeEventListener('pointerdown', dismiss, true)
      document.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', position)
      window.removeEventListener('blur', blur)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    position()
    if (highlighted) document.getElementById(`${listId}-${highlighted.index}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, query, options])

  return (
    <div ref={container} className={cx('cake-combobox-search', className)} style={style}>
      <select
        {...props}
        ref={native}
        className="cake-combobox-native"
        tabIndex={-1}
        aria-hidden="true"
        onFocus={(event) => {
          props.onFocus?.(event)
          if (!event.defaultPrevented) input.current?.focus()
        }}
        onChange={(event) => {
          props.onChange?.(event)
          synchronize()
        }}
        onInvalid={(event) => {
          props.onInvalid?.(event)
          if (event.defaultPrevented) return
          event.preventDefault()
          input.current?.focus()
          input.current?.setCustomValidity(event.currentTarget.validationMessage)
          input.current?.reportValidity()
        }}
      >
        {children}
      </select>
      <input
        ref={input}
        id={inputId}
        className="cake-combobox-search-input"
        role="combobox"
        type="text"
        autoComplete="off"
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        disabled={props.disabled}
        form={props.form}
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-labelledby']}
        aria-describedby={props['aria-describedby']}
        aria-invalid={props['aria-invalid']}
        aria-required={props.required}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && highlighted ? `${listId}-${highlighted.index}` : undefined}
        placeholder={searchPlaceholder}
        value={open ? query : (current?.label ?? '')}
        onFocus={show}
        onClick={show}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          input.current?.setCustomValidity('')
          setQuery(event.target.value)
          setActive(-1)
          setOpen(true)
        }}
        onCompositionStart={() => {
          composing.current = true
        }}
        onCompositionEnd={() => {
          composing.current = false
        }}
        onKeyDown={(event) => {
          if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return
          if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
          } else if (event.key === 'Enter' && open) {
            event.preventDefault()
            if (highlighted) choose(highlighted)
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) show()
            else if (enabled.length) {
              const index = enabled.findIndex((option) => option.index === highlighted?.index)
              const next = enabled[(index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]
              setActive(next.index)
              document.getElementById(`${listId}-${next.index}`)?.scrollIntoView({ block: 'nearest' })
            }
          } else if (event.key === 'Tab') setOpen(false)
        }}
      />
      <span className="cake-combobox-search-arrow" aria-hidden="true" />
      <div ref={popup} popover="manual" className="cake-combobox-search-popup">
        <div
          id={listId}
          role="listbox"
          className="cake-combobox-search-list"
          aria-label={props['aria-label'] ?? searchPlaceholder}
        >
          {visible.map((option) => (
            <div
              key={option.index}
              id={`${listId}-${option.index}`}
              role="option"
              aria-selected={option.index === current?.index}
              aria-disabled={option.disabled || undefined}
              data-active={option.index === highlighted?.index}
              className="cake-combobox-search-option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onPointerMove={() => {
                if (!option.disabled) setActive(option.index)
              }}
            >
              <span className="cake-combobox-search-label">{option.label}</span>
              {option.group && <span className="cake-combobox-search-group">{option.group}</span>}
            </div>
          ))}
        </div>
        {!visible.length && (
          <div className="cake-combobox-search-empty" role="status">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  )
}
