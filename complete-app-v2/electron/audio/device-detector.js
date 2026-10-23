/**
 * FILE: electron/audio/device-detector.js
 * PURPOSE: Get a desktopCapturer SCREEN source id to use as the loopback
 * permission handle for system-audio getUserMedia calls.
 *
 * BUG FIXED HERE: the previous version called
 *   desktopCapturer.getSources({ types: ['audio'] })
 * — but Electron's desktopCapturer only ever supports 'screen' and/or
 * 'window' as types. There is no 'audio' type, and no way to enumerate
 * "audio devices" through this API at all. Passing an invalid type left
 * the returned promise hanging indefinitely on this machine/Electron
 * version (never resolving, never rejecting), which is why
 * audio-check-readiness logged "called" and then nothing else forever —
 * not a permissions issue, not a hardware issue.
 *
 * How Windows/Linux loopback actually works (Chromium behavior): you
 * request a SCREEN source (any screen — the source's video is never
 * used), then pass its id as chromeMediaSourceId in an audio-only
 * getUserMedia call. That grant is what unlocks the system audio
 * loopback track. See frontend/src/audio/systemAudioCapture.js for the
 * getUserMedia call that consumes the sourceId this file returns.
 *
 * macOS note: this screen-source-as-audio-handle trick is Windows/Linux
 * behavior. macOS system audio capture still needs BlackHole (see
 * electron/audio/mac-blackhole-check.js) or a Screen-Capture-Kit-based
 * path on macOS 13+ — this file's recommendedSource on Mac should be
 * treated as "best effort" until that's wired in.
 */

const { desktopCapturer } = require('electron');
const os = require('os');

// Guards against a repeat of the exact hang described above: if
// getSources() ever stalls again (driver issue, Electron regression,
// whatever), fail loudly after a bounded wait instead of leaving the
// renderer stuck on "Connecting..." forever.
const GET_SOURCES_TIMEOUT_MS = 8000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function detectSystemAudioDevices() {
  const platform = os.platform();
  const result = {
    platform,
    sources: [],
    hasScreenSource: false,
    recommendedSource: null,
  };

  try {
    console.log('📡 [device-detector] Requesting screen sources...');

    const sources = await withTimeout(
      desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 }, // {0,0} has caused hangs on some Electron builds
      }),
      GET_SOURCES_TIMEOUT_MS,
      'desktopCapturer.getSources'
    );

    console.log(`📡 [device-detector] Got ${sources.length} screen source(s)`);
    sources.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} (${s.id})`));

    result.sources = sources.map((s) => ({ id: s.id, name: s.name }));
    result.hasScreenSource = sources.length > 0;

    if (sources.length > 0) {
      // Any screen source works as the loopback handle — prefer one that
      // looks like the primary/full display if the name gives a hint,
      // otherwise just take the first one.
      const primary =
        sources.find((s) => /entire screen|screen 1|primary/i.test(s.name)) || sources[0];
      result.recommendedSource = primary.id;
      console.log(`✅ [device-detector] Using source: ${primary.name}`);
    } else {
      console.warn('⚠️ [device-detector] No screen sources returned.');
    }

    return result;
  } catch (err) {
    console.error('❌ [device-detector] Detection failed:', err.message);
    return {
      ...result,
      error: err.message,
    };
  }
}

async function getSystemAudioSource() {
  const devices = await detectSystemAudioDevices();
  return devices.recommendedSource;
}

module.exports = {
  detectSystemAudioDevices,
  getSystemAudioSource,
};