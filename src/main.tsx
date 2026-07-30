import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ensureSeeded } from './db'

registerSW({ immediate: true })

function Root() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void ensureSeeded().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: '#5a6b62',
        }}
      >
        Chargement de TrackFit…
      </div>
    )
  }

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
