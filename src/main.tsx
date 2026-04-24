import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { migrateLegacyBrowserStorage } from './config/migrateLegacyStorage'
import './index.css'
import App from './App.tsx'

migrateLegacyBrowserStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
