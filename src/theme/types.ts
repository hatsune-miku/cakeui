export type ThemePreset = 'blue' | 'pink' | 'gold' | 'dousha' | 'dousha-classic' | 'grape'
export type ThemeScheme = ThemePreset | 'custom'
export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedThemeMode = 'light' | 'dark'
export type ThemeForeground = 'auto' | 'light' | 'dark'
export type ThemePairName =
  | 'canvas'
  | 'surface'
  | 'surfaceRaised'
  | 'muted'
  | 'input'
  | 'inputHover'
  | 'inputActive'
  | 'accent'
  | 'accentHover'
  | 'accentActive'
  | 'accentSoft'
  | 'accentSoftHover'
  | 'selected'
  | 'disabled'
  | 'success'
  | 'successHover'
  | 'warning'
  | 'warningHover'
  | 'danger'
  | 'dangerHover'

export interface ThemeColorPair {
  background: string
  foreground: string
}
export interface ThemeSchemeOptions {
  mode: ThemeMode
  foreground: ThemeForeground
  /** Both members are required. Overrides are opaque colors with contrast >= 4.5. */
  pairs?: Partial<Record<ResolvedThemeMode, Partial<Record<ThemePairName, ThemeColorPair>>>>
}
export interface ThemeConfig {
  version: 2
  scheme: ThemeScheme
  customColor: string
  options: Partial<Record<ThemeScheme, ThemeSchemeOptions>>
}
export interface ThemeConfigInput {
  scheme?: ThemeScheme
  customColor?: string
  mode?: ThemeMode
  foreground?: ThemeForeground
  pairs?: ThemeSchemeOptions['pairs']
}
export interface ThemePresetInfo {
  id: ThemePreset
  name: string
  reference: string
  foreground: ThemeForeground
}
export interface ThemeContrastIssue {
  pair: ThemePairName
  ratio: number
  minimum: number
  reason: 'legacy-palette'
}
export interface GeneratedTheme {
  scheme: ThemeScheme
  mode: ResolvedThemeMode
  pairs: Record<ThemePairName, ThemeColorPair>
  variables: Record<`--cake-${string}`, string>
  /** Actual known legacy exceptions, not a claim of whole-page WCAG conformance. */
  contrastIssues: ThemeContrastIssue[]
}
export type ThemeValidation = { valid: true; config: ThemeConfig; errors: [] } | { valid: false; errors: string[] }
export interface ThemeStorageAdapter {
  load: () => unknown | Promise<unknown>
  save: (config: ThemeConfig) => void | Promise<void>
}
export interface ThemeController {
  update: (config: ThemeConfig) => void
  destroy: () => void
}
