import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { componentBackground } from './background'
import { textCopy } from './copy'
import { componentIdentity, componentLabel, componentPosition, textTargets } from './identity'

import { resolveThemeOptions, serializeThemeConfig, updateThemeConfig } from '../../theme'
import type { ThemeConfig, ThemeForeground } from '../../theme'
import { textForeground } from '../../theme/color'
import { ThemeContext } from '../../theme/context'
import { useThemeMode } from '../../theme/useMode'
import { Button } from '../Button'

type Selection = { element: HTMLElement; key: string; label: string; unique: boolean; x: number; y: number }

/** Internal provider service: no business markup, IDs or storage handlers are required for ordinary controls. */
export function ThemePersonalization() {
  const scope = useContext(ThemeContext)!
  const mode = useThemeMode(scope.current)
  const marker = useRef<HTMLSpanElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [failure, setFailure] = useState<{ message: string; config: ThemeConfig } | null>(null)
  const [saving, setSaving] = useState(false)
  const sessionRules = useRef(new Map<HTMLElement, ThemeForeground>())
  const refresh = useRef(() => {})
  const live = useRef({ scope, mode, selection })
  live.current = { scope, mode, selection }
  const copy = textCopy(scope.locale)

  useEffect(() => {
    const root = marker.current!.parentElement!
    const owner = root.ownerDocument
    const view = owner.defaultView!
    const originals = new Map<HTMLElement, { value: string; priority: string; marker: string | null }>()
    let candidates = new Map<HTMLElement, { key: string; label: string; unique: boolean }>()
    const identities = new WeakMap<HTMLElement, { key: string; region: string }>()
    let frame = 0
    let timer = 0
    let press: { element: HTMLElement; x: number; y: number; opened: boolean; moved: boolean } | null = null
    let replaying = false
    let suppressMenu = false
    function target(value: EventTarget | null) {
      const element = value instanceof Element ? value.closest<HTMLElement>(textTargets) : null
      return element?.closest('.cake-theme') === root && !element.closest('[data-cake-personalization-ui]')
        ? element
        : null
    }
    function restore(element: HTMLElement) {
      const original = originals.get(element)
      if (!original) return
      if (original.value) element.style.setProperty('--cake-user-foreground', original.value, original.priority)
      else element.style.removeProperty('--cake-user-foreground')
      if (original.marker === null) element.removeAttribute('data-cake-text-override')
      else element.setAttribute('data-cake-text-override', original.marker)
      originals.delete(element)
    }
    function scan() {
      frame = 0
      const { scope: current, mode: currentMode } = live.current
      const rules = resolveThemeOptions(current.current).components?.[currentMode] ?? {}
      const elements = [...root.querySelectorAll<HTMLElement>(textTargets)].filter(
        (element) => target(element) === element
      )
      const counts = new Map<string, number>()
      const next = new Map<HTMLElement, { key: string; label: string; unique: boolean }>()
      for (const element of elements) {
        const calculated = componentIdentity(element, root)
        const region = calculated.startsWith('auto:')
          ? JSON.stringify(JSON.parse(calculated.slice(5)).slice(0, -1))
          : calculated
        const remembered = identities.get(element)
        const key = remembered?.region === region ? remembered.key : calculated
        identities.set(element, { key, region })
        counts.set(key, (counts.get(key) ?? 0) + 1)
        next.set(element, { key, label: componentLabel(element), unique: false })
      }
      for (const [element, identity] of next) {
        if (identity.key.startsWith('auto:') && counts.get(identity.key)! > 1) {
          identity.key += `#copies:${counts.get(identity.key)}:${componentPosition(element, root)}`
          identity.unique = true
        } else identity.unique = counts.get(identity.key) === 1
        const preference =
          sessionRules.current.get(element) ?? (identity.unique ? rules[identity.key]?.foreground : undefined)
        if (!preference) {
          restore(element)
          continue
        }
        if (!originals.has(element))
          originals.set(element, {
            value: element.style.getPropertyValue('--cake-user-foreground'),
            priority: element.style.getPropertyPriority('--cake-user-foreground'),
            marker: element.getAttribute('data-cake-text-override'),
          })
        const color =
          preference === 'auto'
            ? textForeground(componentBackground(element), 'auto', current.current.foregroundThreshold ?? 18)
            : preference === 'light'
              ? '#ffffff'
              : '#161b22'
        element.style.setProperty('--cake-user-foreground', color)
        element.setAttribute('data-cake-text-override', '')
      }
      for (const element of originals.keys()) if (!next.has(element)) restore(element)
      for (const element of sessionRules.current.keys()) if (!next.has(element)) sessionRules.current.delete(element)
      candidates = next
      if (live.current.selection && !root.contains(live.current.selection.element)) setSelection(null)
    }
    function schedule() {
      if (!frame) frame = view.requestAnimationFrame(scan)
    }
    refresh.current = schedule
    function cancel() {
      view.clearTimeout(timer)
      timer = 0
      press = null
    }
    function show(element: HTMLElement, x: number, y: number) {
      scan()
      const identity = candidates.get(element)
      if (!identity) return
      setFailure(null)
      setSelection({ element, ...identity, x, y })
    }
    function pointerDown(event: PointerEvent) {
      suppressMenu = false
      cancel()
      schedule()
      if (event.button !== 2) {
        suppressMenu = false
        cancel()
        return
      }
      const element = target(event.target)
      if (!element) return
      suppressMenu = true
      press = { element, x: event.clientX, y: event.clientY, opened: false, moved: false }
      event.preventDefault()
      event.stopPropagation()
      timer = view.setTimeout(() => {
        if (!press || press.moved || !element.isConnected) return
        press.opened = true
        show(element, press.x, press.y)
      }, 600)
    }
    function mouseDown(event: MouseEvent) {
      if (press && event.button === 2) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    function pointerMove(event: PointerEvent) {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
        press.moved = true
        view.clearTimeout(timer)
      }
    }
    function pointerUp(event: PointerEvent) {
      if (!press || event.button !== 2) return
      const saved = press
      cancel()
      event.preventDefault()
      event.stopPropagation()
      if (!saved.opened && !saved.moved && saved.element.isConnected) {
        replaying = true
        saved.element.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2,
            clientX: saved.x,
            clientY: saved.y,
            view,
          })
        )
        replaying = false
      }
    }
    function contextMenu(event: MouseEvent) {
      if (!replaying && suppressMenu && event.button === 2) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    function keyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') cancel()
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'c') {
        const element = target(event.target)
        if (!element) return
        event.preventDefault()
        event.stopPropagation()
        const rect = element.getBoundingClientRect()
        show(element, rect.left, rect.bottom)
      }
    }
    function blur() {
      cancel()
      suppressMenu = false
      setSelection(null)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'id',
        'aria-label',
        'aria-labelledby',
        'title',
        'name',
        'data-cake-theme-key',
        'data-variant',
        'aria-selected',
        'class',
      ],
    })
    const events = {
      pointerdown: pointerDown,
      mousedown: mouseDown,
      pointermove: pointerMove,
      pointerup: pointerUp,
      contextmenu: contextMenu,
      auxclick: contextMenu,
      keydown: keyDown,
    } as const
    for (const [name, handler] of Object.entries(events)) owner.addEventListener(name, handler as EventListener, true)
    for (const name of ['pointerover', 'pointerout', 'pointerup', 'focusin', 'keyup', 'transitionend'])
      owner.addEventListener(name, schedule, true)
    owner.addEventListener('pointercancel', cancel, true)
    view.addEventListener('blur', blur)
    scan()
    return () => {
      cancel()
      view.cancelAnimationFrame(frame)
      observer.disconnect()
      for (const [name, handler] of Object.entries(events))
        owner.removeEventListener(name, handler as EventListener, true)
      for (const name of ['pointerover', 'pointerout', 'pointerup', 'focusin', 'keyup', 'transitionend'])
        owner.removeEventListener(name, schedule, true)
      owner.removeEventListener('pointercancel', cancel, true)
      view.removeEventListener('blur', blur)
      for (const element of originals.keys()) restore(element)
    }
  }, [])
  useEffect(() => {
    refresh.current()
  }, [serializeThemeConfig(scope.current), mode])

  useEffect(() => {
    const popup = menu.current
    if (!selection || !popup) return
    popup.showPopover()
    const rect = popup.getBoundingClientRect()
    popup.style.left = `${Math.max(8, Math.min(selection.x, window.innerWidth - rect.width - 8))}px`
    popup.style.top = `${Math.max(8, Math.min(selection.y, window.innerHeight - rect.height - 8))}px`
    popup.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true })
    function outside(event: PointerEvent) {
      if (!popup!.contains(event.target as Node)) setSelection(null)
    }
    function dismiss() {
      setSelection(null)
    }
    function scroll(event: Event) {
      if (!popup!.contains(event.target as Node)) dismiss()
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', dismiss)
    return () => {
      if (popup.isConnected && popup.matches(':popover-open')) popup.hidePopover()
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', dismiss)
      if (restoreFocus.current) {
        if (restoreFocus.current.isConnected) restoreFocus.current.focus({ preventScroll: true })
        restoreFocus.current = null
      }
    }
  }, [selection])
  function close() {
    restoreFocus.current = selection?.element ?? null
    setSelection(null)
  }
  async function persist(next: ThemeConfig) {
    setSaving(true)
    setFailure(null)
    try {
      await scope.commit(next)
    } catch (error) {
      setFailure({ message: error instanceof Error ? error.message : String(error), config: next })
    } finally {
      setSaving(false)
    }
  }
  async function choose(foreground: ThemeForeground | 'inherit') {
    if (!selection || saving) return
    if (!selection.unique) {
      if (foreground === 'inherit') sessionRules.current.delete(selection.element)
      else sessionRules.current.set(selection.element, foreground)
      refresh.current()
      setSelection({ ...selection })
      return
    }
    const options = resolveThemeOptions(scope.current)
    const components = { ...options.components, [mode]: { ...options.components?.[mode] } }
    if (foreground === 'inherit') delete components[mode]![selection.key]
    else components[mode]![selection.key] = { foreground, label: selection.label }
    await persist(updateThemeConfig(scope.current, { components }))
  }
  const chosen =
    (selection &&
      (sessionRules.current.get(selection.element) ??
        resolveThemeOptions(scope.current).components?.[mode]?.[selection.key]?.foreground)) ||
    'inherit'
  return (
    <>
      <span ref={marker} hidden data-cake-personalization-ui="true" />
      {selection &&
        createPortal(
          <div
            ref={menu}
            popover="manual"
            role="menu"
            aria-label={copy.title}
            className="cake-text-menu"
            data-cake-personalization-ui="true"
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Tab') {
                event.preventDefault()
                event.stopPropagation()
                close()
              }
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault()
                event.stopPropagation()
                const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')]
                const index = items.indexOf(document.activeElement as HTMLButtonElement)
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? items.length - 1
                      : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length
                items[next]?.focus()
              }
            }}
          >
            <div className="cake-text-menu-heading">
              {copy.title}
              <Button variant="ghost" size="small" aria-label={copy.close} onClick={close}>
                ×
              </Button>
            </div>
            <div className="cake-text-menu-target">{selection.label}</div>
            {(['inherit', 'auto', 'light', 'dark'] as const).map((value) => (
              <Button
                key={value}
                variant="ghost"
                role="menuitemradio"
                aria-checked={chosen === value}
                aria-disabled={saving}
                onClick={() => void choose(value)}
              >
                {copy[value]}
                {chosen === value && <span aria-hidden="true">✓</span>}
              </Button>
            ))}
            {!selection.unique && <p className="cake-text-menu-message">{copy.ambiguous}</p>}
            {failure && (
              <div role="status" className="cake-text-menu-message">
                {copy.error}: {failure.message}
                <Button disabled={saving} onClick={() => void persist(failure.config)}>
                  {copy.retry}
                </Button>
              </div>
            )}
          </div>,
          selection.element.closest('dialog[open]') ?? marker.current!.parentElement!
        )}
    </>
  )
}
