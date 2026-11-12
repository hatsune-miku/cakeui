import { type CSSProperties, type ComponentPropsWithRef, useEffect, useMemo, useRef, useState } from 'react'

import { trackFocusInput } from '../../focus'
import { createThemeConfig, migrateThemeConfig, resolveThemeOptions, serializeThemeConfig } from '../../theme'
import type { ThemeConfig, ThemeForeground, ThemePreset, ThemeStorageAdapter } from '../../theme'
import { ThemeContext } from '../../theme/context'
import { themeStyle } from '../../theme/style'
import { cx } from '../../utils'
import { ThemePersonalization } from '../ThemePersonalization'

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
  locale?: 'en' | 'zh-CN'
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
  locale = 'en',
  className,
  children,
  style,
  ...props
}: CakeProviderProps) {
  useEffect(() => trackFocusInput(document), [])
  const base =
    defaultConfig ??
    createThemeConfig({ scheme: accentColor ? 'custom' : theme, customColor: accentColor, mode, foreground })
  const baseKey = serializeThemeConfig(base)
  const [selected, setSelected] = useState<{ baseKey: string; value: ThemeConfig } | null>(null)
  const [preview, setPreview] = useState<{
    owner: string
    value: ThemeConfig
    edit?: (value: ThemeConfig) => void
  } | null>(null)
  const adapters = useRef(new Map<string, ThemeStorageAdapter>())
  const applied = config ? migrateThemeConfig(config) : selected?.baseKey === baseKey ? selected.value : base
  const appliedKey = serializeThemeConfig(applied)
  const visible = preview?.value ?? applied
  const variables = useMemo(() => themeStyle(visible), [serializeThemeConfig(visible)])
  const scope = useMemo(
    () => ({
      config: applied,
      current: visible,
      locale,
      preview: (owner: string, value: ThemeConfig | null, edit?: (value: ThemeConfig) => void) =>
        setPreview((previous) =>
          value ? { owner, value: migrateThemeConfig(value), edit } : previous?.owner === owner ? null : previous
        ),
      apply: (value: ThemeConfig) => {
        const next = migrateThemeConfig(value)
        if (config === undefined) setSelected({ baseKey, value: next })
        onThemeChange?.(next)
      },
      commit: async (value: ThemeConfig) => {
        const next = migrateThemeConfig(value)
        if (preview?.edit) {
          preview.edit(next)
          return
        }
        if (config === undefined) setSelected({ baseKey, value: next })
        onThemeChange?.(next)
        const adapter = adapters.current.values().next().value
        await adapter?.save(next)
      },
      registerStorage: (owner: string, storage: ThemeStorageAdapter) => {
        adapters.current.set(owner, storage)
        return () => {
          adapters.current.delete(owner)
        }
      },
    }),
    [appliedKey, serializeThemeConfig(visible), baseKey, config !== undefined, onThemeChange, locale, preview?.owner]
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
        <ThemePersonalization />
      </div>
    </ThemeContext.Provider>
  )
}
