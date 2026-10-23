// /**
//  * FILE: frontend/src/components/assistant/UnifiedAssistant.jsx
//  * PURPOSE: ONE chat feed for all three input modes — voice, typed text,
//  * and screenshots all land in the same continuous timeline, sorted by
//  * time. Two buttons ("Get Answer" for voice, "Screenshot") plus a text
//  * input for typing/pasting, all visible together — no tabs, no mode
//  * switching required by the user.
//  *
//  * NOTE ON BACKEND MODES: under the hood, voice/text/screenshot still go
//  * through their own separate WS session / conversationId (Phase 6's
//  * "three independent threads" design — unchanged). This component only
//  * merges them for DISPLAY, into one visual conversation. Each turn keeps
//  * a small `source` tag (color-coded, same tokens as History's mode
//  * badges) so it's clear which channel produced it, without requiring the
//  * user to think about "modes" at all.
//  */

// import { useEffect, useMemo, useRef, useState } from 'react';
// import { useTextChat } from '../../hooks/useTextChat';
// import { useScreenshotAnswer } from '../../hooks/useScreenshotAnswer';

// function formatTime(ts) {
//   return new Date(ts).toLocaleTimeString([], { hour12: false });
// }

// const SOURCE_LABEL = { voice: 'Voice', text: 'Chat', screenshot: 'Screenshot' };

// export default function UnifiedAssistant({
//   getAccessToken,
//   sharedConversationId,
//   // Voice pieces — voice's hook lives in App.jsx (must stay always-mounted
//   // for "always listening" to keep working regardless of what's on screen).
//   voiceTranscript,
//   voiceConversation,
//   isListening,
//   isVoiceProcessing,
//   onGetAnswer,
//   noQuestionFlash,
// }) {
//   const { messages: textMessages, isSending: isTextSending, error: textError, sendMessage } =
//     useTextChat({ getAccessToken, sharedConversationId });

//   const {
//     entries: screenshotEntries,
//     capturedImage,
//     isCapturing,
//     isSending: isScreenshotSending,
//     error: screenshotError,
//     capture,
//     clearCapture,
//     send: sendScreenshot,
//   } = useScreenshotAnswer({ getAccessToken, sharedConversationId });

//   const [draft, setDraft] = useState('');
//   const feedEndRef = useRef(null);

//   // ── Merge all three sources into one chronological timeline ────
//   const timeline = useMemo(() => {
//     const voiceTurns = voiceConversation.map((t) => ({ ...t, source: 'voice' }));
//     const textTurns = textMessages.map((t) => ({ ...t, source: 'text' }));
//     const screenshotTurns = screenshotEntries.map((t) => ({ ...t, source: 'screenshot' }));
//     return [...voiceTurns, ...textTurns, ...screenshotTurns].sort((a, b) => a.timestamp - b.timestamp);
//   }, [voiceConversation, textMessages, screenshotEntries]);

//   useEffect(() => {
//     feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
//   }, [timeline.length]);

//   const handleSendText = () => {
//     if (!draft.trim() || isTextSending) return;
//     sendMessage(draft);
//     setDraft('');
//   };

//   const handleKeyDown = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSendText();
//     }
//   };

//   const handleScreenshotClick = async () => {
//     if (capturedImage) {
//       // Already captured, awaiting confirm — send it now (with whatever's typed as the caption).
//       await sendScreenshot(draft);
//       setDraft('');
//       return;
//     }
//     await capture();
//   };

//   const error = textError || screenshotError;

//   return (
//     <div className="panel">
//       {error && <div className="banner banner--error">{error}</div>}

//       {/* Live transcript strip — always visible, shows what's currently
//           being heard even before "Get Answer" is clicked. */}
//       <div className="live-transcript">
//         <span className="live-transcript__eyebrow">Live transcript</span>
//         <p className="live-transcript__text">{voiceTranscript || 'Waiting for speech…'}</p>
//       </div>

//       {/* ── One merged feed ─────────────────────────────────────── */}
//       <div className="log">
//         {timeline.length === 0 && (
//           <div className="log__empty">
//             Talk, type, or capture a screenshot — everything shows up here.
//           </div>
//         )}
//         {timeline.map((turn) => (
//           <div key={turn.id} className="log__turn">
//             <div className="log__meta">
//               <span className={`log__source log__source--${turn.source}`}>
//                 {SOURCE_LABEL[turn.source]}
//               </span>
//               <span className="log__time">{formatTime(turn.timestamp)}</span>
//             </div>
//             {turn.image && <img className="screenshot-thumb" src={turn.image} alt="Captured screenshot" />}
//             {turn.question && (
//               <div className="log__row log__row--question">
//                 <span className="log__badge log__badge--q">Q</span>
//                 <p className="log__text">{turn.question}</p>
//               </div>
//             )}
//             <div className="log__row log__row--answer">
//               <span className="log__badge log__badge--a">A</span>
//               <p className="log__text">{turn.answer}</p>
//             </div>
//           </div>
//         ))}
//         <div ref={feedEndRef} />
//       </div>

//       {/* ── Pending screenshot preview, if one's been captured but not sent yet ──
//           Small inline chip — NOT the full-size feed thumbnail — so it doesn't
//           crowd the scrollable answer area above it in a compact window. */}
//       {capturedImage && (
//         <div className="screenshot-preview">
//           <img className="screenshot-preview__thumb" src={capturedImage} alt="Preview — not sent yet" />
//           <span className="screenshot-preview__label">Screenshot ready to send</span>
//           <button className="link-btn" onClick={clearCapture} disabled={isScreenshotSending}>
//             Discard
//           </button>
//         </div>
//       )}

//       {/* ── Single input + three actions ────────────────────────── */}
//       <div className="composer">
//         <textarea
//           className="composer__input"
//           placeholder={
//             capturedImage
//               ? 'Optional question about this screenshot… (or just send)'
//               : "Type a question, or use the buttons for voice/screenshot…"
//           }
//           value={draft}
//           onChange={(e) => setDraft(e.target.value)}
//           onKeyDown={handleKeyDown}
//           rows={2}
//         />
//         <div className="composer__actions">
//           <button className="composer__send" onClick={handleSendText} disabled={isTextSending || !draft.trim()}>
//             {isTextSending ? <span className="respond-btn__spinner" aria-hidden="true" /> : 'Send'}
//           </button>
//         </div>
//       </div>

//       <div className="action-bar action-bar--split">
//         <button
//           className="respond-btn"
//           onClick={onGetAnswer}
//           disabled={isVoiceProcessing || !isListening}
//         >
//           {isVoiceProcessing && <span className="respond-btn__spinner" aria-hidden="true" />}
//           {isVoiceProcessing ? 'Generating…' : noQuestionFlash ? 'No new question yet' : 'Get Answer'}
//         </button>
//         <button
//           className="respond-btn respond-btn--secondary"
//           onClick={handleScreenshotClick}
//           disabled={isCapturing || isScreenshotSending}
//         >
//           {(isCapturing || isScreenshotSending) && <span className="respond-btn__spinner" aria-hidden="true" />}
//           {isCapturing
//             ? 'Capturing…'
//             : isScreenshotSending
//             ? 'Analyzing…'
//             : capturedImage
//             ? 'Send Screenshot'
//             : 'Screenshot'}
//         </button>
//       </div>
//     </div>
//   );
// }

// #########################################################
// #########################################################
// #########################################################

/**
 * FILE: frontend/src/components/assistant/UnifiedAssistant.jsx
 * PURPOSE: ONE chat feed for all three input modes — voice, typed text,
 * and screenshots all land in the same continuous timeline, sorted by
 * time.
 *
 * SCREENSHOT BEHAVIOR (this revision): clicking "Screenshot" is now ONE
 * atomic action — capture, send, get answer — no intermediate preview/
 * confirm step. Whatever's currently typed in the composer at the
 * moment you click is used as an optional caption; nothing needs to be
 * typed. This matches voice's "Get Answer" and text's "Send" — every
 * action in this UI is now a single click/action producing a result,
 * with no multi-step confirmation anywhere.
 *
 * NOTE ON BACKEND: voice/text/screenshot all write into ONE shared
 * Conversation per app session (see App.jsx/useSystemAudio.js — the id
 * comes from voice's WS connection and is passed down as
 * sharedConversationId). Each entry keeps a `source` tag so it's clear
 * which channel produced it.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTextChat } from '../../hooks/useTextChat';
import { useScreenshotAnswer } from '../../hooks/useScreenshotAnswer';
import FormattedAnswer from '../../utils/formatAnswer';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

const SOURCE_LABEL = { voice: 'Voice', text: 'Chat', screenshot: 'Screenshot' };

export default function UnifiedAssistant({
  getAccessToken,
  sharedConversationId,
  // Voice pieces — voice's hook lives in App.jsx (must stay always-mounted
  // for "always listening" to keep working regardless of what's on screen).
  voiceTranscript,
  voiceConversation,
  isListening,
  isVoiceProcessing,
  onGetAnswer,
  noQuestionFlash,
}) {
  const { messages: textMessages, isSending: isTextSending, error: textError, sendMessage } =
    useTextChat({ getAccessToken, sharedConversationId });

  const {
    entries: screenshotEntries,
    isWorking: isScreenshotWorking,
    error: screenshotError,
    captureAndAnswer,
  } = useScreenshotAnswer({ getAccessToken, sharedConversationId });

  const [draft, setDraft] = useState('');
  const feedEndRef = useRef(null);

  // ── Merge all three sources into one chronological timeline ────
  const timeline = useMemo(() => {
    const voiceTurns = voiceConversation.map((t) => ({ ...t, source: 'voice' }));
    const textTurns = textMessages.map((t) => ({ ...t, source: 'text' }));
    const screenshotTurns = screenshotEntries.map((t) => ({ ...t, source: 'screenshot' }));
    return [...voiceTurns, ...textTurns, ...screenshotTurns].sort((a, b) => a.timestamp - b.timestamp);
  }, [voiceConversation, textMessages, screenshotEntries]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [timeline.length]);

  const handleSendText = () => {
    if (!draft.trim() || isTextSending) return;
    sendMessage(draft);
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleScreenshotClick = async () => {
    const ok = await captureAndAnswer(draft);
    if (ok) setDraft('');
  };

  const error = textError || screenshotError;
  const isAnyBusy = isTextSending || isScreenshotWorking;

  return (
    <div className="panel">
      {error && <div className="banner banner--error">{error}</div>}

      {/* Live transcript strip — always visible, shows what's currently
          being heard even before "Get Answer" is clicked. */}
      <div className="live-transcript">
        <span className="live-transcript__eyebrow">Live transcript</span>
        <p className="live-transcript__text">{voiceTranscript || 'Waiting for speech…'}</p>
      </div>

      {/* ── One merged feed ─────────────────────────────────────── */}
      <div className="log">
        {timeline.length === 0 && (
          <div className="log__empty">
            Talk, type, or capture a screenshot — everything shows up here.
          </div>
        )}
        {timeline.map((turn) => (
          <div key={turn.id} className="log__turn">
            <div className="log__meta">
              <span className={`log__source log__source--${turn.source}`}>
                {SOURCE_LABEL[turn.source]}
              </span>
              <span className="log__time">{formatTime(turn.timestamp)}</span>
            </div>
            {turn.image && <img className="screenshot-thumb" src={turn.image} alt="Captured screenshot" />}
            {turn.question && (
              <div className="log__row log__row--question">
                <span className="log__badge log__badge--q">Q</span>
                <p className="log__text">{turn.question}</p>
              </div>
            )}
            <div className="log__row log__row--answer">
              <span className="log__badge log__badge--a">A</span>
              <FormattedAnswer text={turn.answer} />
            </div>
          </div>
        ))}
        <div ref={feedEndRef} />
      </div>

      {/* ── Single input + Send (text only — screenshot is a separate
          one-click action below, not routed through this box) ────── */}
      <div className="composer">
        <textarea
          className="composer__input"
          placeholder="Type a question, or use Get Answer / Screenshot below…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <div className="composer__actions">
          <button className="composer__send" onClick={handleSendText} disabled={isAnyBusy || !draft.trim()}>
            {isTextSending ? <span className="respond-btn__spinner" aria-hidden="true" /> : 'Send'}
          </button>
        </div>
      </div>

      <div className="action-bar action-bar--split">
        <button
          className="respond-btn"
          onClick={onGetAnswer}
          disabled={isVoiceProcessing || !isListening || isAnyBusy}
        >
          {isVoiceProcessing && <span className="respond-btn__spinner" aria-hidden="true" />}
          {isVoiceProcessing ? 'Generating…' : noQuestionFlash ? 'No new question yet' : 'Get Answer'}
        </button>
        <button
          className="respond-btn respond-btn--secondary"
          onClick={handleScreenshotClick}
          disabled={isScreenshotWorking || isTextSending}
        >
          {isScreenshotWorking && <span className="respond-btn__spinner" aria-hidden="true" />}
          {isScreenshotWorking ? 'Capturing & analyzing…' : 'Screenshot'}
        </button>
      </div>
    </div>
  );
}