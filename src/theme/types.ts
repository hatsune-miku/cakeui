export type ThemePreset = 'blue' | 'pink' | 'gold' | 'dousha' | 'dousha-classic' | 'grape'
export type ThemeScheme = ThemePreset | 'custom'
export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedThemeMode = 'light' | 'dark'
export type ThemeForeground = 'auto' | 'light' | 'dark'
export type ThemeTextRole = 'body' | 'button' | 'primary' | 'selected' | 'input' | 'status'
export interface ThemeComponentForeground {
  foreground: ThemeForeground
  label: string
}
export type ThemePairName =
  | 'canvas'
  | 'surface'
  | 'surfaceRaised'
  | 'muted'
  | 'input'
  | 'inputHover'
  | 'inputActive'
  | 'button'
  | 'buttonHover'
  | 'buttonActive'
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
  textRoles?: Partial<Record<ResolvedThemeMode, Partial<Record<ThemeTextRole, ThemeForeground>>>>
  components?: Partial<Record<ResolvedThemeMode, Record<string, ThemeComponentForeground>>>
  /** Both members are required. Overrides are opaque colors with contrast >= 4.5. */
  pairs?: Partial<Record<ResolvedThemeMode, Partial<Record<ThemePairName, ThemeColorPair>>>>
}
export interface ThemeConfig {
  version: 2
  scheme: ThemeScheme
  customColor: string
  /** Relative luminance percent, 0–100. Default 18; larger values prefer light text. */
  foregroundThreshold?: number
  options: Partial<Record<ThemeScheme, ThemeSchemeOptions>>
}
export interface ThemeConfigInput {
  scheme?: ThemeScheme
  customColor?: string
  mode?: ThemeMode
  foreground?: ThemeForeground
  foregroundThreshold?: number
  textRoles?: ThemeSchemeOptions['textRoles']
  components?: ThemeSchemeOptions['components']
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
  reason: 'legacy-palette' | 'foreground-choice'
}
export interface GeneratedTheme {
  scheme: ThemeScheme
  mode: ResolvedThemeMode
  pairs: Record<ThemePairName, ThemeColorPair>
  variables: Record<`--cake-${string}`, string>
  /** Actual legacy or explicit foreground exceptions, not a whole-page WCAG claim. */
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
