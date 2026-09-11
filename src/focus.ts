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
