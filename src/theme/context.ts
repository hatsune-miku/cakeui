import { createContext } from 'react'

import type { ThemeConfig, ThemeStorageAdapter } from './types'

export interface ThemeScope {
  config: ThemeConfig
  current: ThemeConfig
  locale: 'en' | 'zh-CN'
  preview: (owner: string, value: ThemeConfig | null, edit?: (value: ThemeConfig) => void) => void
  apply: (value: ThemeConfig) => void
  commit: (value: ThemeConfig) => Promise<void>
  registerStorage: (owner: string, storage: ThemeStorageAdapter) => () => void
}
export const ThemeContext = createContext<ThemeScope | null>(null)
