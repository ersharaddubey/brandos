// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

// #########################################################

/**
 * FILE: frontend/src/main.jsx
 *
 * FIX: StrictMode removed. In dev, StrictMode intentionally mounts every
 * component twice (mount -> run effect cleanup as if unmounted -> mount
 * again) to catch impure effects. That's fine for effects with no real
 * side effects, but useSystemAudio's effect opens a WebSocket + getUserMedia
 * stream + AudioContext — genuine singleton hardware/network resources.
 * StrictMode's synthetic first-mount teardown was calling capture.stop()
 * mid-connect, before the WebSocket ever reached the server, which is why
 * you saw "audio-check-readiness called" immediately followed by
 * "audio capture stopped" with no connection ever logged server-side.
 *
 * This only manifested in dev — a packaged production build never double-
 * invokes effects — but it blocked all local testing until removed.
 */

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <App />,
)