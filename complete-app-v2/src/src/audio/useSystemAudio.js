// /**
//  * FILE (target path): frontend/src/audio/useSystemAudio.js
//  * PURPOSE: React hook wrapping SystemAudioCapture — this is what App.jsx
//  * (or whatever component currently shows "Detecting devices...") should
//  * call instead of the old window.electronAPI.startAudioCapture flow.
//  *
//  * USAGE (see App.jsx wiring notes below):
//  *   const {
//  *     state, error, transcript, finalTranscript, answer, isSpeaking,
//  *     audioLevel, queuedPosition, start, stop, requestAnswer,
//  *   } = useSystemAudio({ websocketUrl: 'ws://localhost:3000/stream', mode: 'default' });
//  */

// import { useCallback, useEffect, useRef, useState } from 'react';
// import { SystemAudioCapture, AUDIO_STATES } from './systemAudioCapture';

// export function useSystemAudio({
//   websocketUrl,
//   getAccessToken,          // () => string | Promise<string> — read fresh per connect,
//                             // NOT a dependency of the instantiation effect below. This
//                             // is what stops a token refresh from tearing down an
//                             // active capture session (getUserMedia/AudioContext/WS all
//                             // used to get destroyed and rebuilt on every refresh when
//                             // the token was baked into websocketUrl instead).
//   mode = 'default',
//   vadThreshold = 0.01,
// } = {}) {
//   const [state, setState] = useState(AUDIO_STATES.IDLE);
//   const [error, setError] = useState(null);
//   const [interimTranscript, setInterimTranscript] = useState('');
//   const [finalTranscript, setFinalTranscript] = useState('');
//   const [conversation, setConversation] = useState([]); // [{id, question, answer, timestamp}]
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [audioLevel, setAudioLevel] = useState(0);
//   const [queuedPosition, setQueuedPosition] = useState(null);

//   const captureRef = useRef(null);

//   // Always call the LATEST getAccessToken, without making it an effect
//   // dependency — this ref is what lets SystemAudioCapture ask for a fresh
//   // token on every connect/reconnect without ever forcing the instance
//   // below to be torn down and rebuilt.
//   const getAccessTokenRef = useRef(getAccessToken);
//   getAccessTokenRef.current = getAccessToken;

//   // Instantiate once per (websocketUrl, mode) pair, not on every render,
//   // and NOT on every token refresh.
//   useEffect(() => {
//     const capture = new SystemAudioCapture({
//       websocketUrl,
//       getToken: () => getAccessTokenRef.current?.(),
//       mode,
//       vadThreshold,

//       onStateChange: (nextState, extra) => {
//         setState(nextState);
//         if (nextState === AUDIO_STATES.ERROR && extra?.message) {
//           setError(extra.message);
//         }
//         if (nextState === AUDIO_STATES.CAPTURING) {
//           setError(null);
//           setQueuedPosition(null);
//         }
//       },

//       onVAD: ({ speaking }) => setIsSpeaking(speaking),
//       onLevel: (level) => setAudioLevel(level),

//       onTranscript: ({ transcript, isFinal }) => {
//         if (isFinal) {
//           setFinalTranscript(transcript);
//           setInterimTranscript('');
//         } else {
//           setInterimTranscript(transcript);
//         }
//       },

//       onAnswer: ({ answer: answerText, question }) => {
//         setConversation((prev) => [
//           ...prev,
//           { id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, question, answer: answerText, timestamp: Date.now() },
//         ]);
//       },

//       onQueued: ({ position }) => {
//         setQueuedPosition(position);
//       },

//       onError: (err) => {
//         setError(err.message);
//       },
//     });

//     captureRef.current = capture;

//     return () => {
//       // Component unmounting or url/mode changed — tear down the old
//       // capture instance so we don't leak a WebSocket/AudioContext.
//       capture.stop().catch(() => {});
//       captureRef.current = null;
//     };
//   }, [websocketUrl, mode, vadThreshold]);

//   const start = useCallback(async () => {
//     setError(null);
//     setConversation([]);
//     setFinalTranscript('');
//     setInterimTranscript('');
//     if (!captureRef.current) return;
//     return captureRef.current.start();
//   }, []);

//   const stop = useCallback(async () => {
//     if (!captureRef.current) return;
//     return captureRef.current.stop();
//   }, []);

//   const requestAnswer = useCallback(() => {
//     captureRef.current?.requestAnswer();
//   }, []);

//   return {
//     state,                 // one of AUDIO_STATES — drive your "Detecting devices..." UI off this
//     error,
//     transcript: interimTranscript,
//     finalTranscript,
//     conversation,           // full Q&A history for this session, oldest first
//     latestAnswer: conversation[conversation.length - 1] || null,
//     isSpeaking,
//     audioLevel,
//     queuedPosition,
//     start,
//     stop,
//     requestAnswer,
//   };
// }

// ####################################################################
// ####################################################################
// ####################################################################

/**
 * FILE (target path): frontend/src/audio/useSystemAudio.js
 * PURPOSE: React hook wrapping SystemAudioCapture — this is what App.jsx
 * (or whatever component currently shows "Detecting devices...") should
 * call instead of the old window.electronAPI.startAudioCapture flow.
 *
 * USAGE (see App.jsx wiring notes below):
 *   const {
 *     state, error, transcript, finalTranscript, answer, isSpeaking,
 *     audioLevel, queuedPosition, start, stop, requestAnswer,
 *   } = useSystemAudio({ websocketUrl: 'ws://localhost:3000/stream', mode: 'default' });
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { SystemAudioCapture, AUDIO_STATES } from './systemAudioCapture';

export function useSystemAudio({
  websocketUrl,
  getAccessToken,          // () => string | Promise<string> — read fresh per connect,
                            // NOT a dependency of the instantiation effect below. This
                            // is what stops a token refresh from tearing down an
                            // active capture session (getUserMedia/AudioContext/WS all
                            // used to get destroyed and rebuilt on every refresh when
                            // the token was baked into websocketUrl instead).
  mode = 'default',
  vadThreshold = 0.01,
} = {}) {
  const [state, setState] = useState(AUDIO_STATES.IDLE);
  const [error, setError] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [conversation, setConversation] = useState([]); // [{id, question, answer, timestamp}]
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [queuedPosition, setQueuedPosition] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const captureRef = useRef(null);

  // Always call the LATEST getAccessToken, without making it an effect
  // dependency — this ref is what lets SystemAudioCapture ask for a fresh
  // token on every connect/reconnect without ever forcing the instance
  // below to be torn down and rebuilt.
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  // Instantiate once per (websocketUrl, mode) pair, not on every render,
  // and NOT on every token refresh.
  useEffect(() => {
    const capture = new SystemAudioCapture({
      websocketUrl,
      getToken: () => getAccessTokenRef.current?.(),
      mode,
      vadThreshold,

      onStateChange: (nextState, extra) => {
        setState(nextState);
        if (nextState === AUDIO_STATES.ERROR && extra?.message) {
          setError(extra.message);
        }
        if (nextState === AUDIO_STATES.CAPTURING) {
          setError(null);
          setQueuedPosition(null);
        }
      },

      onVAD: ({ speaking }) => setIsSpeaking(speaking),
      onLevel: (level) => setAudioLevel(level),

      onTranscript: ({ transcript, isFinal }) => {
        if (isFinal) {
          setFinalTranscript(transcript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(transcript);
        }
      },

      onAnswer: ({ answer: answerText, question }) => {
        setConversation((prev) => [
          ...prev,
          { id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, question, answer: answerText, timestamp: Date.now() },
        ]);
      },

      onQueued: ({ position }) => {
        setQueuedPosition(position);
      },

      onConversationId: (id) => {
        setConversationId(id);
      },

      onError: (err) => {
        setError(err.message);
      },
    });

    captureRef.current = capture;

    return () => {
      // Component unmounting or url/mode changed — tear down the old
      // capture instance so we don't leak a WebSocket/AudioContext.
      capture.stop().catch(() => {});
      captureRef.current = null;
    };
  }, [websocketUrl, mode, vadThreshold]);

  const start = useCallback(async () => {
    setError(null);
    setConversation([]);
    setFinalTranscript('');
    setInterimTranscript('');
    setConversationId(null);
    if (!captureRef.current) return;
    return captureRef.current.start();
  }, []);

  const stop = useCallback(async () => {
    if (!captureRef.current) return;
    return captureRef.current.stop();
  }, []);

  const requestAnswer = useCallback(() => {
    captureRef.current?.requestAnswer();
  }, []);

  return {
    state,                 // one of AUDIO_STATES — drive your "Detecting devices..." UI off this
    error,
    transcript: interimTranscript,
    finalTranscript,
    conversation,           // full Q&A history for this session, oldest first
    latestAnswer: conversation[conversation.length - 1] || null,
    isSpeaking,
    audioLevel,
    queuedPosition,
    conversationId,
    start,
    stop,
    requestAnswer,
  };
}