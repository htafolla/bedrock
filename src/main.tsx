import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initAnalytics } from './lib/analytics'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element #root not found')
}

initAnalytics()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
