import { type CSSProperties, type ComponentPropsWithRef, useMemo, useState } from 'react'

import { createThemeConfig, migrateThemeConfig, resolveThemeOptions, serializeThemeConfig } from '../../theme'
import type { ThemeConfig, ThemeForeground, ThemePreset } from '../../theme'
import { ThemeContext } from '../../theme/context'
import { themeStyle } from '../../theme/style'
import { cx } from '../../utils'

export type CakeTheme = ThemePreset
export type CakeMode = 'light' | 'dark' | 'system'
export interface CakeProviderProps extends ComponentPropsWithRef<'div'> {
  theme?: CakeTheme
  mode?: CakeMode
  density?: 'comfortable' | 'compact'
  accentColor?: string
  foreground?: ThemeForeground
  config?: ThemeConfig
  defaultConfig?: ThemeConfig
  onThemeChange?: (config: ThemeConfig) => void
}

/** Nestable semantic CSS scope, with transactional preview for ThemeSettings. */
export function CakeProvider({
  theme = 'blue',
  mode = 'system',
  density = 'comfortable',
  accentColor,
  foreground = 'auto',
  config,
  defaultConfig,
  onThemeChange,
  className,
  children,
  style,
  ...props
}: CakeProviderProps) {
  const base =
    defaultConfig ??
    createThemeConfig({ scheme: accentColor ? 'custom' : theme, customColor: accentColor, mode, foreground })
  const baseKey = serializeThemeConfig(base)
  const [selected, setSelected] = useState<{ baseKey: string; value: ThemeConfig } | null>(null)
  const [preview, setPreview] = useState<{ owner: string; value: ThemeConfig } | null>(null)
  const applied = config ? migrateThemeConfig(config) : selected?.baseKey === baseKey ? selected.value : base
  const appliedKey = serializeThemeConfig(applied)
  const visible = preview?.value ?? applied
  const variables = useMemo(() => themeStyle(visible), [serializeThemeConfig(visible)])
  const scope = useMemo(
    () => ({
      config: applied,
      current: visible,
      preview: (owner: string, value: ThemeConfig | null) =>
        setPreview((previous) =>
          value ? { owner, value: migrateThemeConfig(value) } : previous?.owner === owner ? null : previous
        ),
      apply: (value: ThemeConfig) => {
        const next = migrateThemeConfig(value)
        if (config === undefined) setSelected({ baseKey, value: next })
        onThemeChange?.(next)
      },
    }),
    [appliedKey, serializeThemeConfig(visible), baseKey, config !== undefined, onThemeChange]
  )
  return (
    <ThemeContext.Provider value={scope}>
      <div
        {...props}
        className={cx('cake-theme', className)}
        data-theme={visible.scheme}
        data-mode={resolveThemeOptions(visible).mode}
        data-density={density}
        data-cake-theme-config="true"
        style={{ ...variables, ...style } as CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
