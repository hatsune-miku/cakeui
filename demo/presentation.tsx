import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { PresentationDemo } from './App/components/PresentationDemo'

import './presentation.scss'

const query = new URLSearchParams(location.search)
const theme = query.get('theme') === 'pink' ? 'pink' : query.get('theme') === 'gold' ? 'gold' : 'blue'
const mode = query.get('mode') === 'dark' ? 'dark' : query.get('mode') === 'system' ? 'system' : 'light'
document.body.dataset.mode = mode

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PresentationDemo standalone theme={theme} mode={mode} />
  </StrictMode>
)
