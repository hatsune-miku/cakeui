import { compositeLegacy, foregroundFor, mix, readable, textForeground, themeContrast } from './color'
import { resolveThemeOptions, validateThemeConfig } from './config'
import { legacyPalettes } from './legacy'
import { resolveThemePreset } from './presets'
import type {
  GeneratedTheme,
  ResolvedThemeMode,
  ThemeColorPair,
  ThemeConfig,
  ThemePairName,
  ThemeTextRole,
} from './types'

type Pairs = GeneratedTheme['pairs']
type Variables = GeneratedTheme['variables']
const foregroundPairs = ['accent', 'accentHover', 'accentActive', 'accentSoft', 'accentSoftHover', 'selected'] as const
function pair(background: string, foreground: string): ThemeColorPair {
  return { background, foreground }
}
function accessiblePair(background: string, foreground = foregroundFor(background)): ThemeColorPair {
  return pair(readable(background, foreground), foreground)
}
function derivedPairs(seed: string, mode: ResolvedThemeMode, scheme: ThemeConfig['scheme']): Pairs {
  const dark = mode === 'dark'
  const neutral = dark ? '#101217' : '#ffffff'
  const canvas =
    scheme === 'dousha' || scheme === 'dousha-classic'
      ? dark
        ? '#272123'
        : '#fff5f2'
      : scheme === 'grape'
        ? dark
          ? '#231f22'
          : '#faf7f9'
        : mix(seed, neutral, dark ? 0.91 : 0.96)
  const text = dark ? '#f4f3f7' : '#25232a'
  const surface = mix(canvas, '#ffffff', dark ? 0.045 : 0.55)
  const raised = mix(canvas, '#ffffff', dark ? 0.085 : 0.85)
  const input = mix(canvas, '#ffffff', dark ? 0.07 : 0.8)
  const inputHover = mix(input, dark ? '#ffffff' : seed, dark ? 0.035 : 0.04)
  const fill = dark ? mix(seed, '#101217', 0.35) : seed
  const ink = foregroundFor(fill)
  const hover = mix(fill, ink === '#ffffff' ? '#ffffff' : '#000000', 0.08)
  const active = mix(fill, ink === '#ffffff' ? '#ffffff' : '#000000', 0.15)
  const soft = mix(seed, canvas, dark ? 0.77 : 0.83)
  const softHover = mix(seed, canvas, dark ? 0.67 : 0.73)
  let muted = mix(text, canvas, 0.35)
  for (const background of [canvas, surface, raised, input, inputHover]) muted = readable(muted, background)
  const result: Pairs = {
    canvas: pair(canvas, readable(text, canvas)),
    surface: pair(surface, readable(text, surface)),
    surfaceRaised: pair(raised, readable(text, raised)),
    muted: pair(canvas, muted),
    input: pair(input, readable(text, input)),
    inputHover: pair(inputHover, readable(text, inputHover)),
    inputActive: pair(input, readable(text, input)),
    button: pair(mix(input, text, 0.05), text),
    buttonHover: pair(mix(inputHover, text, 0.05), text),
    buttonActive: pair(soft, readable(seed, soft)),
    accent: accessiblePair(fill, ink),
    accentHover: accessiblePair(hover, ink),
    accentActive: accessiblePair(active, ink),
    accentSoft: pair(soft, readable(seed, soft)),
    accentSoftHover: pair(softHover, readable(seed, softHover)),
    selected: pair(soft, readable(seed, soft)),
    disabled: pair(mix(input, canvas, 0.5), readable(muted, mix(input, canvas, 0.5))),
    success: pair('', ''),
    successHover: pair('', ''),
    warning: pair('', ''),
    warningHover: pair('', ''),
    danger: pair('', ''),
    dangerHover: pair('', ''),
  }
  for (const [name, color] of [
    ['success', '#347747'],
    ['warning', '#936600'],
    ['danger', '#b23948'],
  ] as const) {
    const bg = mix(color, canvas, dark ? 0.77 : 0.87)
    const hoverBg = mix(color, canvas, dark ? 0.67 : 0.78)
    result[name] = pair(bg, readable(dark ? mix(color, '#ffffff', 0.65) : color, bg))
    result[`${name}Hover`] = pair(hoverBg, readable(result[name].foreground, hoverBg))
  }
  return result
}
function legacyPairs(variables: Variables): Pairs {
  function value(name: string): string {
    let result = variables[`--cake-${name}`]
    for (let i = 0; i < 5 && result.startsWith('var('); i++) result = variables[result.slice(4, -1) as keyof Variables]
    return result
  }
  const canvas = value('bg')
  const surface = compositeLegacy(value('surface'), canvas)
  function color(name: string, under = surface) {
    return compositeLegacy(value(name), under)
  }
  const text = color('text'),
    accentInk = color('accent-ink'),
    primaryInk = color('primary-ink')
  const dangerHover = mix(color('danger-soft'), color('danger'), 0.15)
  const result: Pairs = {
    canvas: pair(canvas, text),
    surface: pair(surface, text),
    surfaceRaised: pair(color('popup'), text),
    muted: pair(canvas, color('muted')),
    input: pair(color('control'), text),
    inputHover: pair(color('control-hover'), text),
    inputActive: pair(color('control'), text),
    button: pair(mix(color('control'), text, 0.05), text),
    buttonHover: pair(mix(color('control-hover'), text, 0.05), text),
    buttonActive: pair(color('accent-soft'), accentInk),
    accent: pair(color('primary'), primaryInk),
    accentHover: pair(color('accent-hover'), primaryInk),
    accentActive: pair(color('accent-hover'), primaryInk),
    accentSoft: pair(color('accent-soft'), accentInk),
    accentSoftHover: pair(color('accent-soft'), accentInk),
    selected: pair(surface, readable(color('accent'), surface)),
    disabled: pair(surface, mix(surface, text, 0.5)),
    success: pair(color('success-soft'), color('success')),
    warning: pair(color('warning-soft'), color('warning')),
    danger: pair(color('danger-soft'), color('danger')),
    successHover: pair(color('success-soft'), color('success')),
    warningHover: pair(color('warning-soft'), color('warning')),
    dangerHover: pair(dangerHover, readable(color('danger'), dangerHover)),
  }
  return result
}

const mapping: Record<ThemePairName, [string, string]> = {
  canvas: ['bg', 'text'],
  surface: ['surface', 'surface-text'],
  surfaceRaised: ['popup', 'popup-text'],
  muted: ['muted-background', 'muted'],
  input: ['control', 'control-text'],
  inputHover: ['control-hover', 'control-hover-text'],
  inputActive: ['control-active', 'control-active-text'],
  button: ['button', 'button-text'],
  buttonHover: ['button-hover', 'button-hover-text'],
  buttonActive: ['button-active', 'button-active-text'],
  accent: ['primary', 'primary-ink'],
  accentHover: ['primary-hover', 'primary-hover-ink'],
  accentActive: ['primary-active', 'primary-active-ink'],
  accentSoft: ['accent-soft', 'accent-ink'],
  accentSoftHover: ['accent-soft-hover', 'accent-soft-hover-ink'],
  selected: ['selected', 'selected-ink'],
  disabled: ['disabled', 'disabled-ink'],
  success: ['success-soft', 'success'],
  successHover: ['success-hover', 'success-hover-ink'],
  warning: ['warning-soft', 'warning'],
  warningHover: ['warning-hover', 'warning-hover-ink'],
  danger: ['danger-soft', 'danger'],
  dangerHover: ['danger-hover', 'danger-hover-ink'],
}
function setPair(variables: Variables, name: ThemePairName, value: ThemeColorPair) {
  const [bg, fg] = mapping[name]
  variables[`--cake-${bg}`] = value.background
  variables[`--cake-${fg}`] = value.foreground
}
/** Pure and deterministic. systemMode is supplied by the caller, never read from the DOM. */
export function generateTheme(config: ThemeConfig, systemMode: ResolvedThemeMode = 'light'): GeneratedTheme {
  const validation = validateThemeConfig(config)
  if (!validation.valid) throw new TypeError(validation.errors.join(' '))
  if (systemMode !== 'light' && systemMode !== 'dark') throw new TypeError('Invalid resolved system mode.')
  const current = validation.config,
    options = resolveThemeOptions(current)
  const mode = options.mode === 'system' ? systemMode : options.mode
  const legacy = current.scheme === 'blue' || current.scheme === 'pink' || current.scheme === 'gold'
  const seed = current.scheme === 'custom' ? current.customColor : resolveThemePreset(current.scheme).reference
  const old: Variables = legacy ? { ...legacyPalettes[current.scheme as keyof typeof legacyPalettes][mode] } : {}
  const pairs = legacy ? legacyPairs(old) : derivedPairs(seed, mode, current.scheme)
  const baseText = pairs.canvas.foreground
  const baseSurfaceText = pairs.surface.foreground
  const baseMuted = pairs.muted.foreground
  const dark = mode === 'dark'
  const variables: Variables = {}
  for (const name of Object.keys(mapping) as ThemePairName[]) setPair(variables, name, pairs[name])
  Object.assign(variables, {
    '--cake-base-text': baseText,
    '--cake-base-muted': baseMuted,
    '--cake-base-success': pairs.success.foreground,
    '--cake-base-warning': pairs.warning.foreground,
    '--cake-base-danger': pairs.danger.foreground,
    '--cake-accent': readable(seed, pairs.surface.background),
    '--cake-accent-hover': pairs.accentHover.background,
    '--cake-surface-strong': pairs.surfaceRaised.background,
    '--cake-hover': pairs.inputHover.background,
    '--cake-hover-subtle': pairs.inputHover.background,
    '--cake-accent-subtle': pairs.accentSoft.background,
    '--cake-line': mix(pairs.canvas.foreground, pairs.surface.background, 0.72),
    '--cake-backdrop': dark ? '#00000080' : '#30394238',
    '--cake-shadow': dark ? '0 0 0 1px #ffffff14, 0 28px 80px #0005' : '0 0 0 1px #2b384514, 0 28px 80px #2b38451f',
    '--cake-shadow-strong': 'var(--cake-shadow)',
    '--cake-atmosphere': dark ? '0 28px 80px #0005' : '0 28px 80px #2b38451f',
    '--cake-atmosphere-strong': 'var(--cake-atmosphere)',
    '--cake-edge': 'inset 0 0 0 1px var(--cake-line)',
    '--cake-hairline': 'var(--cake-edge)',
    '--cake-disabled-opacity': '1',
    '--cake-disabled-background': 'var(--cake-disabled)',
    '--cake-disabled-color': 'var(--cake-disabled-ink)',
    '--cake-placeholder-opacity': '1',
    '--cake-switch-fill': 'var(--cake-primary)',
    '--cake-switch-thumb': 'var(--cake-primary-ink)',
    '--cake-check-accent': 'var(--cake-primary)',
  })
  if (legacy) {
    Object.assign(variables, old, {
      '--cake-surface-text': 'var(--cake-text)',
      '--cake-popup-text': 'var(--cake-text)',
      '--cake-control-text': 'var(--cake-text)',
      '--cake-control-hover-text': 'var(--cake-text)',
      '--cake-control-active-text': 'var(--cake-text)',
      '--cake-control-active': 'var(--cake-control)',
      '--cake-primary-hover': 'var(--cake-accent-hover)',
      '--cake-primary-active': 'var(--cake-accent-hover)',
      '--cake-primary-hover-ink': 'var(--cake-primary-ink)',
      '--cake-primary-active-ink': 'var(--cake-primary-ink)',
      '--cake-accent-soft-hover': 'var(--cake-accent-soft)',
      '--cake-accent-soft-hover-ink': 'var(--cake-accent-ink)',
      '--cake-selected': 'var(--cake-surface)',
      '--cake-selected-ink': pairs.selected.foreground,
      '--cake-disabled-opacity': 'initial',
      '--cake-disabled-background': 'initial',
      '--cake-disabled-color': 'initial',
      '--cake-placeholder-opacity': '0.85',
      '--cake-switch-fill': 'var(--cake-accent)',
      // Pink's surface is translucent, so its mark uses the opaque ink already paired with the accent fill.
      '--cake-switch-thumb':
        old['--cake-primary'] === 'var(--cake-accent)' ? 'var(--cake-primary-ink)' : 'var(--cake-surface)',
      '--cake-check-accent': 'var(--cake-accent)',
    })
  }
  // This preset's default white ink defines its base fills, independently of the user's text preference.
  if (current.scheme === 'dousha-classic')
    for (const name of foregroundPairs) {
      pairs[name] = accessiblePair(pairs[name].background, '#ffffff')
      setPair(variables, name, pairs[name])
    }
  // Switch thumbs and selection marks are control graphics, not customizable text.
  variables['--cake-switch-thumb'] = pairs.accent.foreground
  const foreground = options.foreground
  const roles: Record<ThemeTextRole, readonly ThemePairName[]> = {
    body: ['canvas', 'surface', 'surfaceRaised', 'muted', 'disabled'],
    button: ['button', 'buttonHover', 'buttonActive'],
    primary: ['accent', 'accentHover', 'accentActive'],
    selected: ['accentSoft', 'accentSoftHover', 'selected'],
    input: ['input', 'inputHover', 'inputActive'],
    status: ['success', 'successHover', 'warning', 'warningHover', 'danger', 'dangerHover'],
  }
  for (const [role, names] of Object.entries(roles)) {
    const preference = options.textRoles?.[mode]?.[role as ThemeTextRole] ?? foreground
    for (const name of names) {
      const ink = textForeground(pairs[name].background, preference, current.foregroundThreshold ?? 18)
      pairs[name] = pair(pairs[name].background, ink)
      // Never rewrite fills, including translucent legacy values and aliases.
      variables[`--cake-${mapping[name][1]}`] = ink
    }
  }
  for (const [name, override] of Object.entries(options.pairs?.[mode] ?? {})) {
    pairs[name as ThemePairName] = { ...override }
    setPair(variables, name as ThemePairName, override)
  }
  if (!legacy) {
    // Compact cards need the quiet edge used by AnyDrop, separately from the
    // stronger control outline. Composite against the final surface, including overrides.
    const hairline = mix(baseSurfaceText, pairs.surface.background, dark ? 0.95 : 0.94)
    variables['--cake-hairline'] = `inset 0 0 0 1px ${hairline}`
  }
  // Every theme paints its own selection controls: a native control ignores the palette, and on
  // dark schemes it can fall back to a bright white box. The off state needs a visible thumb too.
  const offThumb = dark ? baseText : '#ffffff'
  Object.assign(variables, {
    '--cake-switch-off-fill': readable(mix(pairs.surface.background, baseMuted, 0.55), offThumb, 3),
    '--cake-switch-off-thumb': offThumb,
    '--cake-choice-appearance': 'none',
    '--cake-choice-border': '1px solid color-mix(in srgb, var(--cake-base-muted) 70%, transparent)',
    '--cake-choice-background': 'var(--cake-control)',
    '--cake-choice-fill': 'var(--cake-switch-fill)',
    '--cake-choice-ink': 'var(--cake-switch-thumb)',
    '--cake-choice-radius': '4px',
    '--cake-choice-mark': "''",
  })
  // Public semantic aliases and state pairs work with both original and computed themes.
  Object.assign(variables, {
    '--cake-color-scheme': mode,
    '--cake-accent-fill': 'var(--cake-primary)',
    '--cake-on-accent': 'var(--cake-primary-ink)',
    '--cake-border': 'var(--cake-line)',
    '--cake-focus': readable(
      legacy ? compositeLegacy(variables['--cake-accent'], pairs.canvas.background) : seed,
      pairs.input.background,
      3.1
    ),
  })
  const contrastIssues: GeneratedTheme['contrastIssues'] = []
  for (const [name, [, foregroundName]] of Object.entries(mapping))
    variables[`--cake-editor-${foregroundName}`] = textForeground(pairs[name as ThemePairName].background)
  for (const [name, colors] of Object.entries(pairs)) {
    const ratio = themeContrast(colors.background, colors.foreground)
    if (ratio < 4.5)
      contrastIssues.push({
        pair: name as ThemePairName,
        ratio,
        minimum: 4.5,
        reason: 'foreground-choice',
      })
  }
  return { scheme: current.scheme, mode, pairs, variables, contrastIssues }
}
