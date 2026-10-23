/**
 * FILE: electron/installer/mac-setup-wizard.js
 * PURPOSE: First-run Mac setup wizard for BlackHole installation
 */

const { BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

let wizardWindow = null;

async function showMacSetupWizard(parentWindow) {
  return new Promise((resolve) => {
    if (wizardWindow) {
      wizardWindow.focus();
      resolve(wizardWindow);
      return;
    }

    wizardWindow = new BrowserWindow({
      width: 500,
      height: 400,
      parent: parentWindow,
      modal: true,
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
      },
    });

    wizardWindow.loadFile(path.join(__dirname, '../assets/mac-setup.html'));

    wizardWindow.webContents.on('did-finish-load', () => {
      wizardWindow.webContents.send('setup-data', {
        blackHoleInstalled: false,
        steps: [
          'Download BlackHole from https://github.com/ExistentialAudio/BlackHole',
          'Install BlackHole (double-click and follow instructions)',
          'Restart this app',
        ],
      });
    });

    wizardWindow.on('closed', () => {
      wizardWindow = null;
    });

    resolve(wizardWindow);
  });
}

async function checkBlackHole() {
  try {
    const { stdout } = await execAsync('ls /Library/Audio/Plug-Ins/HAL/ | grep -i blackhole');
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function openBlackHoleDownload() {
  const { shell } = require('electron');
  await shell.openExternal('https://github.com/ExistentialAudio/BlackHole/releases');
}

module.exports = {
  showMacSetupWizard,
  checkBlackHole,
  openBlackHoleDownload,
};