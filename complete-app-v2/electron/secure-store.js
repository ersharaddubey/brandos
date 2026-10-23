/**
 * FILE: electron/secure-store.js
 * PURPOSE: Secure token storage using Electron's safeStorage (OS keychain),
 * persisted to disk under the app's userData directory.
 *
 * FIX FROM PREVIOUS REVISION: tokens were stored in `global[STORE_KEY]` —
 * an in-memory variable in the main process. That's not persistence at
 * all: it's gone the instant the app restarts or crashes, which defeats
 * the entire purpose of "remember me" / auto-login, and also means the
 * safeStorage encryption was pointless (nothing durable was ever being
 * protected). This revision writes the encrypted bytes to a real file via
 * fs, and reads them back on subsequent launches.
 */

const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const STORE_FILENAME = 'auth-tokens.enc';
const PLAINTEXT_MARKER = 'PLAINTEXT_FALLBACK_V1:';

function log(message, data) {
  console.log(`[secure-store] ${message}`, data ?? '');
}

function getStorePath() {
  // app.getPath('userData') is only valid after the app is ready — every
  // caller here is an ipcMain handler, which only runs after app.whenReady(),
  // so this is always safe in practice.
  return path.join(app.getPath('userData'), STORE_FILENAME);
}

// ── Store tokens ────────────────────────────────────────────────
function storeTokens(accessToken, refreshToken) {
  try {
    const data = JSON.stringify({
      accessToken,
      refreshToken,
      storedAt: Date.now(),
    });
    const filePath = getStorePath();

    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(data);
      // mode 0o600: owner read/write only. No-op on Windows (NTFS ACLs
      // aren't controlled by POSIX mode bits) but correct and harmless
      // there, and meaningful on macOS/Linux.
      fs.writeFileSync(filePath, encrypted, { mode: 0o600 });
      log('✅ Tokens encrypted and persisted to disk');
    } else {
      // No OS-level encryption backend available (rare — e.g. some Linux
      // setups without a keyring). Still persist to disk so auto-login
      // works, but mark the file clearly so getTokens() never tries to
      // run it through safeStorage.decryptString and never silently
      // treats it as encrypted.
      console.warn(
        '[secure-store] ⚠️ OS-level encryption unavailable — tokens are being ' +
          'persisted to disk WITHOUT encryption. This should not happen on a ' +
          'normal desktop session; investigate before shipping to users on ' +
          'this platform/config.'
      );
      fs.writeFileSync(filePath, PLAINTEXT_MARKER + data, { mode: 0o600 });
    }
    return true;
  } catch (err) {
    console.error('[secure-store] ❌ Failed to store tokens:', err.message);
    return false;
  }
}

// ── Get tokens ──────────────────────────────────────────────────
function getTokens() {
  try {
    const filePath = getStorePath();
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath);
    const rawStart = raw.subarray(0, PLAINTEXT_MARKER.length).toString('utf8');

    if (rawStart === PLAINTEXT_MARKER) {
      const json = raw.subarray(PLAINTEXT_MARKER.length).toString('utf8');
      return JSON.parse(json);
    }

    if (!safeStorage.isEncryptionAvailable()) {
      console.error(
        '[secure-store] ❌ Stored tokens are encrypted but OS-level decryption ' +
          'is unavailable in this session — cannot read them. User will need ' +
          'to log in again.'
      );
      return null;
    }

    const decrypted = safeStorage.decryptString(raw);
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('[secure-store] ❌ Failed to get tokens:', err.message);
    return null;
  }
}

// ── Clear tokens ─────────────────────────────────────────────────
function clearTokens() {
  try {
    const filePath = getStorePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    log('✅ Tokens cleared');
    return true;
  } catch (err) {
    console.error('[secure-store] ❌ Failed to clear tokens:', err.message);
    return false;
  }
}

// ── Check if tokens exist ──────────────────────────────────────
function hasTokens() {
  try {
    return fs.existsSync(getStorePath());
  } catch {
    return false;
  }
}

module.exports = {
  storeTokens,
  getTokens,
  clearTokens,
  hasTokens,
};