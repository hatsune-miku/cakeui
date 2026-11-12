import { normalizeThemeColor, themeContrast } from './color'
import { schemes } from './presets'
import type {
  ThemeConfig,
  ThemeConfigInput,
  ThemePairName,
  ThemeSchemeOptions,
  ThemeTextRole,
  ThemeValidation,
} from './types'

export const textRoles: readonly ThemeTextRole[] = ['body', 'button', 'primary', 'selected', 'input', 'status']

export const pairNames: readonly ThemePairName[] = [
  'canvas',
  'surface',
  'surfaceRaised',
  'muted',
  'input',
  'inputHover',
  'inputActive',
  'button',
  'buttonHover',
  'buttonActive',
  'accent',
  'accentHover',
  'accentActive',
  'accentSoft',
  'accentSoftHover',
  'selected',
  'disabled',
  'success',
  'successHover',
  'warning',
  'warningHover',
  'danger',
  'dangerHover',
]
const defaultColor = '#cfe2f5'
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function validate(value: unknown): ThemeConfig {
  if (!record(value) || value.version !== 2) throw new TypeError('Expected CakeUI theme config version 2.')
  if (!schemes.includes(value.scheme as ThemeConfig['scheme'])) throw new TypeError('Unknown theme scheme.')
  const customColor = normalizeThemeColor(value.customColor)
  if (!customColor) throw new TypeError('customColor must be an opaque HEX or RGB color.')
  if (!record(value.options)) throw new TypeError('options must be a scheme map.')
  const threshold = value.foregroundThreshold
  if (
    threshold !== undefined &&
    (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 100)
  )
    throw new TypeError('foregroundThreshold must be between 0 and 100.')
  const options: ThemeConfig['options'] = {}
  for (const [scheme, raw] of Object.entries(value.options)) {
    if (!schemes.includes(scheme as ThemeConfig['scheme']) || !record(raw))
      throw new TypeError('Invalid scheme options.')
    if (!['system', 'light', 'dark'].includes(String(raw.mode))) throw new TypeError('Invalid background mode.')
    if (!['auto', 'light', 'dark'].includes(String(raw.foreground))) throw new TypeError('Invalid accent foreground.')
    const entry: ThemeSchemeOptions = {
      mode: raw.mode as ThemeSchemeOptions['mode'],
      foreground: raw.foreground as ThemeSchemeOptions['foreground'],
    }
    for (const name of ['textRoles', 'components'] as const) {
      const source = raw[name]
      if (source === undefined) continue
      if (!record(source)) throw new TypeError(name + ' must be a light/dark map.')
      const target: Record<string, Record<string, unknown>> = {}
      for (const [mode, rules] of Object.entries(source)) {
        if (!['light', 'dark'].includes(mode) || !record(rules) || Object.keys(rules).length > 500)
          throw new TypeError('Invalid foreground override map.')
        target[mode] = {}
        for (const [key, rule] of Object.entries(rules)) {
          if (!key || key.length > 8192 || ['__proto__', 'constructor', 'prototype'].includes(key))
            throw new TypeError('Invalid component identity.')
          if (name === 'textRoles') {
            if (!textRoles.includes(key as ThemeTextRole) || !['auto', 'light', 'dark'].includes(String(rule)))
              throw new TypeError('Invalid text role.')
            target[mode][key] = rule
          } else {
            if (
              !record(rule) ||
              !['auto', 'light', 'dark'].includes(String(rule.foreground)) ||
              typeof rule.label !== 'string' ||
              rule.label.length > 200
            )
              throw new TypeError('Invalid component foreground.')
            target[mode][key] = { foreground: rule.foreground, label: rule.label }
          }
        }
      }
      Object.assign(entry, { [name]: target })
    }
    if (raw.pairs !== undefined) {
      if (!record(raw.pairs)) throw new TypeError('pairs must be a light/dark map.')
      entry.pairs = {}
      for (const [mode, pairs] of Object.entries(raw.pairs)) {
        if (!['light', 'dark'].includes(mode) || !record(pairs)) throw new TypeError('Invalid pair mode.')
        const target: NonNullable<ThemeSchemeOptions['pairs']>['light'] = {}
        for (const [name, pair] of Object.entries(pairs)) {
          if (!pairNames.includes(name as ThemePairName) || !record(pair)) throw new TypeError('Invalid semantic pair.')
          const background = normalizeThemeColor(pair.background),
            foreground = normalizeThemeColor(pair.foreground)
          if (!background || !foreground) throw new TypeError(name + ' requires both opaque background and foreground.')
          if (themeContrast(background, foreground) < 4.5)
            throw new TypeError(name + ' contrast must be at least 4.5:1.')
          target[name as ThemePairName] = { background, foreground }
        }
        entry.pairs[mode as 'light' | 'dark'] = target
      }
    }
    options[scheme as ThemeConfig['scheme']] = entry
  }
  return {
    version: 2,
    scheme: value.scheme as ThemeConfig['scheme'],
    customColor,
    ...(threshold === undefined ? {} : { foregroundThreshold: threshold }),
    options,
  }
}
export function validateThemeConfig(value: unknown): ThemeValidation {
  try {
    return { valid: true, config: validate(value), errors: [] }
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : String(error)] }
  }
}
export function createThemeConfig(input: ThemeConfigInput = {}): ThemeConfig {
  const scheme = input.scheme ?? 'blue'
  return validate({
    version: 2,
    scheme,
    customColor: input.customColor ?? defaultColor,
    foregroundThreshold: input.foregroundThreshold,
    options: {
      [scheme]: {
        mode: input.mode ?? 'system',
        foreground: input.foreground ?? 'auto',
        textRoles: input.textRoles,
        components: input.components,
        ...(input.pairs ? { pairs: input.pairs } : {}),
      },
    },
  })
}
export function resolveThemeOptions(config: ThemeConfig): ThemeSchemeOptions {
  const current = validate(config)
  return current.options[current.scheme] ?? { mode: 'system', foreground: 'auto' }
}
export function updateThemeConfig(config: ThemeConfig, patch: ThemeConfigInput): ThemeConfig {
  const current = validate(config),
    scheme = patch.scheme ?? current.scheme
  const previous = current.options[scheme] ?? { mode: 'system', foreground: 'auto' }
  return validate({
    ...current,
    scheme,
    customColor: patch.customColor ?? current.customColor,
    foregroundThreshold: patch.foregroundThreshold ?? current.foregroundThreshold,
    options: {
      ...current.options,
      [scheme]: {
        ...previous,
        mode: patch.mode ?? previous.mode,
        foreground: patch.foreground ?? previous.foreground,
        textRoles: patch.textRoles ?? previous.textRoles,
        components: patch.components ?? previous.components,
        pairs: patch.pairs ?? previous.pairs,
      },
    },
  })
}
/** Reset only the selected scheme; remembered options for all others survive. */
export function resetThemeScheme(config: ThemeConfig): ThemeConfig {
  const current = validate(config)
  delete current.options[current.scheme]
  if (current.scheme === 'custom') current.customColor = defaultColor
  return current
}
export function serializeThemeConfig(config: ThemeConfig): string {
  return JSON.stringify(validate(config))
}

/** Explicit migrations; unknown versions and malformed values never silently become defaults. */
export function migrateThemeConfig(value: unknown): ThemeConfig {
  if (typeof value === 'string') {
    if (schemes.includes(value as ThemeConfig['scheme']))
      return createThemeConfig({ scheme: value as ThemeConfig['scheme'] })
    return migrateThemeConfig(JSON.parse(value))
  }
  if (value == null) return createThemeConfig()
  if (!record(value)) throw new TypeError('Invalid stored theme configuration.')
  if (value.version === 2) return validate(value)
  if (value.version !== undefined && value.version !== 1)
    throw new TypeError('Unsupported theme configuration version.')
  let current = createThemeConfig({
    scheme: (value.scheme ?? value.theme ?? 'blue') as ThemeConfig['scheme'],
    customColor: (value.customColor ?? defaultColor) as string,
    mode: (value.mode ?? 'system') as ThemeSchemeOptions['mode'],
    foreground: (value.foreground ?? 'auto') as ThemeSchemeOptions['foreground'],
  })
  if (value.version === 1 && value.overrides !== undefined) {
    if (!record(value.overrides)) throw new TypeError('Invalid legacy overrides.')
    const active = current.scheme
    for (const scheme of schemes) {
      const old = value.overrides[scheme]
      if (old === undefined) continue
      if (!record(old)) throw new TypeError('Invalid legacy scheme options.')
      current = updateThemeConfig(current, {
        scheme,
        mode: (old.mode ?? value.mode ?? 'system') as ThemeSchemeOptions['mode'],
        foreground: (old.foreground ?? 'auto') as ThemeSchemeOptions['foreground'],
      })
    }
    current.scheme = active
  }
  return current
}
