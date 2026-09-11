import { createContext, useContext } from 'react'

export interface TabsContextValue {
  id: string
  value: string
  setValue: (value: string) => void
  orientation: 'horizontal' | 'vertical'
}
export const TabsContext = createContext<TabsContextValue | null>(null)
export function useTabs() {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabList, Tab and TabPanel must be inside Tabs.')
  return context
}
export function tabId(id: string, value: string) {
  return `${id}-tab-${encodeURIComponent(value)}`
}
export function panelId(id: string, value: string) {
  return `${id}-panel-${encodeURIComponent(value)}`
}
