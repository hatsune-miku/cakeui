import { useContext, useEffect, useId, useRef, useState } from 'react'

import {
  createThemeConfig,
  generateTheme,
  migrateThemeConfig,
  normalizeThemeColor,
  resetThemeScheme,
  resolveThemeOptions,
  serializeThemeConfig,
  themePresets,
  updateThemeConfig,
} from '../../theme'
import type { ThemeConfig, ThemePreset, ThemeStorageAdapter } from '../../theme'
import { ThemeContext } from '../../theme/context'
import { Button, type ButtonProps } from '../Button'
import { Dialog } from '../Dialog'
import { RadioButton } from '../RadioButton'
import { TextBox } from '../TextBox'

export interface ThemeSettingsLabels {
  open: string
  title: string
  scheme: string
  custom: string
  color: string
  colorPicker: string
  mode: string
  system: string
  light: string
  dark: string
  foreground: string
  auto: string
  lightForeground: string
  darkForeground: string
  apply: string
  cancel: string
  reset: string
  invalidColor: string
  storageError: string
  retry: string
  loading: string
}
export interface ThemeSettingsProps extends Omit<ButtonProps, 'onClick'> {
  storage?: ThemeStorageAdapter
  onStorageError?: (error: unknown, operation: 'load' | 'save') => void
  onOpenChange?: (open: boolean) => void
  labels?: Partial<ThemeSettingsLabels>
}
const defaultLabels: ThemeSettingsLabels = {
  open: 'Theme',
  title: 'Theme settings',
  scheme: 'Color scheme',
  custom: 'Custom',
  color: 'HEX or RGB',
  colorPicker: 'Choose accent color',
  mode: 'Background',
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  foreground: 'Accent foreground',
  auto: 'Auto',
  lightForeground: 'Light text',
  darkForeground: 'Dark text',
  apply: 'Apply',
  cancel: 'Cancel',
  reset: 'Reset this scheme',
  invalidColor: 'Enter an opaque HEX or RGB color.',
  storageError: 'Theme storage failed. Your current appearance is kept.',
  retry: 'Retry',
  loading: 'Loading theme…',
}
const swatches = new Map<ThemePreset, string>()
/** The fill a preset actually paints, which for some presets differs from its generator seed. */
function presetSwatch(id: ThemePreset) {
  let color = swatches.get(id)
  if (!color) {
    color = generateTheme(createThemeConfig({ scheme: id, mode: 'light' })).pairs.accent.background
    swatches.set(id, color)
  }
  return color
}
function describeStorageError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/** A native button opens a modal editor. Only Apply writes through the optional adapter. */
export function ThemeSettings({
  storage,
  onStorageError,
  onOpenChange,
  labels,
  children,
  disabled,
  ...props
}: ThemeSettingsProps) {
  const scope = useContext(ThemeContext)
  if (!scope) throw new Error('ThemeSettings must be inside CakeProvider.')
  const id = useId()
  const selectedRadio = useRef<HTMLInputElement>(null)
  const live = useRef({ scope, onStorageError, onOpenChange })
  live.current = { scope, onStorageError, onOpenChange }
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ThemeConfig>(() => createThemeConfig())
  const [colorText, setColorText] = useState(draft.customColor)
  const [loading, setLoading] = useState(Boolean(storage))
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<{ message: string; pending?: ThemeConfig } | null>(null)
  const mounted = useRef(true)
  const copy = { ...defaultLabels, ...labels }
  const options = resolveThemeOptions(draft)
  const invalid = draft.scheme === 'custom' && !normalizeThemeColor(colorText)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      live.current.scope.preview(id, null)
    }
  }, [id])
  useEffect(() => {
    let active = true
    setLoading(Boolean(storage))
    if (!storage) return
    const before = serializeThemeConfig(live.current.scope.config)
    async function load() {
      try {
        const value = await storage!.load()
        if (active && value != null && serializeThemeConfig(live.current.scope.config) === before)
          live.current.scope.apply(migrateThemeConfig(value))
      } catch (error) {
        if (active) {
          setFailure({ message: describeStorageError(error) })
          live.current.onStorageError?.(error, 'load')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [storage])

  function change(next: ThemeConfig) {
    setDraft(next)
    scope!.preview(id, next)
  }
  function close() {
    scope!.preview(id, null)
    setOpen(false)
    onOpenChange?.(false)
  }
  async function persist(next: ThemeConfig) {
    setFailure(null)
    if (!storage) return
    setSaving(true)
    try {
      await storage.save(next)
    } catch (error) {
      if (mounted.current) setFailure({ message: describeStorageError(error), pending: next })
      live.current.onStorageError?.(error, 'save')
    } finally {
      if (mounted.current) setSaving(false)
    }
  }
  async function apply() {
    if (invalid) return
    const next = migrateThemeConfig(draft)
    scope!.apply(next)
    close()
    await persist(next)
  }
  return (
    <>
      <Button
        {...props}
        disabled={disabled || loading}
        aria-disabled={saving || props['aria-disabled']}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (saving) return
          const next = migrateThemeConfig(scope.config)
          setDraft(next)
          setColorText(next.customColor)
          setOpen(true)
          onOpenChange?.(true)
        }}
      >
        {children ?? (loading ? copy.loading : copy.open)}
      </Button>
      {failure && (
        <span className="cake-theme-settings-status" role="status">
          {copy.storageError} {failure.message}
          {failure.pending && (
            <Button size="small" variant="ghost" disabled={saving} onClick={() => void persist(failure.pending!)}>
              {copy.retry}
            </Button>
          )}
        </span>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) close()
        }}
        title={copy.title}
        closeLabel={copy.cancel}
        initialFocus={selectedRadio}
        className="cake-theme-settings-dialog"
        footer={
          <>
            <Button
              className="cake-theme-settings-reset"
              onClick={() => {
                const next = resetThemeScheme(draft)
                setColorText(next.customColor)
                change(next)
              }}
            >
              {copy.reset}
            </Button>
            <Button onClick={close}>{copy.cancel}</Button>
            <Button variant="primary" disabled={Boolean(invalid)} onClick={() => void apply()}>
              {copy.apply}
            </Button>
          </>
        }
      >
        <fieldset className="cake-theme-settings-group">
          <legend className="cake-theme-settings-legend">{copy.scheme}</legend>
          <div className="cake-theme-settings-presets">
            {themePresets.map((preset) => (
              <RadioButton
                key={preset.id}
                ref={draft.scheme === preset.id ? selectedRadio : undefined}
                name={id + '-scheme'}
                value={preset.id}
                checked={draft.scheme === preset.id}
                className="cake-theme-settings-preset"
                onChange={() => change(updateThemeConfig(draft, { scheme: preset.id }))}
              >
                <span
                  className="cake-theme-settings-swatch"
                  style={{ background: presetSwatch(preset.id) }}
                  aria-hidden="true"
                />
                {preset.name}
              </RadioButton>
            ))}
            <RadioButton
              ref={draft.scheme === 'custom' ? selectedRadio : undefined}
              name={id + '-scheme'}
              value="custom"
              checked={draft.scheme === 'custom'}
              className="cake-theme-settings-preset"
              onChange={() => change(updateThemeConfig(draft, { scheme: 'custom' }))}
            >
              {copy.custom}
            </RadioButton>
          </div>
        </fieldset>
        {draft.scheme === 'custom' && (
          <div className="cake-theme-settings-colors">
            <TextBox
              type="color"
              aria-label={copy.colorPicker}
              className="cake-theme-settings-picker"
              value={draft.customColor}
              onChange={(event) => {
                setColorText(event.currentTarget.value)
                change(updateThemeConfig(draft, { customColor: event.currentTarget.value }))
              }}
            />
            <div className="cake-theme-settings-color-field">
              <label htmlFor={id + '-color'} className="cake-theme-settings-color-label">
                {copy.color}
              </label>
              <TextBox
                id={id + '-color'}
                value={colorText}
                spellCheck={false}
                aria-invalid={Boolean(invalid)}
                aria-describedby={invalid ? id + '-error' : undefined}
                onChange={(event) => {
                  const value = event.currentTarget.value
                  setColorText(value)
                  const color = normalizeThemeColor(value)
                  if (color) change(updateThemeConfig(draft, { customColor: color }))
                }}
                onBlur={() => {
                  if (!invalid) setColorText(draft.customColor)
                }}
              />
            </div>
            {invalid && (
              <p id={id + '-error'} className="cake-theme-settings-error" role="alert">
                {copy.invalidColor}
              </p>
            )}
          </div>
        )}
        <fieldset className="cake-theme-settings-group">
          <legend className="cake-theme-settings-legend">{copy.mode}</legend>
          <div className="cake-theme-settings-options">
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <RadioButton
                key={mode}
                name={id + '-mode'}
                checked={options.mode === mode}
                onChange={() => change(updateThemeConfig(draft, { mode }))}
              >
                {copy[mode]}
              </RadioButton>
            ))}
          </div>
        </fieldset>
        <fieldset className="cake-theme-settings-group">
          <legend className="cake-theme-settings-legend">{copy.foreground}</legend>
          <div className="cake-theme-settings-options">
            {(['auto', 'light', 'dark'] as const).map((foreground) => (
              <RadioButton
                key={foreground}
                name={id + '-foreground'}
                checked={options.foreground === foreground}
                onChange={() => change(updateThemeConfig(draft, { foreground }))}
              >
                {copy[foreground === 'auto' ? 'auto' : foreground === 'light' ? 'lightForeground' : 'darkForeground']}
              </RadioButton>
            ))}
          </div>
        </fieldset>
      </Dialog>
    </>
  )
}
