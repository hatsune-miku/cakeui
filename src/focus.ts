const focusInputs = new WeakMap<Document, { users: number; stop: () => void }>()

/** Share input modality across nested providers and focus restored from native dialogs. */
export function trackFocusInput(owner: Document) {
  let entry = focusInputs.get(owner)
  if (!entry) {
    const root = owner.documentElement
    const previous = root.getAttribute('data-cake-input')
    function pointer() {
      root.setAttribute('data-cake-input', 'pointer')
    }
    function keyboard(event: KeyboardEvent) {
      if (
        event.metaKey ||
        (event.altKey && event.key !== 'Tab') ||
        event.ctrlKey ||
        ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)
      )
        return
      root.setAttribute('data-cake-input', 'keyboard')
    }
    owner.addEventListener('pointerdown', pointer, true)
    owner.addEventListener('keydown', keyboard, true)
    entry = {
      users: 0,
      stop: () => {
        owner.removeEventListener('pointerdown', pointer, true)
        owner.removeEventListener('keydown', keyboard, true)
        if (previous === null) root.removeAttribute('data-cake-input')
        else root.setAttribute('data-cake-input', previous)
      },
    }
    focusInputs.set(owner, entry)
  }
  entry.users++
  return () => {
    if (--entry.users === 0) {
      entry.stop()
      focusInputs.delete(owner)
    }
  }
}

/** Visible tab stops, including the single native tab stop of a radio group. */
export function getTabStops(container: HTMLElement) {
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a[href], area[href], summary, [contenteditable="true"], [tabindex]'
    )
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !element.closest('[hidden], [inert]') &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden'
  )
  return candidates
    .filter((element) => {
      if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) return true
      const group = candidates.filter(
        (candidate): candidate is HTMLInputElement =>
          candidate instanceof HTMLInputElement &&
          candidate.type === 'radio' &&
          candidate.name === element.name &&
          candidate.form === element.form
      )
      return element === (group.find((candidate) => candidate.checked) ?? group[0])
    })
    .sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity))
}
