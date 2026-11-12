export const textTargets = [
  '.cake-button',
  '.cake-tab',
  '.cake-menuitem',
  '.cake-tag',
  '.cake-textbox',
  '.cake-textarea',
  '.cake-numberbox',
  '.cake-combobox',
  '.cake-checkbox',
  '.cake-radio',
  '.cake-switch',
  '.cake-card',
].join(',')

function stableId(element: HTMLElement) {
  const id = element.id
  return id && !/(?:^:|_r_|«r|»)/.test(id) ? id : ''
}
function named(element: HTMLElement) {
  const labelled = element
    .getAttribute('aria-labelledby')
    ?.split(/\s+/)
    .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? '')
    .join(' ')
  return (element.getAttribute('aria-label') || labelled || element.getAttribute('title') || '').trim()
}
export function componentLabel(element: HTMLElement) {
  return (
    named(element) ||
    element.getAttribute('name') ||
    element.textContent ||
    element.getAttribute('placeholder') ||
    element.tagName
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}
/** Semantic identities survive reordering; ambiguous identical controls are deliberately not guessed. */
export function componentIdentity(element: HTMLElement, scope: HTMLElement) {
  const explicit = element.getAttribute('data-cake-theme-key') || stableId(element)
  if (explicit) return 'key:' + explicit
  const parts: string[] = []
  for (let parent = element.parentElement; parent && parent !== scope; parent = parent.parentElement) {
    const id = stableId(parent)
    const label =
      named(parent) ||
      parent
        .querySelector(
          ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > legend, :scope > .cake-dialog-header > .cake-dialog-title'
        )
        ?.textContent?.trim()
    if (id || label) parts.unshift(id ? '#' + id : label!.slice(0, 200))
    if (id || parts.length === 8) break
  }
  const kind = [...element.classList].find((name) => name.startsWith('cake-')) || element.tagName
  return 'auto:' + JSON.stringify([...parts, kind, componentLabel(element)])
}

/** Position only breaks ties between controls with the same semantic identity. */
export function componentPosition(element: HTMLElement, scope: HTMLElement) {
  const parts: string[] = []
  for (let node: HTMLElement | null = element; node && node !== scope; node = node.parentElement) {
    const current = node
    const kind = [...current.classList].find((name) => name.startsWith('cake-')) || current.tagName
    const peers = [...(current.parentElement?.children ?? [])].filter((peer) =>
      kind.startsWith('cake-') ? peer.classList.contains(kind) : peer.tagName === kind
    )
    parts.unshift(kind + ':' + peers.indexOf(current))
  }
  return parts.join('/')
}
