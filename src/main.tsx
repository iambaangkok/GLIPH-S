import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Side-effect import: polyfills HTML5 drag-and-drop onto touch devices so the
// app's native-DnD reordering (threads, templates, favorites, posts) works on
// phones/tablets. Self-initialises a singleton at load; no-op without touch.
import 'drag-drop-touch'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
