/**
 * FILE: electron/updater.js
 * PURPOSE: Auto-updater configuration for Electron
 */

const { autoUpdater } = require('electron-updater');
const { BrowserWindow } = require('electron');

let mainWindow = null;

function setupAutoUpdater(window) {
  mainWindow = window;

  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Checking for updates...');
    mainWindow.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('📦 Update available:', info.version);
    mainWindow.webContents.send('update-status', {
      status: 'available',
      version: info.version,
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('✅ No updates available');
    mainWindow.webContents.send('update-status', { status: 'up-to-date' });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Update downloaded:', info.version);
    mainWindow.webContents.send('update-status', {
      status: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('⚠️ Update error:', err.message);
    mainWindow.webContents.send('update-status', {
      status: 'error',
      error: err.message,
    });
  });

  // Check for updates (with delay)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);
}

function checkForUpdates() {
  if (autoUpdater) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

module.exports = { setupAutoUpdater, checkForUpdates };