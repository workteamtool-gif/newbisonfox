import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@renderer/App'
import '@fontsource/rubik'
import '@renderer/styles/reset.css'
import '@renderer/styles/global.css'
import '@renderer/styles/tokens.css'
import '@renderer/styles/glassCard.css'
import '@renderer/styles/buttons.css'
import '@renderer/styles/forms.css'
import '@renderer/styles/checkbox.css'
import '@renderer/styles/progress.css'
import '@renderer/styles/drive.css'
import '@renderer/styles/info.css'
import '@renderer/styles/stats.css'
import '@renderer/styles/animation.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
