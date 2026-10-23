/**
 * FILE: src/renderer/audio/useSystemAudio.js
 * PURPOSE: React hook wrapping SystemAudioCapture for your UI.
 *
 * Usage:
 *   const { state, level, isSpeaking, error, start, stop } = useSystemAudio({
 *     websocketUrl: 'wss://your-backend/audio-stream',
 *   });
 *
 *   <button onClick={start} disabled={state === 'capturing'}>Start</button>
 *   {state === 'detecting' && <p>Detecting devices...</p>}
 *   {state === 'error' && <p>Error: {error}</p>}
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { SystemAudioCapture, AUDIO_STATES } from './systemAudioCapture';

export function useSystemAudio({ websocketUrl, sampleRate, chunkSize, vadThreshold } = {}) {
  const captureRef = useRef(null);
  const [state, setState] = useState(AUDIO_STATES.IDLE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  useEffect(() => {
    captureRef.current = new SystemAudioCapture({
      websocketUrl,
      sampleRate,
      chunkSize,
      vadThreshold,
      onStateChange: (s, extra) => {
        setState(s);
        if (s === AUDIO_STATES.ERROR) setError(extra?.message ?? 'Unknown error');
        if (s === AUDIO_STATES.CAPTURING) {
          setError(null);
          setSource(extra?.source ?? null);
        }
      },
      onVAD: ({ speaking }) => setIsSpeaking(speaking),
      onLevel: (lvl) => setLevel(lvl),
      onError: (err) => setError(err.message),
    });

    return () => {
      captureRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websocketUrl]);

  const start = useCallback(async () => {
    try {
      await captureRef.current?.start();
    } catch {
      // error already surfaced via onError/onStateChange
    }
  }, []);

  const stop = useCallback(async () => {
    await captureRef.current?.stop();
  }, []);

  return { state, isSpeaking, level, error, source, start, stop };
}