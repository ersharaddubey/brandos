/**
 * FILE: electron/audio/mac-blackhole-check.js
 * PURPOSE: Main-process-safe check for whether the BlackHole virtual audio
 * driver is installed. Salvaged from the old electron/audio/mac.capture.js
 * (now deleted) — this piece was fine where it was (pure Node child_process
 * shell-out, no browser APIs), unlike the getUserMedia/AudioContext code
 * that file also contained.
 *
 * Used by:
 * - electron/installer/mac-setup-wizard.js (first-run setup flow)
 * - optionally, electron/main.js's audio-check-readiness handler could call
 *   this directly instead of relying on device-detector.js's name-matching
 *   heuristic, if you want a more definitive BlackHole-installed signal.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkBlackHole() {
  try {
    const { stdout } = await execAsync('ls /Library/Audio/Plug-Ins/HAL/ | grep -i blackhole');
    return stdout.trim().length > 0;
  } catch {
    // grep exits non-zero when nothing matches — that's "not installed",
    // not an error, so we swallow it and return false.
    return false;
  }
}

module.exports = { checkBlackHole };