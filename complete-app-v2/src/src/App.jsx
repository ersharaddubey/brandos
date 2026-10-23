// /**
//  * FILE: frontend/src/App.jsx
//  * PURPOSE: Live call-support panel — always listening, single Respond action.
//  * TOKEN AUTH INTEGRATION — CORRECTED
//  *
//  * FIX FROM PREVIOUS REVISION: the WebSocket URL used to be rebuilt as
//  * `${WEBSOCKET_URL}?token=${accessToken}` and passed to useSystemAudio.
//  * Since accessToken is React state that changes on every token refresh
//  * (access tokens are short-lived — see server jwt.util.js), that meant
//  * useSystemAudio's instantiation effect (keyed on websocketUrl) tore down
//  * and rebuilt the ENTIRE capture pipeline — getUserMedia stream,
//  * AudioContext, AudioWorklet, WebSocket — on every single refresh, with no
//  * error and no visible signal. That's what silently killed transcription
//  * after the access token's ~15 min TTL elapsed.
//  *
//  * Fix: websocketUrl passed to useSystemAudio is now the stable BASE url
//  * (no token in it), and a separate getAccessToken function is passed
//  * instead — useSystemAudio reads it fresh on every WS connect/reconnect
//  * via a ref, never as an effect dependency. See useSystemAudio.js and
//  * systemAudioCapture.js for the other half of this fix.
//  */

// import { useCallback, useEffect, useRef, useState } from 'react';
// import './App.css';
// import { useSystemAudio } from './audio/useSystemAudio';
// import { AUDIO_STATES } from './audio/systemAudioCapture';
// import { useAuth } from './hooks/useAuth';
// import Login from './components/auth/Login';

// // TODO: move to an env var (e.g. import.meta.env.VITE_WS_URL) once you have
// // separate dev/staging/prod servers instead of hardcoding localhost.
// const WEBSOCKET_URL = 'ws://localhost:3000/stream';
// const CAPTURE_MODE = 'default';
// const RETRY_DELAY_MS = 3000;

// function formatTime(ts) {
//   return new Date(ts).toLocaleTimeString([], { hour12: false });
// }

// function App() {
//   const { isAuthenticated, isLoading, accessToken, user, logout } = useAuth();
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [noQuestionFlash, setNoQuestionFlash] = useState(false);

//   const hasStartedRef = useRef(false);
//   const retryTimeoutRef = useRef(null);
//   const conversationEndRef = useRef(null);

//   // ── Stable token getter — NOT rebuilt on every accessToken change ────
//   // useSystemAudio calls this fresh on every WS connect/reconnect via a
//   // ref internally, so this function identity being stable (useCallback,
//   // empty deps) combined with the ref pattern is what prevents token
//   // rotation from ever recreating the capture pipeline.
//   const accessTokenRef = useRef(accessToken);
//   useEffect(() => {
//     accessTokenRef.current = accessToken;
//   }, [accessToken]);
//   const getAccessToken = useCallback(() => accessTokenRef.current, []);

//   const {
//     state,
//     error,
//     transcript,
//     finalTranscript,
//     conversation,
//     isSpeaking,
//     audioLevel,
//     start,
//     requestAnswer,
//   } = useSystemAudio({
//     websocketUrl: WEBSOCKET_URL, // stable base URL — no token baked in
//     getAccessToken,
//     mode: CAPTURE_MODE,
//   });

//   const isListening = state === AUDIO_STATES.CAPTURING;
//   const isConnecting =
//     state === AUDIO_STATES.DETECTING ||
//     state === AUDIO_STATES.REQUESTING_PERMISSION ||
//     state === AUDIO_STATES.CONNECTING;
//   const isError = state === AUDIO_STATES.ERROR;

//   // ─── AUTO-START ON APP LOAD (ONLY IF AUTHENTICATED) ──────────
//   useEffect(() => {
//     if (hasStartedRef.current) return;
//     if (!isAuthenticated) return;

//     hasStartedRef.current = true;

//     if (window.electronAPI) {
//       start().catch((err) => console.error('Failed to start:', err.message));
//     } else {
//       console.warn('electronAPI not available');
//     }
//   }, [isAuthenticated, start]);

//   // ─── AUTO-RETRY ON ERROR ──────────────────────────────────────
//   useEffect(() => {
//     if (!isError) return;
//     retryTimeoutRef.current = setTimeout(() => {
//       start().catch((err) => console.error('Retry failed:', err.message));
//     }, RETRY_DELAY_MS);
//     return () => clearTimeout(retryTimeoutRef.current);
//   }, [isError, start]);

//   // ─── Clear "processing" once the server answers, or errors ───
//   useEffect(() => {
//     if (conversation.length > 0) setIsProcessing(false);
//   }, [conversation.length]);

//   useEffect(() => {
//     if (error) setIsProcessing(false);
//   }, [error]);

//   // ─── Auto-scroll to newest turn ───────────────────────────────
//   useEffect(() => {
//     conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
//   }, [conversation.length]);

//   const displayTranscript = (finalTranscript + ' ' + transcript).trim();

//   const handleRespond = () => {
//     if (displayTranscript.length < 3) {
//       setNoQuestionFlash(true);
//       setTimeout(() => setNoQuestionFlash(false), 2000);
//       return;
//     }
//     setIsProcessing(true);
//     requestAnswer();
//   };

//   const statusLabel = isError
//     ? 'Connection error'
//     : isConnecting
//     ? 'Connecting'
//     : isProcessing
//     ? 'Generating'
//     : isListening
//     ? (isSpeaking ? 'Live' : 'Listening')
//     : 'Idle';

//   const statusClass = isError
//     ? 'error'
//     : isConnecting
//     ? 'connecting'
//     : isProcessing
//     ? 'processing'
//     : isListening
//     ? (isSpeaking ? 'live' : 'listening')
//     : 'idle';

//   const respondLabel = isProcessing
//     ? 'Generating answer…'
//     : noQuestionFlash
//     ? 'No new question yet'
//     : 'Get answer';

//   // ─── Loading State ─────────────────────────────────────────────
//   if (isLoading) {
//     return (
//       <div className="loading-container">
//         <div className="loading-spinner" />
//         <p className="loading-text">Loading...</p>
//       </div>
//     );
//   }

//   // ─── Not Authenticated ─────────────────────────────────────────
//   if (!isAuthenticated) {
//     return <Login onLoginSuccess={() => window.location.reload()} />;
//   }

//   return (
//     <div className="app">
//       {/* ── Header — draggable region ────────────────────────── */}
//       <header className="app__header">
//         <div className="brand">
//           <span className="brand__mark" aria-hidden="true" />
//           <span className="brand__name">Support Assistant</span>
//         </div>
//         <div className="header-actions">
//           <span className="user-email">{user?.email}</span>
//           <button className="logout-btn" onClick={logout}>
//             Logout
//           </button>
//           <div className={`status-pill status-pill--${statusClass}`}>
//             <span className="status-pill__dot" />
//             <span className="status-pill__label">{statusLabel}</span>
//           </div>
//         </div>
//       </header>

//       {/* ── Live capture strip ───────────────────────────────── */}
//       <div className="capture-strip">
//         <div className="waveform" aria-hidden="true">
//           {[0, 1, 2, 3, 4].map((i) => (
//             <span
//               key={i}
//               className="waveform__bar"
//               style={{
//                 height: isSpeaking
//                   ? `${Math.min(24, 4 + audioLevel * 300 * (0.6 + 0.4 * Math.sin(i)))}px`
//                   : '4px',
//               }}
//             />
//           ))}
//         </div>
//         <span className="capture-strip__label">
//           {isSpeaking ? 'Voice detected' : 'Monitoring audio'}
//         </span>
//       </div>

//       {isError && (
//         <div className="banner banner--error">
//           {error || 'Connection lost.'} Reconnecting…
//         </div>
//       )}

//       {/* ── Interim transcript (not yet finalized) ──────────────── */}
//       <div className="live-transcript">
//         <span className="live-transcript__eyebrow">Live transcript</span>
//         <p className="live-transcript__text">
//           {displayTranscript || 'Waiting for speech…'}
//         </p>
//       </div>

//       {/* ── Conversation log ─────────────────────────────────── */}
//       <div className="log">
//         {conversation.length === 0 && (
//           <div className="log__empty">
//             Answers will appear here once you request one.
//           </div>
//         )}

//         {conversation.map((turn) => (
//           <div key={turn.id} className="log__turn">
//             <div className="log__meta">
//               <span className="log__time">{formatTime(turn.timestamp)}</span>
//             </div>
//             <div className="log__row log__row--question">
//               <span className="log__badge log__badge--q">Q</span>
//               <p className="log__text">{turn.question}</p>
//             </div>
//             <div className="log__row log__row--answer">
//               <span className="log__badge log__badge--a">A</span>
//               <p className="log__text">{turn.answer}</p>
//             </div>
//           </div>
//         ))}
//         <div ref={conversationEndRef} />
//       </div>

//       {/* ── Primary action ───────────────────────────────────── */}
//       <div className="action-bar">
//         <button
//           className="respond-btn"
//           onClick={handleRespond}
//           disabled={isProcessing || !isListening || isError || isConnecting}
//         >
//           {isProcessing && <span className="respond-btn__spinner" aria-hidden="true" />}
//           {respondLabel}
//         </button>
//       </div>
//     </div>
//   );
// }

// export default App;

// #####################################################################
// #####################################################################
// #####################################################################

// /**
//  * FILE: frontend/src/App.jsx
//  * PURPOSE: Live call-support panel — voice, text chat, screenshot, and
//  * history, behind a tab switcher.
//  *
//  * IMPORTANT: voice mode's hook (useSystemAudio) and its auto-start/retry
//  * effects stay declared unconditionally at the top level, exactly as
//  * before — they are NOT inside a conditionally-rendered component. Voice
//  * capture keeps running in the background regardless of which tab is
//  * currently visible ("always listening", per the original design) —
//  * switching tabs only changes what's rendered, never tears down the
//  * audio pipeline. Only the JSX for the voice panel's body is wrapped in
//  * `{activeTab === 'voice' && (...)}`.
//  */

// import { useCallback, useEffect, useRef, useState } from 'react';
// import './App.css';
// import { useSystemAudio } from './audio/useSystemAudio';
// import { AUDIO_STATES } from './audio/systemAudioCapture';
// import { useAuth } from './hooks/useAuth';
// import Login from './components/auth/Login';
// import TextChatInput from './components/chat/TextChatInput';
// import ScreenshotCapture from './components/screenshot/ScreenshotCapture';
// import HistoryPanel from './components/history/HistoryPanel';

// const WEBSOCKET_URL = 'ws://localhost:3000/stream';
// const CAPTURE_MODE = 'default';
// const RETRY_DELAY_MS = 3000;

// const TABS = [
//   { id: 'voice', label: 'Voice' },
//   { id: 'chat', label: 'Chat' },
//   { id: 'screenshot', label: 'Screenshot' },
//   { id: 'history', label: 'History' },
// ];

// function formatTime(ts) {
//   return new Date(ts).toLocaleTimeString([], { hour12: false });
// }

// function App() {
//   const { isAuthenticated, isLoading, accessToken, user, logout } = useAuth();
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [noQuestionFlash, setNoQuestionFlash] = useState(false);
//   const [activeTab, setActiveTab] = useState('voice');

//   const hasStartedRef = useRef(false);
//   const retryTimeoutRef = useRef(null);
//   const conversationEndRef = useRef(null);

//   // ── Stable token getter — shared by voice AND the new REST-based
//   // hooks (useTextChat, useScreenshotAnswer, useConversations). Same
//   // ref pattern as before: never rebuilt on token refresh.
//   const accessTokenRef = useRef(accessToken);
//   useEffect(() => {
//     accessTokenRef.current = accessToken;
//   }, [accessToken]);
//   const getAccessToken = useCallback(() => accessTokenRef.current, []);

//   const {
//     state,
//     error,
//     transcript,
//     finalTranscript,
//     conversation,
//     isSpeaking,
//     audioLevel,
//     start,
//     requestAnswer,
//   } = useSystemAudio({
//     websocketUrl: WEBSOCKET_URL,
//     getAccessToken,
//     mode: CAPTURE_MODE,
//   });

//   const isListening = state === AUDIO_STATES.CAPTURING;
//   const isConnecting =
//     state === AUDIO_STATES.DETECTING ||
//     state === AUDIO_STATES.REQUESTING_PERMISSION ||
//     state === AUDIO_STATES.CONNECTING;
//   const isError = state === AUDIO_STATES.ERROR;

//   useEffect(() => {
//     if (hasStartedRef.current) return;
//     if (!isAuthenticated) return;
//     hasStartedRef.current = true;
//     if (window.electronAPI) {
//       start().catch((err) => console.error('Failed to start:', err.message));
//     } else {
//       console.warn('electronAPI not available');
//     }
//   }, [isAuthenticated, start]);

//   useEffect(() => {
//     if (!isError) return;
//     retryTimeoutRef.current = setTimeout(() => {
//       start().catch((err) => console.error('Retry failed:', err.message));
//     }, RETRY_DELAY_MS);
//     return () => clearTimeout(retryTimeoutRef.current);
//   }, [isError, start]);

//   useEffect(() => {
//     if (conversation.length > 0) setIsProcessing(false);
//   }, [conversation.length]);

//   useEffect(() => {
//     if (error) setIsProcessing(false);
//   }, [error]);

//   useEffect(() => {
//     if (activeTab === 'voice') {
//       conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
//     }
//   }, [conversation.length, activeTab]);

//   const displayTranscript = (finalTranscript + ' ' + transcript).trim();

//   const handleRespond = () => {
//     if (displayTranscript.length < 3) {
//       setNoQuestionFlash(true);
//       setTimeout(() => setNoQuestionFlash(false), 2000);
//       return;
//     }
//     setIsProcessing(true);
//     requestAnswer();
//   };

//   const statusLabel = isError
//     ? 'Connection error'
//     : isConnecting
//     ? 'Connecting'
//     : isProcessing
//     ? 'Generating'
//     : isListening
//     ? isSpeaking
//       ? 'Live'
//       : 'Listening'
//     : 'Idle';

//   const statusClass = isError
//     ? 'error'
//     : isConnecting
//     ? 'connecting'
//     : isProcessing
//     ? 'processing'
//     : isListening
//     ? isSpeaking
//       ? 'live'
//       : 'listening'
//     : 'idle';

//   const respondLabel = isProcessing
//     ? 'Generating answer…'
//     : noQuestionFlash
//     ? 'No new question yet'
//     : 'Get answer';

//   if (isLoading) {
//     return (
//       <div className="loading-container">
//         <div className="loading-spinner" />
//         <p className="loading-text">Loading...</p>
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return <Login onLoginSuccess={() => window.location.reload()} />;
//   }

//   return (
//     <div className="app">
//       <header className="app__header">
//         <div className="brand">
//           <span className="brand__mark" aria-hidden="true" />
//           <span className="brand__name">Support Assistant</span>
//         </div>
//         <div className="header-actions">
//           <span className="user-email">{user?.email}</span>
//           <button className="logout-btn" onClick={logout}>
//             Logout
//           </button>
//           <div className={`status-pill status-pill--${statusClass}`}>
//             <span className="status-pill__dot" />
//             <span className="status-pill__label">{statusLabel}</span>
//           </div>
//         </div>
//       </header>

//       {/* ── Mode tabs — voice keeps running in the background regardless
//           of which tab is active; see header comment. */}
//       <nav className="tabbar">
//         {TABS.map((tab) => (
//           <button
//             key={tab.id}
//             className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
//             onClick={() => setActiveTab(tab.id)}
//           >
//             {tab.label}
//           </button>
//         ))}
//       </nav>

//       {activeTab === 'voice' && (
//         <>
//           <div className="capture-strip">
//             <div className="waveform" aria-hidden="true">
//               {[0, 1, 2, 3, 4].map((i) => (
//                 <span
//                   key={i}
//                   className="waveform__bar"
//                   style={{
//                     height: isSpeaking
//                       ? `${Math.min(24, 4 + audioLevel * 300 * (0.6 + 0.4 * Math.sin(i)))}px`
//                       : '4px',
//                   }}
//                 />
//               ))}
//             </div>
//             <span className="capture-strip__label">
//               {isSpeaking ? 'Voice detected' : 'Monitoring audio'}
//             </span>
//           </div>

//           {isError && (
//             <div className="banner banner--error">
//               {error || 'Connection lost.'} Reconnecting…
//             </div>
//           )}

//           <div className="live-transcript">
//             <span className="live-transcript__eyebrow">Live transcript</span>
//             <p className="live-transcript__text">{displayTranscript || 'Waiting for speech…'}</p>
//           </div>

//           <div className="log">
//             {conversation.length === 0 && (
//               <div className="log__empty">Answers will appear here once you request one.</div>
//             )}
//             {conversation.map((turn) => (
//               <div key={turn.id} className="log__turn">
//                 <div className="log__meta">
//                   <span className="log__time">{formatTime(turn.timestamp)}</span>
//                 </div>
//                 <div className="log__row log__row--question">
//                   <span className="log__badge log__badge--q">Q</span>
//                   <p className="log__text">{turn.question}</p>
//                 </div>
//                 <div className="log__row log__row--answer">
//                   <span className="log__badge log__badge--a">A</span>
//                   <p className="log__text">{turn.answer}</p>
//                 </div>
//               </div>
//             ))}
//             <div ref={conversationEndRef} />
//           </div>

//           <div className="action-bar">
//             <button
//               className="respond-btn"
//               onClick={handleRespond}
//               disabled={isProcessing || !isListening || isError || isConnecting}
//             >
//               {isProcessing && <span className="respond-btn__spinner" aria-hidden="true" />}
//               {respondLabel}
//             </button>
//           </div>
//         </>
//       )}

//       {activeTab === 'chat' && <TextChatInput getAccessToken={getAccessToken} />}
//       {activeTab === 'screenshot' && <ScreenshotCapture getAccessToken={getAccessToken} />}
//       {activeTab === 'history' && <HistoryPanel getAccessToken={getAccessToken} />}
//     </div>
//   );
// }

// export default App;

// #####################################################################
// #####################################################################
// #####################################################################

// /**
//  * FILE: frontend/src/App.jsx
//  * PURPOSE: Live call-support panel — ONE unified chat feed (voice + text
//  * + screenshot all merged) plus History. No mode tabs for the assistant
//  * itself — see components/assistant/UnifiedAssistant.jsx.
//  *
//  * Voice's hook (useSystemAudio) and its auto-start/retry effects stay
//  * declared unconditionally here, exactly as before — voice capture keeps
//  * running in the background at all times, "always listening" per the
//  * original design. UnifiedAssistant just receives the pieces it needs
//  * as props; it doesn't own the voice connection itself.
//  */

// import { useCallback, useEffect, useRef, useState } from 'react';
// import './App.css';
// import { useSystemAudio } from './audio/useSystemAudio';
// import { AUDIO_STATES } from './audio/systemAudioCapture';
// import { useAuth } from './hooks/useAuth';
// import Login from './components/auth/Login';
// import UnifiedAssistant from './components/assistant/UnifiedAssistant';
// import HistoryPanel from './components/history/HistoryPanel';

// const WEBSOCKET_URL = 'ws://localhost:3000/stream';
// const CAPTURE_MODE = 'default';
// const RETRY_DELAY_MS = 3000;

// const TABS = [
//   { id: 'assistant', label: 'Assistant' },
//   { id: 'history', label: 'History' },
// ];

// function App() {
//   const { isAuthenticated, isLoading, accessToken, user, logout } = useAuth();
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [noQuestionFlash, setNoQuestionFlash] = useState(false);
//   const [activeTab, setActiveTab] = useState('assistant');

//   const hasStartedRef = useRef(false);
//   const retryTimeoutRef = useRef(null);

//   const accessTokenRef = useRef(accessToken);
//   useEffect(() => {
//     accessTokenRef.current = accessToken;
//   }, [accessToken]);
//   const getAccessToken = useCallback(() => accessTokenRef.current, []);

//   const {
//     state,
//     error,
//     transcript,
//     finalTranscript,
//     conversation,
//     isSpeaking,
//     start,
//     requestAnswer,
//   } = useSystemAudio({
//     websocketUrl: WEBSOCKET_URL,
//     getAccessToken,
//     mode: CAPTURE_MODE,
//   });

//   const isListening = state === AUDIO_STATES.CAPTURING;
//   const isConnecting =
//     state === AUDIO_STATES.DETECTING ||
//     state === AUDIO_STATES.REQUESTING_PERMISSION ||
//     state === AUDIO_STATES.CONNECTING;
//   const isError = state === AUDIO_STATES.ERROR;

//   useEffect(() => {
//     if (hasStartedRef.current) return;
//     if (!isAuthenticated) return;
//     hasStartedRef.current = true;
//     if (window.electronAPI) {
//       start().catch((err) => console.error('Failed to start:', err.message));
//     } else {
//       console.warn('electronAPI not available');
//     }
//   }, [isAuthenticated, start]);

//   useEffect(() => {
//     if (!isError) return;
//     retryTimeoutRef.current = setTimeout(() => {
//       start().catch((err) => console.error('Retry failed:', err.message));
//     }, RETRY_DELAY_MS);
//     return () => clearTimeout(retryTimeoutRef.current);
//   }, [isError, start]);

//   useEffect(() => {
//     if (conversation.length > 0) setIsProcessing(false);
//   }, [conversation.length]);

//   useEffect(() => {
//     if (error) setIsProcessing(false);
//   }, [error]);

//   const displayTranscript = (finalTranscript + ' ' + transcript).trim();

//   const handleGetAnswer = () => {
//     if (displayTranscript.length < 3) {
//       setNoQuestionFlash(true);
//       setTimeout(() => setNoQuestionFlash(false), 2000);
//       return;
//     }
//     setIsProcessing(true);
//     requestAnswer();
//   };

//   const statusLabel = isError
//     ? 'Connection error'
//     : isConnecting
//     ? 'Connecting'
//     : isProcessing
//     ? 'Generating'
//     : isListening
//     ? isSpeaking
//       ? 'Live'
//       : 'Listening'
//     : 'Idle';

//   const statusClass = isError
//     ? 'error'
//     : isConnecting
//     ? 'connecting'
//     : isProcessing
//     ? 'processing'
//     : isListening
//     ? isSpeaking
//       ? 'live'
//       : 'listening'
//     : 'idle';

//   if (isLoading) {
//     return (
//       <div className="loading-container">
//         <div className="loading-spinner" />
//         <p className="loading-text">Loading...</p>
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return <Login onLoginSuccess={() => window.location.reload()} />;
//   }

//   return (
//     <div className="app">
//       <header className="app__header">
//         <div className="brand">
//           <span className="brand__mark" aria-hidden="true" />
//           <span className="brand__name">Support Assistant</span>
//         </div>
//         <div className="header-actions">
//           <span className="user-email">{user?.email}</span>
//           <button className="logout-btn" onClick={logout}>
//             Logout
//           </button>
//           <div className={`status-pill status-pill--${statusClass}`}>
//             <span className="status-pill__dot" />
//             <span className="status-pill__label">{statusLabel}</span>
//           </div>
//         </div>
//       </header>

//       <nav className="tabbar">
//         {TABS.map((tab) => (
//           <button
//             key={tab.id}
//             className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
//             onClick={() => setActiveTab(tab.id)}
//           >
//             {tab.label}
//           </button>
//         ))}
//       </nav>

//       {isError && activeTab === 'assistant' && (
//         <div className="banner banner--error">{error || 'Connection lost.'} Reconnecting…</div>
//       )}

//       {activeTab === 'assistant' && (
//         <UnifiedAssistant
//           getAccessToken={getAccessToken}
//           voiceTranscript={displayTranscript}
//           voiceConversation={conversation}
//           isListening={isListening}
//           isVoiceProcessing={isProcessing}
//           onGetAnswer={handleGetAnswer}
//           noQuestionFlash={noQuestionFlash}
//         />
//       )}

//       {activeTab === 'history' && <HistoryPanel getAccessToken={getAccessToken} />}
//     </div>
//   );
// }

// export default App;

// #######################################################################
// #######################################################################
// #######################################################################


// /**
//  * FILE: frontend/src/App.jsx
//  * PURPOSE: Live call-support panel — ONE unified chat feed (voice + text
//  * + screenshot all merged) plus History. No mode tabs for the assistant
//  * itself — see components/assistant/UnifiedAssistant.jsx.
//  *
//  * Voice's hook (useSystemAudio) and its auto-start/retry effects stay
//  * declared unconditionally here, exactly as before — voice capture keeps
//  * running in the background at all times, "always listening" per the
//  * original design. UnifiedAssistant just receives the pieces it needs
//  * as props; it doesn't own the voice connection itself.
//  */

// import { useCallback, useEffect, useRef, useState } from 'react';
// import './App.css';
// import { useSystemAudio } from './audio/useSystemAudio';
// import { AUDIO_STATES } from './audio/systemAudioCapture';
// import { useAuth } from './hooks/useAuth';
// import Login from './components/auth/Login';
// import UnifiedAssistant from './components/assistant/UnifiedAssistant';
// import HistoryPanel from './components/history/HistoryPanel';

// const WEBSOCKET_URL = 'ws://localhost:3000/stream';
// const CAPTURE_MODE = 'default';
// const RETRY_DELAY_MS = 3000;

// const TABS = [
//   { id: 'assistant', label: 'Assistant' },
//   { id: 'history', label: 'History' },
// ];

// function App() {
//   const { isAuthenticated, isLoading, accessToken, user, logout } = useAuth();
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [noQuestionFlash, setNoQuestionFlash] = useState(false);
//   const [activeTab, setActiveTab] = useState('assistant');

//   const hasStartedRef = useRef(false);
//   const retryTimeoutRef = useRef(null);

//   const accessTokenRef = useRef(accessToken);
//   useEffect(() => {
//     accessTokenRef.current = accessToken;
//   }, [accessToken]);
//   const getAccessToken = useCallback(() => accessTokenRef.current, []);

//   const {
//     state,
//     error,
//     transcript,
//     finalTranscript,
//     conversation,
//     isSpeaking,
//     conversationId,
//     start,
//     requestAnswer,
//   } = useSystemAudio({
//     websocketUrl: WEBSOCKET_URL,
//     getAccessToken,
//     mode: CAPTURE_MODE,
//   });

//   const isListening = state === AUDIO_STATES.CAPTURING;
//   const isConnecting =
//     state === AUDIO_STATES.DETECTING ||
//     state === AUDIO_STATES.REQUESTING_PERMISSION ||
//     state === AUDIO_STATES.CONNECTING;
//   const isError = state === AUDIO_STATES.ERROR;

//   useEffect(() => {
//     if (hasStartedRef.current) return;
//     if (!isAuthenticated) return;
//     hasStartedRef.current = true;
//     if (window.electronAPI) {
//       start().catch((err) => console.error('Failed to start:', err.message));
//     } else {
//       console.warn('electronAPI not available');
//     }
//   }, [isAuthenticated, start]);

//   useEffect(() => {
//     if (!isError) return;
//     retryTimeoutRef.current = setTimeout(() => {
//       start().catch((err) => console.error('Retry failed:', err.message));
//     }, RETRY_DELAY_MS);
//     return () => clearTimeout(retryTimeoutRef.current);
//   }, [isError, start]);

//   useEffect(() => {
//     if (conversation.length > 0) setIsProcessing(false);
//   }, [conversation.length]);

//   useEffect(() => {
//     if (error) setIsProcessing(false);
//   }, [error]);

//   const displayTranscript = (finalTranscript + ' ' + transcript).trim();

//   const handleGetAnswer = () => {
//     if (displayTranscript.length < 3) {
//       setNoQuestionFlash(true);
//       setTimeout(() => setNoQuestionFlash(false), 2000);
//       return;
//     }
//     setIsProcessing(true);
//     requestAnswer();
//   };

//   const statusLabel = isError
//     ? 'Connection error'
//     : isConnecting
//     ? 'Connecting'
//     : isProcessing
//     ? 'Generating'
//     : isListening
//     ? isSpeaking
//       ? 'Live'
//       : 'Listening'
//     : 'Idle';

//   const statusClass = isError
//     ? 'error'
//     : isConnecting
//     ? 'connecting'
//     : isProcessing
//     ? 'processing'
//     : isListening
//     ? isSpeaking
//       ? 'live'
//       : 'listening'
//     : 'idle';

//   if (isLoading) {
//     return (
//       <div className="loading-container">
//         <div className="loading-spinner" />
//         <p className="loading-text">Loading...</p>
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return <Login onLoginSuccess={() => window.location.reload()} />;
//   }

//   return (
//     <div className="app">
//       <header className="app__header">
//         <div className="brand">
//           <span className="brand__mark" aria-hidden="true" />
//           <span className="brand__name">Support Assistant</span>
//         </div>
//         <div className="header-actions">
//           <span className="user-email">{user?.email}</span>
//           <button className="logout-btn" onClick={logout}>
//             Logout
//           </button>
//           <div className={`status-pill status-pill--${statusClass}`}>
//             <span className="status-pill__dot" />
//             <span className="status-pill__label">{statusLabel}</span>
//           </div>
//         </div>
//       </header>

//       <nav className="tabbar">
//         {TABS.map((tab) => (
//           <button
//             key={tab.id}
//             className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
//             onClick={() => setActiveTab(tab.id)}
//           >
//             {tab.label}
//           </button>
//         ))}
//       </nav>

//       {isError && activeTab === 'assistant' && (
//         <div className="banner banner--error">{error || 'Connection lost.'} Reconnecting…</div>
//       )}

//       {activeTab === 'assistant' && (
//         <UnifiedAssistant
//           getAccessToken={getAccessToken}
//           sharedConversationId={conversationId}
//           voiceTranscript={displayTranscript}
//           voiceConversation={conversation}
//           isListening={isListening}
//           isVoiceProcessing={isProcessing}
//           onGetAnswer={handleGetAnswer}
//           noQuestionFlash={noQuestionFlash}
//         />
//       )}

//       {activeTab === 'history' && <HistoryPanel getAccessToken={getAccessToken} />}
//     </div>
//   );
// }

// export default App;

// ###################################################################################
// ###################################################################################
// ###################################################################################

/**
 * FILE: frontend/src/App.jsx
 * PURPOSE: Live call-support panel — ONE unified chat feed (voice + text
 * + screenshot all merged) plus History and Plan settings.
 *
 * PHASE L1-F CHANGE: after login, plan status is checked via usePlan().
 * If no active plan, PlanActivation replaces the whole app UI (the real
 * frontend equivalent of what we were testing via Postman for L1-B
 * through L1-E). Voice's auto-start is now ALSO gated on plan.isActive —
 * previously it started the instant you logged in regardless of plan
 * status, which would just immediately hit the PLAN_REQUIRED block we
 * built in websocket/server.js. Better to not even attempt the
 * connection until a plan is actually active.
 *
 * Voice's hook (useSystemAudio) and its auto-start/retry effects stay
 * declared unconditionally here, exactly as before — voice capture keeps
 * running in the background at all times once a plan is active.
 * UnifiedAssistant just receives the pieces it needs as props; it
 * doesn't own the voice connection itself.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { useSystemAudio } from './audio/useSystemAudio';
import { AUDIO_STATES } from './audio/systemAudioCapture';
import { useAuth } from './hooks/useAuth';
import { usePlan } from './hooks/usePlan';
import Login from './components/auth/Login';
import UnifiedAssistant from './components/assistant/UnifiedAssistant';
import HistoryPanel from './components/history/HistoryPanel';
import PlanActivation from './components/plan/PlanActivation';
import PlanSettings from './components/plan/PlanSettings';
import TitleBar from './components/navbar/TitleBar';
import { useProfile } from './hooks/useProfile';
import TechProfileForm from './components/profile/TechProfileForm';


const WEBSOCKET_URL = 'ws://localhost:3000/stream';
const CAPTURE_MODE = 'default';
const RETRY_DELAY_MS = 3000;

const TABS = [
  { id: 'assistant', label: 'Assistant' },
  { id: 'history', label: 'History' },
  { id: 'plan', label: 'Plan' },
  { id: 'profile', label: 'Profile' },
];

function App() {
  const { isAuthenticated, isLoading, accessToken, user, logout } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [noQuestionFlash, setNoQuestionFlash] = useState(false);
  const [activeTab, setActiveTab] = useState('assistant');

  const hasStartedRef = useRef(false);
  const retryTimeoutRef = useRef(null);

  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);
  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const plan = usePlan({ getAccessToken, isAuthenticated });
  const profile = useProfile({ getAccessToken, isAuthenticated });

  const {
    state,
    error,
    transcript,
    finalTranscript,
    conversation,
    isSpeaking,
    conversationId,
    start,
    requestAnswer,
  } = useSystemAudio({
    websocketUrl: WEBSOCKET_URL,
    getAccessToken,
    mode: CAPTURE_MODE,
  });

  const isListening = state === AUDIO_STATES.CAPTURING;
  const isConnecting =
    state === AUDIO_STATES.DETECTING ||
    state === AUDIO_STATES.REQUESTING_PERMISSION ||
    state === AUDIO_STATES.CONNECTING;
  const isError = state === AUDIO_STATES.ERROR;

  // Only auto-start voice once BOTH authenticated AND an active plan
  // exists — starting earlier would just hit the PLAN_REQUIRED block in
  // websocket/server.js immediately.
  useEffect(() => {
    if (hasStartedRef.current) return;
    if (!isAuthenticated || !plan.isActive) return;
    hasStartedRef.current = true;
    if (window.electronAPI) {
      start().catch((err) => console.error('Failed to start:', err.message));
    } else {
      console.warn('electronAPI not available');
    }
  }, [isAuthenticated, plan.isActive, start]);

  useEffect(() => {
    if (!isError) return;
    retryTimeoutRef.current = setTimeout(() => {
      start().catch((err) => console.error('Retry failed:', err.message));
    }, RETRY_DELAY_MS);
    return () => clearTimeout(retryTimeoutRef.current);
  }, [isError, start]);

  useEffect(() => {
    if (conversation.length > 0) setIsProcessing(false);
  }, [conversation.length]);

  useEffect(() => {
    if (error) setIsProcessing(false);
  }, [error]);

  const displayTranscript = (finalTranscript + ' ' + transcript).trim();

  const handleGetAnswer = () => {
    if (displayTranscript.length < 3) {
      setNoQuestionFlash(true);
      setTimeout(() => setNoQuestionFlash(false), 2000);
      return;
    }
    setIsProcessing(true);
    requestAnswer();
  };

  const statusLabel = isError
    ? 'Connection error'
    : isConnecting
    ? 'Connecting'
    : isProcessing
    ? 'Generating'
    : isListening
    ? isSpeaking
      ? 'Live'
      : 'Listening'
    : 'Idle';

  const statusClass = isError
    ? 'error'
    : isConnecting
    ? 'connecting'
    : isProcessing
    ? 'processing'
    : isListening
    ? isSpeaking
      ? 'live'
      : 'listening'
    : 'idle';

  if (isLoading) {
    return (
      <>
      <TitleBar />
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">Loading...</p>
      </div>
      </>
    );
  }

  
  if (!isAuthenticated) {
    return (
      <>
        <TitleBar />
        <Login onLoginSuccess={() => window.location.reload()} />
      </>
    );
  }

  // ── Plan gating ──────────────────────────────────────────────────
  // Loading state for the plan check itself (brief, right after login).
  if (plan.status === 'loading') {
    return (
      <>
      <TitleBar />
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">Checking your plan...</p>
      </div>
      </>
    );
  }

  // No active plan — show activation instead of the assistant entirely.
  if (!plan.isActive) {
    return (
      <>
      <TitleBar />
      <PlanActivation
        activateL1={plan.activateL1}
        isSubmitting={plan.isSubmitting}
        error={plan.error}
        providerCapabilities={plan.providerCapabilities}
        onActivated={plan.refetch}
      />
      </>
    );
  }
  if (!isAuthenticated) {
    return (
      <>
        <TitleBar />
        <Login onLoginSuccess={() => window.location.reload()} />
      </>
    );
  }

  return (
    <div className="app">
      <TitleBar />
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__name">Support Assistant</span>
        </div>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
          <div className={`status-pill status-pill--${statusClass}`}>
            <span className="status-pill__dot" />
            <span className="status-pill__label">{statusLabel}</span>
          </div>
        </div>
      </header>

      <nav className="tabbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {isError && activeTab === 'assistant' && (
        <div className="banner banner--error">{error || 'Connection lost.'} Reconnecting…</div>
      )}

      {activeTab === 'assistant' && (
        <UnifiedAssistant
          getAccessToken={getAccessToken}
          sharedConversationId={conversationId}
          voiceTranscript={displayTranscript}
          voiceConversation={conversation}
          isListening={isListening}
          isVoiceProcessing={isProcessing}
          onGetAnswer={handleGetAnswer}
          noQuestionFlash={noQuestionFlash}
        />
      )}

      {activeTab === 'history' && <HistoryPanel getAccessToken={getAccessToken} />}

      {activeTab === 'plan' && (
        <PlanSettings
          providerPreferences={plan.providerPreferences}
          configuredProviders={plan.configuredProviders}
          providerCapabilities={plan.providerCapabilities}
          onReassign={plan.reassignProvider}
          onUpdateKey={plan.updateProviderKey}   
          isUpdatingKey={plan.isUpdatingKey}  
          error={plan.error}
        />
      )}

      {activeTab === 'profile' && (
        <TechProfileForm
          techProfile={profile.techProfile}
          onSave={profile.saveProfile}
          isSubmitting={profile.isSubmitting}
          error={profile.error}
        />
      )}
    </div>
  );
}

export default App;
