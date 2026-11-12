import type { ThemePreset, ThemePresetInfo, ThemeScheme } from './types'

export const themePresets: readonly Readonly<ThemePresetInfo>[] = Object.freeze(
  [
    { id: 'blue', name: '蓝', reference: '#cfe2f5', foreground: 'auto' },
    { id: 'pink', name: '粉', reference: '#f0d4e1', foreground: 'auto' },
    { id: 'gold', name: '金', reference: '#f3d3b9', foreground: 'auto' },
    { id: 'dousha', name: '豆沙', reference: '#b37d87', foreground: 'auto' },
    { id: 'dousha-classic', name: '绿豆沙', reference: '#adc89e', foreground: 'light' },
    { id: 'grape', name: '葡萄', reference: '#d6c8e5', foreground: 'auto' },
  ].map((preset) => Object.freeze(preset as ThemePresetInfo))
)

export const schemes: readonly ThemeScheme[] = [...themePresets.map((preset) => preset.id), 'custom']
export function resolveThemePreset(id: ThemePreset): Readonly<ThemePresetInfo> {
  const preset = themePresets.find((item) => item.id === id)
  if (!preset) throw new TypeError('Unknown CakeUI preset: ' + id)
  return preset
}
