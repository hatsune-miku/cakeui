import * as React from 'react'

export * from '../index'
export * as presentation from '../presentation'
export * as theme from '../theme'
export { React }
export { createRoot } from 'react-dom/client'

declare const __CAKEUI_VERSION__: string
export const version = __CAKEUI_VERSION__
