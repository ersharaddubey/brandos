// /**
//  * FILE: electron/main.js
//  * PURPOSE: Electron main process — window management, IPC, audio source
//  * discovery only. Actual audio capture (getUserMedia/AudioContext/
//  * AudioWorklet) happens in the RENDERER — see frontend/src/audio/
//  * systemAudioCapture.js and its header comment for why.
//  *
//  * PHASE 2 CHANGES FROM PREVIOUS VERSION:
//  * - Removed the require('./audio') import and the audio-start/audio-stop/
//  *   audio-status IPC handlers. They called createAudioCapture(), which
//  *   lived in electron/audio/index.js and tried to call browser-only APIs
//  *   (navigator.mediaDevices, AudioContext, etc.) from this main/Node
//  *   process — that file has been deleted, along with windows.capture.js,
//  *   mac.capture.js, and vad.js (see PROJECT_NOTES / conversation history
//  *   for the full explanation).
//  * - Added ipcMain.handle('audio-check-readiness', ...) — the ONE piece of
//  *   audio work that legitimately belongs in main, because desktopCapturer
//  *   is main-process-only. This just finds a usable screen/audio source and
//  *   hands its id back to the renderer, which does the actual capture.
//  */

// const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
// const path = require('path');
// const fs = require('fs');
// const { autoUpdater } = require('electron-updater');
// const { detectSystemAudioDevices } = require('./audio/device-detector');
// const { storeTokens, getTokens, clearTokens, hasTokens } = require('./secure-store');

// // ── Configuration ──────────────────────────────────────────────
// const isDev = true; // FORCE DEV MODE — replace with !app.isPackaged in Phase 5
// const isMac = process.platform === 'darwin';
// const isWin = process.platform === 'win32';

// let mainWindow = null;
// let isQuitting = false;

// // ── Professional Window Management ─────────────────────────────
// class WindowManager {
//   constructor() {
//     this.window = null;
//     this.bounds = null;
//     this.isVisible = false;
//     this.isMinimized = false;
//     this.configPath = path.join(app.getPath('userData'), 'window-config.json');
//   }

//   saveConfig(data) {
//     try {
//       const dir = path.dirname(this.configPath);
//       if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
//       fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
//     } catch (err) {
//       console.warn('Failed to save config:', err.message);
//     }
//   }

//   loadConfig() {
//     try {
//       if (fs.existsSync(this.configPath)) {
//         return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
//       }
//     } catch (err) {
//       console.warn('Failed to load config:', err.message);
//     }
//     return null;
//   }

//   getDefaultBounds() {
//     const { width, height } = screen.getPrimaryDisplay().workAreaSize;
//     return {
//       x: Math.round((width - 420) / 2),
//       y: Math.round((height - 650) / 2),
//       width: 420,
//       height: 650,
//     };
//   }

//   createWindow() {
//     const savedConfig = this.loadConfig();
//     const defaultBounds = this.getDefaultBounds();
//     this.bounds = savedConfig?.bounds || defaultBounds;

//     this.window = new BrowserWindow({
//       width: this.bounds.width || 420,
//       height: this.bounds.height || 650,
//       minWidth: 360,
//       minHeight: 500,
//       x: this.bounds.x,
//       y: this.bounds.y,
//       frame: false,
//       transparent: true,
//       alwaysOnTop: true,
//       skipTaskbar: false,
//       hasShadow: true,
//       backgroundColor: '#0a0a0f',
//       show: false,
//       webPreferences: {
//         preload: path.join(__dirname, 'preload.js'),
//         contextIsolation: true,
//         nodeIntegration: false,
//         sandbox: false,
//       },
//       icon: path.join(__dirname, 'assets/icon.png'),
//     });

//     this.window.once('ready-to-show', () => {
//       this.window.show();
//       this.isVisible = true;
//       this.window.webContents.openDevTools();
//     });

//     // FORCE DEV SERVER
//     this.window.loadURL('http://localhost:5173');

//     this.window.on('close', (event) => {
//       if (!isQuitting) {
//         event.preventDefault();
//         this.hideWindow();
//       }
//     });

//     this.window.on('closed', () => {
//       this.saveBounds();
//       this.window = null;
//       this.isVisible = false;
//     });

//     this.window.on('resize', () => { this.saveBounds(); });
//     this.window.on('move', () => { this.saveBounds(); });
//     this.window.on('minimize', () => { this.isMinimized = true; });
//     this.window.on('restore', () => {
//       this.isMinimized = false;
//       this.isVisible = true;
//     });
//     this.window.on('show', () => { this.isVisible = true; });
//     this.window.on('hide', () => { this.isVisible = false; });

//     mainWindow = this.window;
//     return this.window;
//   }

//   saveBounds() {
//     if (!this.window) return;
//     const bounds = this.window.getBounds();
//     this.bounds = bounds;
//     const config = this.loadConfig() || {};
//     config.bounds = bounds;
//     this.saveConfig(config);
//   }

//   showWindow() {
//     if (!this.window) return;
//     if (this.isMinimized) {
//       this.window.restore();
//     } else {
//       this.window.show();
//       this.window.focus();
//     }
//     this.isVisible = true;
//   }

//   hideWindow() {
//     if (!this.window) return;
//     this.window.hide();
//     this.isVisible = false;
//   }

//   toggleWindow() {
//     if (this.isVisible) this.hideWindow();
//     else this.showWindow();
//   }

//   toggleAlwaysOnTop() {
//     if (!this.window) return false;
//     const isTop = this.window.isAlwaysOnTop();
//     this.window.setAlwaysOnTop(!isTop);
//     return !isTop;
//   }

//   minimizeWindow() {
//     if (!this.window) return;
//     this.window.minimize();
//     this.isMinimized = true;
//   }

//   closeWindow() {
//     if (!this.window) return;
//     isQuitting = true;
//     this.window.close();
//   }
// }

// const windowManager = new WindowManager();

// // ── App Lifecycle ──────────────────────────────────────────────
// app.whenReady().then(() => {
//   session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
//     if (permission === 'media' || permission === 'desktopCapturer') {
//       callback(true); // Allow
//     } else {
//       callback(false);
//     }
//   });
//   windowManager.createWindow();
// });

// app.on('window-all-closed', () => {
//   if (!isMac) app.quit();
// });

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     windowManager.createWindow();
//   } else {
//     windowManager.showWindow();
//   }
// });

// // ── Single Instance Lock ──────────────────────────────────────
// const gotTheLock = app.requestSingleInstanceLock();
// if (!gotTheLock) {
//   app.quit();
// } else {
//   app.on('second-instance', () => {
//     windowManager.showWindow();
//   });
// }

// // ── Global Error Handlers ──────────────────────────────────────
// process.on('uncaughtException', (error) => {
//   console.error('❌ Uncaught Exception:', error);
// });

// process.on('unhandledRejection', (reason) => {
//   console.error('❌ Unhandled Rejection:', reason);
// });

// // ── IPC Handlers ──────────────────────────────────────────────

// // ── Store tokens securely ──────────────────────────────────────
// ipcMain.handle('auth-store-tokens', async (event, accessToken, refreshToken) => {
//   try {
//     const result = storeTokens(accessToken, refreshToken);
//     return { success: result };
//   } catch (err) {
//     console.error('❌ Store tokens error:', err.message);
//     return { success: false, error: err.message };
//   }
// });

// // ── Get tokens ──────────────────────────────────────────────────
// ipcMain.handle('auth-get-tokens', async () => {
//   try {
//     const tokens = getTokens();
//     if (tokens) {
//       return { success: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
//     }
//     return { success: false };
//   } catch (err) {
//     console.error('❌ Get tokens error:', err.message);
//     return { success: false, error: err.message };
//   }
// });

// // ── Clear tokens ─────────────────────────────────────────────────
// ipcMain.handle('auth-clear-tokens', async () => {
//   try {
//     const result = clearTokens();
//     return { success: result };
//   } catch (err) {
//     console.error('❌ Clear tokens error:', err.message);
//     return { success: false, error: err.message };
//   }
// });

// // ── Check if tokens exist ──────────────────────────────────────
// ipcMain.handle('auth-has-tokens', async () => {
//   try {
//     return { success: true, hasTokens: hasTokens() };
//   } catch (err) {
//     return { success: false, hasTokens: false };
//   }
// });

// // Window controls
// ipcMain.handle('window-toggle-top', () => {
//   const isTop = windowManager.toggleAlwaysOnTop();
//   return { success: true, isTop };
// });

// ipcMain.handle('window-minimize', () => {
//   windowManager.minimizeWindow();
//   return { success: true };
// });

// ipcMain.handle('window-close', () => {
//   windowManager.closeWindow();
//   return { success: true };
// });

// // ── AUDIO SOURCE DISCOVERY (the only audio work that belongs in main) ──
// //
// // Renderer calls this once, right before it calls getUserMedia itself.
// // We just find the best desktopCapturer audio source and hand its id
// // back — see electron/audio/device-detector.js for the platform-specific
// // selection logic (loopback/stereo-mix on Windows, BlackHole/system audio
// // on Mac).
// ipcMain.handle('audio-check-readiness', async () => {
//   try {
//     console.log('🔎 [IPC] audio-check-readiness called');
//     const devices = await detectSystemAudioDevices();

//     if (devices.error) {
//       console.error('❌ [IPC] Device detection error:', devices.error);
//       return { ok: false, message: devices.error };
//     }

//     if (!devices.recommendedSource) {
//       console.warn('⚠️ [IPC] No usable audio source found on this machine');
//       return {
//         ok: false,
//         message:
//           isMac
//             ? 'No system audio source found. Install BlackHole or enable system audio capture in System Settings.'
//             : 'No system audio source found. Please check your audio drivers.',
//       };
//     }

//     const sourceMeta = devices.sources.find((s) => s.id === devices.recommendedSource);

//     console.log('✅ [IPC] Recommended source:', sourceMeta?.name || devices.recommendedSource);

//     return {
//       ok: true,
//       sourceId: devices.recommendedSource,
//       sourceName: sourceMeta?.name || 'System Audio',
//       hasScreenSource: devices.hasScreenSource,
//     };
//   } catch (err) {
//     console.error('❌ [IPC] audio-check-readiness failed:', err.message);
//     return { ok: false, message: err.message };
//   }
// });

// // Informational only — lets main track capture state for tray/UI purposes.
// // The renderer owns the actual audio pipeline and WebSocket connection.
// ipcMain.on('audio-report-started', () => {
//   console.log('🎤 [IPC] Renderer reported: audio capture started');
// });

// ipcMain.on('audio-report-stopped', () => {
//   console.log('⏹ [IPC] Renderer reported: audio capture stopped');
// });

// // ── Clipboard ──────────────────────────────────────────────────
// ipcMain.handle('copy-to-clipboard', (event, text) => {
//   if (mainWindow && !mainWindow.isDestroyed()) {
//     mainWindow.webContents.writeText(text);
//   }
//   return { success: true };
// });

// // ── Auto-Updater ──────────────────────────────────────────────
// if (!isDev) {
//   setTimeout(() => {
//     autoUpdater.checkForUpdatesAndNotify();
//   }, 5000);
// }

// module.exports = { app, windowManager };

// ###############################################################
// ###############################################################
// ###############################################################

/**
 * FILE: electron/main.js
 * PURPOSE: Electron main process — window management, IPC, audio source
 * discovery only. Actual audio capture (getUserMedia/AudioContext/
 * AudioWorklet) happens in the RENDERER — see frontend/src/audio/
 * systemAudioCapture.js and its header comment for why.
 *
 * PHASE 2 CHANGES FROM PREVIOUS VERSION:
 * - Removed the require('./audio') import and the audio-start/audio-stop/
 *   audio-status IPC handlers. They called createAudioCapture(), which
 *   lived in electron/audio/index.js and tried to call browser-only APIs
 *   (navigator.mediaDevices, AudioContext, etc.) from this main/Node
 *   process — that file has been deleted, along with windows.capture.js,
 *   mac.capture.js, and vad.js (see PROJECT_NOTES / conversation history
 *   for the full explanation).
 * - Added ipcMain.handle('audio-check-readiness', ...) — the ONE piece of
 *   audio work that legitimately belongs in main, because desktopCapturer
 *   is main-process-only. This just finds a usable screen/audio source and
 *   hands its id back to the renderer, which does the actual capture.
 *
 * PHASE 13 STEP 1 CHANGE (this revision):
 * - Added ipcMain.handle('capture-screenshot', ...) — reuses the same
 *   desktopCapturer API device-detector.js already depends on for audio
 *   readiness, but this time requests an actual thumbnail image (not just
 *   a source id) and returns it as a base64 PNG data URL, ready to send
 *   straight to POST /api/ai/screenshot's `image` field.
 */

const { app, BrowserWindow, ipcMain, screen, session, desktopCapturer, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { detectSystemAudioDevices } = require('./audio/device-detector');
const { storeTokens, getTokens, clearTokens, hasTokens } = require('./secure-store');

// ── Configuration ──────────────────────────────────────────────
// Packaged app (.app / .dmg / installer) → production; `electron .` → dev
const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

let mainWindow = null;
let isQuitting = false;

// ── Professional Window Management ─────────────────────────────
class WindowManager {
  constructor() {
    this.window = null;
    this.bounds = null;
    this.isVisible = false;
    this.isMinimized = false;
    this.stealthEnabled = true; 
    this.configPath = path.join(app.getPath('userData'), 'window-config.json');
  }

  saveConfig(data) {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn('Failed to save config:', err.message);
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (err) {
      console.warn('Failed to load config:', err.message);
    }
    return null;
  }

  getDefaultBounds() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return {
      x: Math.round((width - 420) / 2),
      y: Math.round((height - 650) / 2),
      width: 420,
      height: 650,
    };
  }

  // createWindow() {
  //   const savedConfig = this.loadConfig();
  //   const defaultBounds = this.getDefaultBounds();
  //   this.bounds = savedConfig?.bounds || defaultBounds;

  //   this.window = new BrowserWindow({
  //     width: this.bounds.width || 420,
  //     height: this.bounds.height || 650,
  //     minWidth: 360,
  //     minHeight: 500,
  //     x: this.bounds.x,
  //     y: this.bounds.y,
  //     frame: false,
  //     transparent: true,
  //     alwaysOnTop: true,
  //     skipTaskbar: false,
  //     hasShadow: true,
  //     backgroundColor: '#0a0a0f',
  //     show: false,
  //     webPreferences: {
  //       preload: path.join(__dirname, 'preload.js'),
  //       contextIsolation: true,
  //       nodeIntegration: false,
  //       sandbox: false,
  //     },
  //     icon: path.join(__dirname, 'assets/icon.png'),
  //   });

  //   this.window.once('ready-to-show', () => {
  //     this.window.show();
  //     this.isVisible = true;
  //     this.window.webContents.openDevTools();
  //   });

  //   // FORCE DEV SERVER
  //   this.window.loadURL('http://localhost:5173');

  //   this.window.on('close', (event) => {
  //     if (!isQuitting) {
  //       event.preventDefault();
  //       this.hideWindow();
  //     }
  //   });

  //   this.window.on('closed', () => {
  //     this.saveBounds();
  //     this.window = null;
  //     this.isVisible = false;
  //   });

  //   this.window.on('resize', () => { this.saveBounds(); });
  //   this.window.on('move', () => { this.saveBounds(); });
  //   this.window.on('minimize', () => { this.isMinimized = true; });
  //   this.window.on('restore', () => {
  //     this.isMinimized = false;
  //     this.isVisible = true;
  //   });
  //   this.window.on('show', () => { this.isVisible = true; });
  //   this.window.on('hide', () => { this.isVisible = false; });

  //   mainWindow = this.window;
  //   return this.window;
  // }
  createWindow() {
    const savedConfig = this.loadConfig();
    const defaultBounds = this.getDefaultBounds();
    this.bounds = savedConfig?.bounds || defaultBounds;
    // Fresh install => no saved config => stays default true (from constructor).
    // Existing install => whatever the user last set, restored here.
    this.stealthEnabled = savedConfig?.stealthEnabled ?? true;

    this.window = new BrowserWindow({
      width: this.bounds.width || 420,
      height: this.bounds.height || 650,
      minWidth: 360,
      minHeight: 500,
      x: this.bounds.x,
      y: this.bounds.y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: false,
      hasShadow: true,
      backgroundColor: '#0a0a0f',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        // Packaged app loads file:// UI but calls http://localhost:3000 —
        // without this, Chromium can block those fetches ("Failed to fetch").
        webSecurity: false,
      },
      icon: path.join(__dirname, 'assets/icon.png'),
    });

    // Apply stealth as soon as the window exists — before it's ever shown,
    // so it's protected from the very first frame, not just after some
    // later toggle call.
    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setContentProtection(this.stealthEnabled);

    this.window.once('ready-to-show', () => {
      this.window.show();
      this.isVisible = true;
      if (isDev) {
        this.window.webContents.openDevTools();
      }
    });

    // Dev: Vite server. Packaged: built frontend next to main.js.
    if (isDev) {
      this.window.loadURL('http://localhost:5173');
    } else {
      const candidates = [
        path.join(__dirname, 'renderer', 'index.html'),
        path.join(__dirname, 'dist', 'index.html'),
        path.join(process.resourcesPath, 'renderer', 'index.html'),
      ];
      const indexHtml = candidates.find((p) => {
        try {
          return fs.existsSync(p);
        } catch {
          return false;
        }
      });

      if (indexHtml) {
        console.log('✅ Loading packaged UI:', indexHtml);
        this.window.loadFile(indexHtml);
        this.window.webContents.on('did-fail-load', (_e, code, desc, url) => {
          console.error('❌ did-fail-load', code, desc, url);
        });
      } else {
        console.error('❌ Packaged UI not found. Tried:', candidates);
        this.window.loadURL(
          'data:text/html;charset=utf-8,' +
            encodeURIComponent(
              '<html><body style="font-family:system-ui;background:#0a0a0f;color:#fff;padding:40px">' +
                '<h1>UI not packaged</h1>' +
                '<p>Build frontend and copy <code>src/dist/*</code> into <code>electron/renderer/</code>, then rebuild the Mac app.</p>' +
                '<pre style="opacity:.7;font-size:12px">' +
                candidates.join('\n') +
                '</pre></body></html>'
            )
        );
      }
    }

    this.window.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        this.hideWindow();
      }
    });

    this.window.on('closed', () => {
      this.saveBounds();
      this.window = null;
      this.isVisible = false;
    });

    this.window.on('resize', () => { this.saveBounds(); });
    this.window.on('move', () => { this.saveBounds(); });
    this.window.on('minimize', () => { this.isMinimized = true; });
    this.window.on('restore', () => {
      this.isMinimized = false;
      this.isVisible = true;
    });
    this.window.on('show', () => { this.isVisible = true; });
    this.window.on('hide', () => { this.isVisible = false; });

    mainWindow = this.window;
    return this.window;
  }

  saveBounds() {
    if (!this.window) return;
    const bounds = this.window.getBounds();
    this.bounds = bounds;
    const config = this.loadConfig() || {};
    config.bounds = bounds;
    this.saveConfig(config);
  }

  showWindow() {
    if (!this.window) return;
    if (this.isMinimized) {
      this.window.restore();
    } else {
      this.window.show();
      this.window.focus();
    }
    this.isVisible = true;
  }

  hideWindow() {
    if (!this.window) return;
    this.window.hide();
    this.isVisible = false;
  }

  toggleWindow() {
    if (this.isVisible) this.hideWindow();
    else this.showWindow();
  }

  toggleAlwaysOnTop() {
    if (!this.window) return false;
    const isTop = this.window.isAlwaysOnTop();
    this.window.setAlwaysOnTop(!isTop);
    return !isTop;
  }

  minimizeWindow() {
    if (!this.window) return;
    this.window.minimize();
    this.isMinimized = true;
  }

  closeWindow() {
    if (!this.window) return;
    isQuitting = true;
    this.window.close();
  }

  // ── Maximize / Restore toggle ─────────────────────────────────
  toggleMaximize() {
    if (!this.window) return false;
    if (this.window.isMaximized()) {
      this.window.unmaximize();
    } else {
      this.window.maximize();
    }
    return this.window.isMaximized();
  }

  // ── Stealth mode (content protection) ───────────────────────────
  setStealthMode(enabled) {
    if (!this.window) return false;
    this.window.setContentProtection(enabled);
    this.stealthEnabled = enabled;

    // Persist alongside bounds, same pattern as saveBounds() above —
    // so it survives app restarts, not just page reloads.
    const config = this.loadConfig() || {};
    config.stealthEnabled = enabled;
    this.saveConfig(config);

    return enabled;
  }

  // Lets the renderer sync its UI state after every mount/reload —
  // needed because window.location.reload() on login/logout remounts
  // TitleBar, resetting its local React state, while the actual
  // Electron window (and this class) never restart.
  getStealthMode() {
    return this.stealthEnabled;
  }

  // ── Snap-to-edge (Ctrl+Arrow) ────────────────────────────────────
  // snapWindow(direction) {
  //   if (!this.window) return;
  //   const { workArea } = screen.getPrimaryDisplay();

  //   const half = { width: Math.round(workArea.width / 2), height: workArea.height };

  //   switch (direction) {
  //     case 'left':
  //       this.window.setBounds({ x: workArea.x, y: workArea.y, ...half });
  //       break;
  //     case 'right':
  //       this.window.setBounds({ x: workArea.x + half.width, y: workArea.y, ...half });
  //       break;
  //     case 'up':
  //       this.window.maximize();
  //       break;
  //     case 'down':
  //       this.window.unmaximize();
  //       break;
  //   }
  // }
    // ── Incremental move (Ctrl+Arrow) ────────────────────────────────
  moveWindow(direction) {
    if (!this.window) return;
    const STEP = 20; // pixels per key-press — adjust if too fast/slow
    const bounds = this.window.getBounds();

    switch (direction) {
      case 'left':
        this.window.setBounds({ ...bounds, x: bounds.x - STEP });
        break;
      case 'right':
        this.window.setBounds({ ...bounds, x: bounds.x + STEP });
        break;
      case 'up':
        this.window.setBounds({ ...bounds, y: bounds.y - STEP });
        break;
      case 'down':
        this.window.setBounds({ ...bounds, y: bounds.y + STEP });
        break;
    }
  }

  // ── Opacity control ────────────────────────────────────────────
  setOpacity(value) {
    if (!this.window) return false;
    const clamped = Math.min(1, Math.max(0.3, value)); // 30%–100% floor, so it never goes fully invisible to the user themself
    this.window.setOpacity(clamped);
    return clamped;
  }
}

const windowManager = new WindowManager();

// ── App Lifecycle ──────────────────────────────────────────────
app.whenReady().then(() => {
  // Always allow media / display-capture so system-audio loopback
  // (getUserMedia with chromeMediaSource:'desktop') and mic work after
  // the user grants OS-level access. Without PermissionCheckHandler,
  // Chromium can still deny the request even when the OS prompt was OK.
  const ALLOWED_PERMISSIONS = new Set([
    'media',
    'display-capture',
    'desktopCapturer',
    'mediaKeySystem',
  ]);

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ALLOWED_PERMISSIONS.has(permission);
    console.log(`[permission] request: ${permission} → ${allowed ? 'ALLOW' : 'DENY'}`);
    callback(allowed);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ALLOWED_PERMISSIONS.has(permission);
    return allowed;
  });

  // Electron 28+: when the renderer uses getDisplayMedia (or some
  // chromeMediaSource paths), this handler supplies the screen source +
  // system-audio loopback without a second OS prompt.
  if (typeof session.defaultSession.setDisplayMediaRequestHandler === 'function') {
    session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1, height: 1 },
        });
        if (sources.length === 0) {
          console.warn('[display-media] No screen sources available');
          callback({});
          return;
        }
        const primary =
          sources.find((s) => /entire screen|screen 1|primary/i.test(s.name)) || sources[0];
        console.log(`[display-media] Granting source: ${primary.name}`);
        // audio: 'loopback' enables system audio on Windows/Linux.
        callback({ video: primary, audio: 'loopback' });
      } catch (err) {
        console.error('[display-media] Handler failed:', err.message);
        callback({});
      }
    });
  }

  windowManager.createWindow();

  // ── Ctrl+Arrow snap-to-edge shortcuts ─────────────────────────
  globalShortcut.register('Control+Left', () => windowManager.moveWindow('left'));
  globalShortcut.register('Control+Right', () => windowManager.moveWindow('right'));
  globalShortcut.register('Control+Up', () => windowManager.moveWindow('up'));
  globalShortcut.register('Control+Down', () => windowManager.moveWindow('down'));
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createWindow();
  } else {
    windowManager.showWindow();
  }
});

// ── Single Instance Lock ──────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    windowManager.showWindow();
  });
}

// ── Global Error Handlers ──────────────────────────────────────
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// ── IPC Handlers ──────────────────────────────────────────────

// ── Store tokens securely ──────────────────────────────────────
ipcMain.handle('auth-store-tokens', async (event, accessToken, refreshToken) => {
  try {
    const result = storeTokens(accessToken, refreshToken);
    return { success: result };
  } catch (err) {
    console.error('❌ Store tokens error:', err.message);
    return { success: false, error: err.message };
  }
});

// ── Get tokens ──────────────────────────────────────────────────
ipcMain.handle('auth-get-tokens', async () => {
  try {
    const tokens = getTokens();
    if (tokens) {
      return { success: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }
    return { success: false };
  } catch (err) {
    console.error('❌ Get tokens error:', err.message);
    return { success: false, error: err.message };
  }
});

// ── Clear tokens ─────────────────────────────────────────────────
ipcMain.handle('auth-clear-tokens', async () => {
  try {
    const result = clearTokens();
    return { success: result };
  } catch (err) {
    console.error('❌ Clear tokens error:', err.message);
    return { success: false, error: err.message };
  }
});

// ── Check if tokens exist ──────────────────────────────────────
ipcMain.handle('auth-has-tokens', async () => {
  try {
    return { success: true, hasTokens: hasTokens() };
  } catch (err) {
    return { success: false, hasTokens: false };
  }
});

// Window controls
ipcMain.handle('window-toggle-top', () => {
  const isTop = windowManager.toggleAlwaysOnTop();
  return { success: true, isTop };
});

ipcMain.handle('window-minimize', () => {
  windowManager.minimizeWindow();
  return { success: true };
});

ipcMain.handle('window-close', () => {
  windowManager.closeWindow();
  return { success: true };
});

ipcMain.handle('window-maximize', () => {
  const isMaximized = windowManager.toggleMaximize();
  return { success: true, isMaximized };
});

ipcMain.handle('window-set-stealth', (event, enabled) => {
  const result = windowManager.setStealthMode(!!enabled);
  return { success: true, stealthEnabled: result };
});

ipcMain.handle('window-get-stealth', () => {
  return { success: true, stealthEnabled: windowManager.getStealthMode() };
});

ipcMain.handle('window-set-opacity', (event, value) => {
  const result = windowManager.setOpacity(value);
  return { success: true, opacity: result };
});

// ── AUDIO SOURCE DISCOVERY (the only audio work that belongs in main) ──
//
// Renderer calls this once, right before it calls getUserMedia itself.
// We just find the best desktopCapturer audio source and hand its id
// back — see electron/audio/device-detector.js for the platform-specific
// selection logic (loopback/stereo-mix on Windows, BlackHole/system audio
// on Mac).
ipcMain.handle('audio-check-readiness', async () => {
  try {
    console.log('🔎 [IPC] audio-check-readiness called');
    const devices = await detectSystemAudioDevices();

    if (devices.error) {
      console.error('❌ [IPC] Device detection error:', devices.error);
      return { ok: false, message: devices.error };
    }

    if (!devices.recommendedSource) {
      console.warn('⚠️ [IPC] No usable audio source found on this machine');
      return {
        ok: false,
        message:
          isMac
            ? 'No system audio source found. Install BlackHole or enable system audio capture in System Settings.'
            : 'No system audio source found. Please check your audio drivers.',
      };
    }

    const sourceMeta = devices.sources.find((s) => s.id === devices.recommendedSource);

    console.log('✅ [IPC] Recommended source:', sourceMeta?.name || devices.recommendedSource);

    return {
      ok: true,
      sourceId: devices.recommendedSource,
      sourceName: sourceMeta?.name || 'System Audio',
      hasScreenSource: devices.hasScreenSource,
    };
  } catch (err) {
    console.error('❌ [IPC] audio-check-readiness failed:', err.message);
    return { ok: false, message: err.message };
  }
});

// Informational only — lets main track capture state for tray/UI purposes.
// The renderer owns the actual audio pipeline and WebSocket connection.
ipcMain.on('audio-report-started', () => {
  console.log('🎤 [IPC] Renderer reported: audio capture started');
});

ipcMain.on('audio-report-stopped', () => {
  console.log('⏹ [IPC] Renderer reported: audio capture stopped');
});

// ── SCREENSHOT CAPTURE (Phase 13, Step 1) ───────────────────────
//
// Reuses desktopCapturer, same as audio-check-readiness above, but this
// time requests an actual thumbnail image instead of just a source id.
// Returns a base64 PNG data URL — ready to send straight to
// POST /api/ai/screenshot's `image` field with no conversion needed on
// the renderer side.
//
// thumbnailSize caps the captured resolution — 1920x1080 is generous
// enough for a vision model to read UI text clearly, without sending an
// enormous multi-megabyte payload for a 4K/5K display.
ipcMain.handle('capture-screenshot', async () => {
  try {
    console.log('📸 [IPC] capture-screenshot called');

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (!sources || sources.length === 0) {
      console.warn('⚠️ [IPC] No screen sources available for screenshot');
      return { ok: false, message: 'No screen available to capture' };
    }

    // Same "any screen source works" selection as device-detector.js —
    // prefer one that looks like the primary/full display if the name
    // gives a hint, otherwise take the first one.
    const primary =
      sources.find((s) => /entire screen|screen 1|primary/i.test(s.name)) || sources[0];

    if (primary.thumbnail.isEmpty()) {
      console.warn('⚠️ [IPC] Captured thumbnail is empty');
      return { ok: false, message: 'Screenshot capture returned an empty image' };
    }

    const dataUrl = primary.thumbnail.toDataURL(); // "data:image/png;base64,..."

    console.log(`✅ [IPC] Screenshot captured from "${primary.name}" (${dataUrl.length} chars)`);

    return { ok: true, image: dataUrl, sourceName: primary.name };
  } catch (err) {
    console.error('❌ [IPC] capture-screenshot failed:', err.message);
    return { ok: false, message: err.message };
  }
});

// ── Clipboard ──────────────────────────────────────────────────
ipcMain.handle('copy-to-clipboard', (event, text) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.writeText(text);
  }
  return { success: true };
});

// ── Auto-Updater ──────────────────────────────────────────────
if (!isDev) {
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);
}

module.exports = { app, windowManager };