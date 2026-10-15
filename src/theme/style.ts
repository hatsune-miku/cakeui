import { generateTheme } from './generate'
import type { ThemeConfig } from './types'

/** Both modes are rendered for SSR; CSS media queries choose system mode before hydration. */
export function themeStyle(config: ThemeConfig): Record<string, string> {
  const style: Record<string, string> = {}
  for (const mode of ['light', 'dark'] as const) {
    for (const [name, value] of Object.entries(generateTheme(config, mode).variables)) {
      style[`--cake-config-${mode}-${name.slice(7)}`] = value
    }
  }
  return style
}
