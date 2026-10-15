import { createContext } from 'react'

import type { SlideTreeLabels } from './components/SlideTree'

export const SlideTreeLabelsContext = createContext<SlideTreeLabels>({
  expand: 'Expand child slides',
  collapse: 'Collapse child slides',
})
