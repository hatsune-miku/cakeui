/** Serialized into preview responses only; keep this function self-contained. */
export function previewClient(revision: string) {
  const events = new EventSource('/__cake_presentation/events')
  let overlay: HTMLPreElement | undefined
  events.onmessage = (event) => {
    const state = JSON.parse(event.data) as { revision: string; error: string | null }
    if (state.error) {
      if (!overlay) {
        overlay = document.createElement('pre')
        overlay.id = 'cake-presentation-build-error'
        overlay.setAttribute('role', 'alert')
        overlay.style.cssText =
          'position:fixed;inset:16px;z-index:2147483647;overflow:auto;margin:0;padding:24px;' +
          'background:#fff4f6;color:#781e38;border:2px solid #b93d5c;border-radius:12px;' +
          'font:14px/1.6 monospace;white-space:pre-wrap;user-select:text;'
        document.body.append(overlay)
      }
      overlay.textContent = '构建失败，修复并保存后会自动恢复。\n\n' + state.error
    } else if (state.revision !== revision) {
      events.close()
      location.reload()
    } else {
      overlay?.remove()
      overlay = undefined
    }
  }
  window.addEventListener('pagehide', () => events.close(), { once: true })
}
