// /**
//  * FILE: electron/preload.js
//  * PURPOSE: Secure IPC bridge between Electron main and the renderer.
//  *
//  * PHASE 2 CHANGES FROM PREVIOUS VERSION:
//  * - Removed: getAudioSources, startAudioCapture, stopAudioCapture,
//  *   getAudioStatus, onAudioData, onAudioError, onVADStatus, onAudioLevel.
//  *   These all pointed at the main-process audio-start/audio-stop/
//  *   audio-status IPC handlers, which called the now-deleted
//  *   electron/audio/index.js (it tried to run browser APIs in Node — see
//  *   main.js header comment). Audio capture now happens entirely in the
//  *   renderer via frontend/src/audio/systemAudioCapture.js.
//  * - Added: audioCheckReadiness, audioReportStarted, audioReportStopped —
//  *   the new, correct bridge those renderer files actually call.
//  */

// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {
//   // Window controls
//   closeWindow: () => ipcRenderer.send('window-close'),
//   minimizeWindow: () => ipcRenderer.send('window-minimize'),
//   toggleAlwaysOnTop: () => ipcRenderer.invoke('window-toggle-top'),
//   dragWindow: (x, y) => ipcRenderer.send('window-drag', x, y),
//   resizeWindow: (height) => ipcRenderer.send('window-resize', height),

//   // Audio — source discovery only. The renderer's SystemAudioCapture class
//   // calls audioCheckReadiness() once per start(), then does getUserMedia/
//   // AudioContext/WebSocket work entirely on its own.
//   audioCheckReadiness: () => ipcRenderer.invoke('audio-check-readiness'),
//   audioReportStarted: () => ipcRenderer.send('audio-report-started'),
//   audioReportStopped: () => ipcRenderer.send('audio-report-stopped'),

//   // Clipboard
//   copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),

//   // Update events
//   onUpdateAvailable: (callback) => {
//     ipcRenderer.on('update-available', (event, info) => callback(info));
//   },
//   onUpdateReady: (callback) => {
//     ipcRenderer.on('update-ready', (event, info) => callback(info));
//   },

//   // Cleanup
//   removeAllListeners: (channel) => {
//     ipcRenderer.removeAllListeners(channel);
//   },
// });
// ##############################################################################

// // ── Add to existing electronAPI ────────────────────────────────
// /**
//  * FILE: electron/preload.js
//  * PURPOSE: Secure IPC bridge between Electron main and the renderer.
//  *
//  * PHASE 5: Added authStoreTokens, authGetTokens, authClearTokens, authHasTokens
//  * for secure token storage via Electron's safeStorage.
//  */

// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {
//   // ── Window Controls ──────────────────────────────────────────
//   closeWindow: () => ipcRenderer.send('window-close'),
//   minimizeWindow: () => ipcRenderer.send('window-minimize'),
//   toggleAlwaysOnTop: () => ipcRenderer.invoke('window-toggle-top'),
//   dragWindow: (x, y) => ipcRenderer.send('window-drag', x, y),
//   resizeWindow: (height) => ipcRenderer.send('window-resize', height),

//   // ── Auth ─────────────────────────────────────────────────────
//   authStoreTokens: (accessToken, refreshToken) => {
//     return ipcRenderer.invoke('auth-store-tokens', accessToken, refreshToken);
//   },
//   authGetTokens: () => {
//     return ipcRenderer.invoke('auth-get-tokens');
//   },
//   authClearTokens: () => {
//     return ipcRenderer.invoke('auth-clear-tokens');
//   },
//   authHasTokens: () => {
//     return ipcRenderer.invoke('auth-has-tokens');
//   },

//   // ── Audio Source Discovery ──────────────────────────────────
//   audioCheckReadiness: () => ipcRenderer.invoke('audio-check-readiness'),
//   audioReportStarted: () => ipcRenderer.send('audio-report-started'),
//   audioReportStopped: () => ipcRenderer.send('audio-report-stopped'),

//   // ── Audio Events (from renderer capture) ─────────────────────
//   onAudioData: (callback) => {
//     ipcRenderer.on('audio-data', (event, data) => callback(data));
//   },
//   onAudioError: (callback) => {
//     ipcRenderer.on('audio-error', (event, error) => callback(error));
//   },
//   onVADStatus: (callback) => {
//     ipcRenderer.on('vad-status', (event, status) => callback(status));
//   },
//   onAudioLevel: (callback) => {
//     ipcRenderer.on('audio-level', (event, level) => callback(level));
//   },

//   // ── Clipboard ────────────────────────────────────────────────
//   copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),

//   // ── Update Events ────────────────────────────────────────────
//   onUpdateAvailable: (callback) => {
//     ipcRenderer.on('update-available', (event, info) => callback(info));
//   },
//   onUpdateReady: (callback) => {
//     ipcRenderer.on('update-ready', (event, info) => callback(info));
//   },

//   // ── Remove Listeners ─────────────────────────────────────────
//   removeAllListeners: (channel) => {
//     ipcRenderer.removeAllListeners(channel);
//   },
// });

// ##############################################################################
// ##############################################################################
// ##############################################################################

/**
 * FILE: electron/preload.js
 * PURPOSE: Secure IPC bridge between Electron main and the renderer.
 *
 * PHASE 5: Added authStoreTokens, authGetTokens, authClearTokens, authHasTokens
 * for secure token storage via Electron's safeStorage.
 *
 * PHASE 13 STEP 1: Added captureScreenshot(), bridging to main.js's new
 * 'capture-screenshot' IPC handler.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Window Controls ──────────────────────────────────────────
  closeWindow: () => ipcRenderer.invoke('window-close'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  setStealthMode: (enabled) => ipcRenderer.invoke('window-set-stealth', enabled),
  getStealthMode: () => ipcRenderer.invoke('window-get-stealth'),   
  setOpacity: (value) => ipcRenderer.invoke('window-set-opacity', value),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window-toggle-top'),
  dragWindow: (x, y) => ipcRenderer.send('window-drag', x, y),
  resizeWindow: (height) => ipcRenderer.send('window-resize', height),

  // ── Auth ─────────────────────────────────────────────────────
  authStoreTokens: (accessToken, refreshToken) => {
    return ipcRenderer.invoke('auth-store-tokens', accessToken, refreshToken);
  },
  authGetTokens: () => {
    return ipcRenderer.invoke('auth-get-tokens');
  },
  authClearTokens: () => {
    return ipcRenderer.invoke('auth-clear-tokens');
  },
  authHasTokens: () => {
    return ipcRenderer.invoke('auth-has-tokens');
  },

  // ── Audio Source Discovery ──────────────────────────────────
  audioCheckReadiness: () => ipcRenderer.invoke('audio-check-readiness'),
  audioReportStarted: () => ipcRenderer.send('audio-report-started'),
  audioReportStopped: () => ipcRenderer.send('audio-report-stopped'),

  // ── Audio Events (from renderer capture) ─────────────────────
  onAudioData: (callback) => {
    ipcRenderer.on('audio-data', (event, data) => callback(data));
  },
  onAudioError: (callback) => {
    ipcRenderer.on('audio-error', (event, error) => callback(error));
  },
  onVADStatus: (callback) => {
    ipcRenderer.on('vad-status', (event, status) => callback(status));
  },
  onAudioLevel: (callback) => {
    ipcRenderer.on('audio-level', (event, level) => callback(level));
  },

  // ── Screenshot Capture ───────────────────────────────────────
  // Returns { ok: true, image: "data:image/png;base64,...", sourceName }
  // or { ok: false, message } on failure. Pass `image` straight to
  // POST /api/ai/screenshot's `image` field, no conversion needed.
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),

  // ── Clipboard ────────────────────────────────────────────────
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),

  // ── Update Events ────────────────────────────────────────────
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onUpdateReady: (callback) => {
    ipcRenderer.on('update-ready', (event, info) => callback(info));
  },

  // ── Remove Listeners ─────────────────────────────────────────
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});