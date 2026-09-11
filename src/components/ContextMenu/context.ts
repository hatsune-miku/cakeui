import { createContext } from 'react'

export const MenuContext = createContext<(() => void) | null>(null)
