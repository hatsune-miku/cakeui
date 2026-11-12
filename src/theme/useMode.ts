import { useEffect, useState } from 'react'

import { resolveThemeOptions } from './config'
import type { ResolvedThemeMode, ThemeConfig } from './types'

export function useThemeMode(config: ThemeConfig): ResolvedThemeMode {
  const [dark, setDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    function changed() {
      setDark(media!.matches)
    }
    changed()
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }, [])
  const mode = resolveThemeOptions(config).mode
  return mode === 'system' ? (dark ? 'dark' : 'light') : mode
}
