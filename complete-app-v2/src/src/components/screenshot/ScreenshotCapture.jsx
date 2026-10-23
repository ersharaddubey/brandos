/**
 * FILE: frontend/src/components/screenshot/ScreenshotCapture.jsx
 * PURPOSE: Screenshot mode UI — capture via Electron's desktopCapturer
 * (Phase 13 Step 1), preview, optional question, submit.
 */

import { useState } from 'react';
import { useScreenshotAnswer } from '../../hooks/useScreenshotAnswer';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

export default function ScreenshotCapture({ getAccessToken }) {
  const { entries, capturedImage, isCapturing, isSending, error, capture, clearCapture, send } =
    useScreenshotAnswer({ getAccessToken });
  const [question, setQuestion] = useState('');

  const handleSend = () => {
    send(question);
    setQuestion('');
  };

  return (
    <div className="panel">
      {error && <div className="banner banner--error">{error}</div>}

      <div className="log">
        {entries.length === 0 && !capturedImage && (
          <div className="log__empty">Capture a screenshot to get started.</div>
        )}
        {entries.map((e) => (
          <div key={e.id} className="log__turn">
            <div className="log__meta">
              <span className="log__time">{formatTime(e.timestamp)}</span>
            </div>
            <img className="screenshot-thumb" src={e.image} alt="Captured screenshot" />
            {e.question && (
              <div className="log__row log__row--question">
                <span className="log__badge log__badge--q">Q</span>
                <p className="log__text">{e.question}</p>
              </div>
            )}
            <div className="log__row log__row--answer">
              <span className="log__badge log__badge--a">A</span>
              <p className="log__text">{e.answer}</p>
            </div>
          </div>
        ))}
      </div>

      {capturedImage && (
        <div className="screenshot-preview">
          <img className="screenshot-thumb" src={capturedImage} alt="Preview" />
          <div className="composer">
            <input
              className="composer__input composer__input--single"
              placeholder="Optional question about this image…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="composer__send" onClick={handleSend} disabled={isSending}>
              {isSending ? <span className="respond-btn__spinner" aria-hidden="true" /> : 'Analyze'}
            </button>
          </div>
          <button className="link-btn" onClick={clearCapture} disabled={isSending}>
            Discard
          </button>
        </div>
      )}

      {!capturedImage && (
        <div className="action-bar">
          <button className="respond-btn" onClick={capture} disabled={isCapturing}>
            {isCapturing && <span className="respond-btn__spinner" aria-hidden="true" />}
            {isCapturing ? 'Capturing…' : 'Capture Screenshot'}
          </button>
        </div>
      )}
    </div>
  );
}