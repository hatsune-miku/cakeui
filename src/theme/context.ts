import { createContext } from 'react'

import type { ThemeConfig } from './types'

export interface ThemeScope {
  config: ThemeConfig
  current: ThemeConfig
  preview: (owner: string, value: ThemeConfig | null) => void
  apply: (value: ThemeConfig) => void
}
export const ThemeContext = createContext<ThemeScope | null>(null)
