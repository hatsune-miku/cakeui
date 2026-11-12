import { type ReactNode, createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'

import { cakeColors } from '../../tokens'

export type CakeMode = 'light' | 'dark' | 'system'
export type CakeColors = { [K in keyof typeof cakeColors.light]: string }
export interface CakeProviderProps {
  mode?: CakeMode
  children: ReactNode
}
const ThemeContext = createContext<{ colors: CakeColors; dark: boolean }>({ colors: cakeColors.light, dark: false })
export function CakeProvider({ mode = 'system', children }: CakeProviderProps) {
  const system = useColorScheme()
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark')
  const value = useMemo(() => ({ colors: dark ? cakeColors.dark : cakeColors.light, dark }), [dark])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export function useCakeTheme() {
  return useContext(ThemeContext)
}
