import type * as Browser from './index'

declare global {
  const CakeUI: typeof Browser
  interface Window {
    CakeUI: typeof Browser
  }
}

export {}
