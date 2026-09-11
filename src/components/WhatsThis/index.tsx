import type { ReactNode } from 'react'

import { HoverTips } from '../HoverTips'

export interface WhatsThisProps {
  children: ReactNode
  label?: string
}
export function WhatsThis({ children, label = 'More information' }: WhatsThisProps) {
  return (
    <HoverTips content={children}>
      <button type="button" className="cake-whatsthis" aria-label={label}>
        ?
      </button>
    </HoverTips>
  )
}
