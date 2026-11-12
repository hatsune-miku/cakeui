import { migrateThemeConfig, serializeThemeConfig } from './config'
import { generateTheme } from './generate'
import type { ThemeConfig, ThemeController, ThemeStorageAdapter } from './types'

const controllers = new WeakMap<HTMLElement, ThemeController>()
/** Owns only variables it writes. Business variables and subsequent external writes survive cleanup. */
export function applyTheme(element: HTMLElement, config: ThemeConfig): ThemeController {
  let current = migrateThemeConfig(config)
  generateTheme(current) // Validate before changing the scope or replacing its previous controller.
  controllers.get(element)?.destroy()
  const media = element.ownerDocument.defaultView?.matchMedia?.('(prefers-color-scheme: dark)')
  const original = new Map<string, { value: string; priority: string }>()
  const owned = new Map<string, string>()
  let destroyed = false
  function restore(name: string) {
    if (element.style.getPropertyValue(name) !== owned.get(name) || element.style.getPropertyPriority(name)) return
    const old = original.get(name)!
    if (old.value) element.style.setProperty(name, old.value, old.priority)
    else element.style.removeProperty(name)
  }
  function render() {
    const { variables } = generateTheme(current, media?.matches ? 'dark' : 'light')
    for (const name of owned.keys())
      if (!(name in variables)) {
        restore(name)
        owned.delete(name)
      }
    for (const [name, value] of Object.entries(variables)) {
      if (!original.has(name))
        original.set(name, {
          value: element.style.getPropertyValue(name),
          priority: element.style.getPropertyPriority(name),
        })
      element.style.setProperty(name, value)
      owned.set(name, value)
    }
  }
  const controller: ThemeController = {
    update: (next) => {
      if (destroyed) throw new Error('Theme controller has been destroyed.')
      current = migrateThemeConfig(next)
      render()
    },
    destroy: () => {
      if (destroyed) return
      destroyed = true
      media?.removeEventListener('change', render)
      for (const name of owned.keys()) restore(name)
      if (controllers.get(element) === controller) controllers.delete(element)
    },
  }
  media?.addEventListener('change', render)
  controllers.set(element, controller)
  render()
  return controller
}
/** The caller selects a key and storage instance; importing CakeUI never accesses localStorage. */
export function createThemeStorage(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string = 'cakeui-theme'
): ThemeStorageAdapter {
  return {
    load: () => {
      const value = storage.getItem(key)
      return value == null ? null : migrateThemeConfig(value)
    },
    save: (config) => storage.setItem(key, serializeThemeConfig(config)),
  }
}
