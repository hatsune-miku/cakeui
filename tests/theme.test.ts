import { describe, expect, it, vi } from 'vitest'

import {
  applyTheme,
  createThemeConfig,
  createThemeStorage,
  generateTheme,
  migrateThemeConfig,
  normalizeThemeColor,
  resetThemeScheme,
  resolveThemeOptions,
  serializeThemeConfig,
  themeContrast,
  themePresets,
  updateThemeConfig,
  validateThemeConfig,
} from '../src/theme'

describe('theme colors and semantics', () => {
  it('normalizes opaque HEX and RGB without clamping invalid input', () => {
    expect(normalizeThemeColor('#aB3')).toBe('#aabb33')
    expect(normalizeThemeColor('  RGB(255, 0, 128) ')).toBe('#ff0080')
    expect(normalizeThemeColor('rgb(100% 0% 50%)')).toBe('#ff0080')
    expect(normalizeThemeColor('rgb(255 0 128)')).toBe('#ff0080')
    for (const input of [
      '',
      '#abcd',
      '#ffffffff',
      'rgba(1,2,3,1)',
      'rgb(256,0,0)',
      'rgb(-1 0 0)',
      'rgb(101% 0% 0%)',
      'rgb(20%, 0, 3)',
      'url(test)',
      'red',
      null,
      {},
    ])
      expect(normalizeThemeColor(input)).toBeNull()
    expect(themeContrast('#000', '#fff')).toBe(21)
  })

  it('keeps legacy backgrounds and chooses readable foregrounds automatically', () => {
    const pink = generateTheme(createThemeConfig({ scheme: 'pink', mode: 'light' }))
    expect(pink.variables['--cake-primary']).toBe('var(--cake-accent)')
    expect(pink.variables['--cake-accent']).toBe('#d15776')
    expect(pink.variables['--cake-surface']).toBe('rgba(255, 255, 255, 0.66)')
    expect(pink.contrastIssues).toEqual([])
    const blue = generateTheme(createThemeConfig({ scheme: 'blue', mode: 'light' }))
    expect(blue.variables['--cake-accent-soft']).toBe('#d6e7f7')
  })

  it('limits legacy contrast exceptions to the fixed accent fill and disabled text', () => {
    for (const scheme of ['blue', 'pink', 'gold'] as const)
      for (const mode of ['light', 'dark'] as const) {
        const { contrastIssues } = generateTheme(createThemeConfig({ scheme, mode }))
        expect(
          contrastIssues.map((issue) => issue.pair).filter((pair) => pair !== 'accent' && pair !== 'disabled'),
          `${scheme}/${mode}`
        ).toEqual([])
      }
  })

  it('paints visible selection controls for every preset and mode', () => {
    for (const preset of themePresets)
      for (const mode of ['light', 'dark'] as const) {
        const { variables } = generateTheme(createThemeConfig({ scheme: preset.id, mode }))
        expect(variables['--cake-choice-appearance'], preset.id).toBe('none')
        expect(
          themeContrast(variables['--cake-switch-off-thumb'], variables['--cake-switch-off-fill']),
          `${preset.id}/${mode}`
        ).toBeGreaterThanOrEqual(3)
      }
    // Pink's surface is translucent and must never become the mark on its accent fill.
    for (const mode of ['light', 'dark'] as const)
      expect(generateTheme(createThemeConfig({ scheme: 'pink', mode })).variables['--cake-switch-thumb']).toBe(
        '#ffffff'
      )
  })

  it('uses only the shadow forms CakeDesign allows', () => {
    for (const preset of themePresets)
      for (const mode of ['light', 'dark'] as const) {
        const { variables } = generateTheme(createThemeConfig({ scheme: preset.id, mode }))
        expect(variables['--cake-atmosphere'], `${preset.id}/${mode}`).toMatch(/^0 (?:0|\d{2}px) \d{2,3}px/)
        if (mode === 'dark') expect(variables['--cake-atmosphere'], preset.id).not.toContain('#2b3845')
      }
  })

  it('covers all six presets, both background modes and every foreground choice', () => {
    expect(themePresets.map((preset) => preset.id)).toEqual([
      'blue',
      'pink',
      'gold',
      'dousha',
      'dousha-classic',
      'grape',
    ])
    for (const preset of themePresets)
      for (const mode of ['light', 'dark'] as const)
        for (const foreground of ['auto', 'light', 'dark'] as const) {
          const result = generateTheme(createThemeConfig({ scheme: preset.id, mode, foreground }))
          const legacy = ['blue', 'pink', 'gold'].includes(preset.id)
          if (!legacy && foreground === 'auto')
            expect(result.contrastIssues, preset.id + '/' + mode + '/' + foreground).toEqual([])
          if (foreground !== 'auto') {
            for (const name of [
              'accent',
              'accentHover',
              'accentActive',
              'accentSoft',
              'accentSoftHover',
              'selected',
            ] as const) {
              expect(result.pairs[name].foreground).toBe(foreground === 'dark' ? '#161b22' : '#ffffff')
            }
          }
          const original = generateTheme(createThemeConfig({ scheme: preset.id, mode }))
          expect(result.pairs.canvas.background).toBe(original.pairs.canvas.background)
          for (const name of Object.keys(result.pairs) as (keyof typeof result.pairs)[])
            expect(result.pairs[name].background, `${preset.id}/${mode}/${foreground}/${name}`).toBe(
              original.pairs[name].background
            )
          if (preset.id === 'dousha-classic' || preset.id === 'dousha')
            expect(result.pairs.canvas.background).toBe(mode === 'light' ? '#fff5f2' : '#272123')
        }
  })

  it('changes only foreground variables, preserving translucent fills and legacy aliases', () => {
    const inks = new Set([
      '--cake-primary-ink',
      '--cake-primary-hover-ink',
      '--cake-primary-active-ink',
      '--cake-accent-ink',
      '--cake-accent-soft-hover-ink',
      '--cake-selected-ink',
      '--cake-switch-thumb',
      '--cake-text',
      '--cake-surface-text',
      '--cake-popup-text',
      '--cake-muted',
      '--cake-control-text',
      '--cake-control-hover-text',
      '--cake-control-active-text',
      '--cake-button-text',
      '--cake-button-hover-text',
      '--cake-button-active-text',
      '--cake-disabled-ink',
      '--cake-success',
      '--cake-success-hover-ink',
      '--cake-warning',
      '--cake-warning-hover-ink',
      '--cake-danger',
      '--cake-danger-hover-ink',
    ])
    for (const scheme of [...themePresets.map((preset) => preset.id), 'custom'] as const)
      for (const mode of ['light', 'dark'] as const) {
        const original = generateTheme(createThemeConfig({ scheme, mode, customColor: '#524396' }))
        for (const foreground of ['light', 'dark'] as const) {
          const result = generateTheme(createThemeConfig({ scheme, mode, foreground, customColor: '#524396' }))
          for (const [name, value] of Object.entries(original.variables))
            if (!inks.has(name)) expect(result.variables[name as keyof typeof result.variables], name).toBe(value)
          for (const issue of result.contrastIssues)
            if (
              ['accent', 'accentHover', 'accentActive', 'accentSoft', 'accentSoftHover', 'selected'].includes(
                issue.pair
              )
            )
              expect(issue.reason).toBe('foreground-choice')
        }
      }
  })

  it('derives readable opaque state pairs even at color gamut extremes', () => {
    const colors = [
      '#000000',
      '#ffffff',
      '#ff0000',
      '#00ff00',
      '#0000ff',
      '#00ffff',
      '#ff00ff',
      '#ffff00',
      '#fefeff',
      '#010102',
      '#b37d87',
      '#adc89e',
    ]
    for (const customColor of colors)
      for (const mode of ['light', 'dark'] as const)
        for (const foreground of ['auto', 'light', 'dark'] as const) {
          const result = generateTheme(createThemeConfig({ scheme: 'custom', customColor, mode, foreground }))
          if (foreground === 'auto') expect(result.contrastIssues, customColor + mode + foreground).toEqual([])
          const original = generateTheme(createThemeConfig({ scheme: 'custom', customColor, mode }))
          for (const name of Object.keys(result.pairs) as (keyof typeof result.pairs)[])
            expect(result.pairs[name].background).toBe(original.pairs[name].background)
          for (const pair of Object.values(result.pairs)) {
            expect(pair.background).toMatch(/^#[\da-f]{6}$/)
            if (foreground === 'auto')
              expect(themeContrast(pair.background, pair.foreground)).toBeGreaterThanOrEqual(4.5)
          }
          expect(
            new Set(['success', 'warning', 'danger'].map((name) => result.variables[`--cake-${name}-soft`])).size
          ).toBe(3)
        }
  })

  it('keeps computed card edges quieter than control outlines in light and dark themes', () => {
    for (const scheme of ['dousha', 'dousha-classic', 'grape', 'custom'] as const)
      for (const mode of ['light', 'dark'] as const)
        for (const customColor of ['#000000', '#ffffff', '#524396']) {
          const result = generateTheme(createThemeConfig({ scheme, mode, customColor }))
          const edge = result.variables['--cake-hairline'].match(/#[\da-f]{6}$/)?.[0]
          expect(edge).toBeDefined()
          const contrast = themeContrast(edge!, result.pairs.surface.background)
          expect(contrast).toBeGreaterThan(1)
          expect(contrast).toBeLessThan(1.3)
          expect(contrast).toBeLessThan(themeContrast(result.variables['--cake-line'], result.pairs.surface.background))
          expect(themeContrast(result.variables['--cake-focus'], result.pairs.input.background)).toBeGreaterThanOrEqual(
            3
          )
        }
    const overridden = generateTheme(
      createThemeConfig({
        scheme: 'grape',
        mode: 'light',
        pairs: { light: { surface: { background: '#000000', foreground: '#ffffff' } } },
      })
    )
    const edge = overridden.variables['--cake-hairline'].match(/#[\da-f]{6}$/)![0]
    expect(themeContrast(edge, overridden.pairs.surface.background)).toBeLessThan(1.3)
  })
})

describe('theme configuration and migration', () => {
  it('remembers options per scheme and preserves custom color while resetting only the current scheme', () => {
    let config = createThemeConfig({
      scheme: 'custom',
      customColor: 'rgb(15,25,35)',
      mode: 'dark',
      foreground: 'light',
    })
    config = updateThemeConfig(config, { scheme: 'pink', mode: 'light', foreground: 'dark' })
    config = updateThemeConfig(config, { scheme: 'custom' })
    expect(config.customColor).toBe('#0f1923')
    expect(resolveThemeOptions(config)).toMatchObject({ mode: 'dark', foreground: 'light' })
    const reset = resetThemeScheme(config)
    expect(reset.customColor).toBe('#cfe2f5')
    expect(reset.options.pink).toMatchObject({ mode: 'light', foreground: 'dark' })
    expect(config.customColor).toBe('#0f1923')
    expect(migrateThemeConfig(serializeThemeConfig(config))).toEqual(config)
  })

  it('migrates old provider settings and v1 scheme settings without business fields', () => {
    expect(migrateThemeConfig({ theme: 'gold', mode: 'dark' })).toEqual(
      createThemeConfig({ scheme: 'gold', mode: 'dark' })
    )
    const migrated = migrateThemeConfig({
      version: 1,
      scheme: 'dousha-classic',
      customColor: '#f03',
      overrides: { 'dousha-classic': { foreground: 'light', tintTopbar: true }, custom: { foreground: 'dark' } },
      tintTopbar: true,
    })
    expect(migrated.scheme).toBe('dousha-classic')
    expect(migrated.customColor).toBe('#ff0033')
    expect(serializeThemeConfig(migrated)).not.toContain('tintTopbar')
    expect(migrated.options.custom?.foreground).toBe('dark')
    expect(() => migrateThemeConfig({ version: 99 })).toThrow(/version/)
    expect(() => migrateThemeConfig('{broken')).toThrow()
    expect(() => createThemeConfig({ customColor: 'transparent' })).toThrow()
    expect(validateThemeConfig({ ...createThemeConfig(), scheme: '__proto__' }).valid).toBe(false)
  })

  it('validates complete semantic pair overrides and isolates the two modes', () => {
    const config = createThemeConfig({
      scheme: 'custom',
      mode: 'system',
      pairs: { light: { accent: { background: '#123', foreground: '#fff' } } },
    })
    expect(generateTheme(config, 'light').pairs.accent).toEqual({ background: '#112233', foreground: '#ffffff' })
    expect(generateTheme(config, 'dark').pairs.accent.background).not.toBe('#112233')
    expect(() =>
      createThemeConfig({ pairs: { light: { accent: { background: '#fff', foreground: '#eee' } } } })
    ).toThrow(/contrast/)
    expect(
      validateThemeConfig({
        ...config,
        options: {
          custom: { mode: 'light', foreground: 'auto', pairs: { light: { accent: { foreground: '#fff' } } } },
        },
      }).valid
    ).toBe(false)
  })
})

describe('theme application and storage adapters', () => {
  it('removes stale overrides, follows system changes, and preserves business styles and preexisting values', () => {
    const events = new EventTarget()
    const media = {
      matches: false,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    }
    vi.stubGlobal('matchMedia', () => media)
    const element = document.createElement('div')
    element.style.setProperty('--business-spacing', '18px')
    element.style.setProperty('--cake-bg', '#123456', 'important')
    const config = createThemeConfig({
      scheme: 'custom',
      customColor: '#f03',
      pairs: { light: { accent: { background: '#112233', foreground: '#fff' } } },
    })
    const controller = applyTheme(element, config)
    expect(element.style.getPropertyValue('--cake-primary')).toBe('#112233')
    controller.update(createThemeConfig({ scheme: 'grape', mode: 'system' }))
    expect(element.style.getPropertyValue('--cake-primary')).not.toBe('#112233')
    media.matches = true
    events.dispatchEvent(new Event('change'))
    expect(element.style.getPropertyValue('--cake-color-scheme')).toBe('dark')
    expect(element.style.getPropertyValue('--business-spacing')).toBe('18px')
    element.style.setProperty('--cake-focus', '#abcdef')
    controller.destroy()
    expect(element.style.getPropertyValue('--cake-bg')).toBe('#123456')
    expect(element.style.getPropertyPriority('--cake-bg')).toBe('important')
    expect(element.style.getPropertyValue('--cake-primary')).toBe('')
    expect(element.style.getPropertyValue('--cake-focus')).toBe('#abcdef')
    expect(() => controller.update(config)).toThrow(/destroyed/)
    vi.unstubAllGlobals()
  })

  it('does not silently swallow storage failures or persist during reads', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() }
    const adapter = createThemeStorage(storage, 'example-theme')
    expect(adapter.load()).toBeNull()
    expect(storage.setItem).not.toHaveBeenCalled()
    adapter.save(createThemeConfig({ scheme: 'grape' }))
    expect(storage.setItem).toHaveBeenCalledWith('example-theme', expect.stringContaining('"scheme":"grape"'))
    storage.setItem.mockImplementation(() => {
      throw new Error('Quota')
    })
    expect(() => adapter.save(createThemeConfig())).toThrow('Quota')
  })
})

describe('foreground preferences', () => {
  it('keeps role overrides per scheme and mode, and threshold global', () => {
    let config = createThemeConfig({
      scheme: 'dousha',
      mode: 'light',
      foreground: 'light',
      foregroundThreshold: 18,
      textRoles: { light: { button: 'auto', primary: 'dark' } },
      components: { light: { 'key:save': { foreground: 'dark', label: 'Save' } } },
    })
    const theme = generateTheme(config)
    expect(theme.pairs.canvas.foreground).toBe('#ffffff')
    expect(theme.pairs.button.foreground).not.toBe('#ffffff')
    expect(theme.pairs.accent.foreground).toBe('#161b22')
    config = updateThemeConfig(config, { scheme: 'grape' })
    expect(resolveThemeOptions(config).textRoles).toBeUndefined()
    config = updateThemeConfig(config, { scheme: 'dousha', mode: 'dark' })
    expect(generateTheme(config).pairs.button.foreground).toBe('#ffffff')
    expect(
      resolveThemeOptions(migrateThemeConfig(serializeThemeConfig(config))).components?.light?.['key:save'].label
    ).toBe('Save')
    expect(resetThemeScheme(config).foregroundThreshold).toBe(18)
  })

  it('moves the threshold without changing any background', () => {
    const base = createThemeConfig({ scheme: 'custom', customColor: '#888888', mode: 'light' })
    const low = generateTheme(updateThemeConfig(base, { foregroundThreshold: 0 }))
    const high = generateTheme(updateThemeConfig(base, { foregroundThreshold: 100 }))
    expect(low.pairs.accent.foreground).toBe('#161b22')
    expect(high.pairs.accent.foreground).toBe('#ffffff')
    for (const name of Object.keys(low.pairs) as (keyof typeof low.pairs)[])
      expect(high.pairs[name].background).toBe(low.pairs[name].background)
    for (const name of [
      '--cake-switch-thumb',
      '--cake-base-muted',
      '--cake-base-success',
      '--cake-base-warning',
      '--cake-base-danger',
    ] as const)
      expect(high.variables[name]).toBe(low.variables[name])
    expect(high.contrastIssues.length).toBeGreaterThan(0)
  })

  it('rejects malformed overrides and unsafe identities instead of dropping preferences', () => {
    const base = createThemeConfig()
    for (const foregroundThreshold of [-1, 101, NaN, Infinity, '20'])
      expect(validateThemeConfig({ ...base, foregroundThreshold }).valid).toBe(false)
    for (const textRoles of [{ sepia: { body: 'auto' } }, { light: { unknown: 'auto' } }, { light: { body: 'red' } }])
      expect(
        validateThemeConfig({ ...base, options: { blue: { mode: 'light', foreground: 'auto', textRoles } } }).valid
      ).toBe(false)
    const components = JSON.parse('{"light":{"__proto__":{"foreground":"light","label":"x"}}}')
    expect(
      validateThemeConfig({ ...base, options: { blue: { mode: 'light', foreground: 'auto', components } } }).valid
    ).toBe(false)
  })
})
