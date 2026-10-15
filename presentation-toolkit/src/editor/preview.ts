function installPreviewFocusGuard() {
  const frame = window.frameElement
  if (!frame) return

  function editorOwnsFocus() {
    return frame!.ownerDocument.activeElement !== frame
  }

  // Prevent focus loss instead of restoring it after blur, which can end IME input.
  for (const prototype of [HTMLElement.prototype, SVGElement.prototype]) {
    const focus = prototype.focus
    prototype.focus = function (options?: FocusOptions) {
      if (!editorOwnsFocus()) focus.call(this, options)
    }
  }

  function removeAutofocus(node: Node) {
    if (!(node instanceof Element)) return
    node.removeAttribute('autofocus')
    for (const child of node.querySelectorAll('[autofocus]')) child.removeAttribute('autofocus')
  }
  // Native autofocus does not call the JavaScript focus method.
  new MutationObserver((records) => {
    if (!editorOwnsFocus()) return
    for (const record of records) {
      if (record.type === 'attributes') removeAutofocus(record.target)
      else for (const node of record.addedNodes) removeAutofocus(node)
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['autofocus'] })
}

export function editorPreviewHtml(html: string) {
  return html.replace(
    '<head>',
    `<head><script data-cake-editor-preview-focus>(${installPreviewFocusGuard.toString()})();</script>`
  )
}
