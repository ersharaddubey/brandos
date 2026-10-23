/**
 * FILE: frontend/src/components/chat/TextChatInput.jsx
 * PURPOSE: Text-paste chat mode UI. Reuses the same .log/.log__row/
 * .log__badge classes as the voice panel for visual consistency —
 * deliberately not a separate "chat bubble" style, same reasoning as the
 * original transcript-log redesign (see App.css header comment).
 */

import { useState } from 'react';
import { useTextChat } from '../../hooks/useTextChat';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

export default function TextChatInput({ getAccessToken }) {
  const { messages, isSending, error, sendMessage } = useTextChat({ getAccessToken });
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    if (!draft.trim() || isSending) return;
    sendMessage(draft);
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="panel">
      {error && <div className="banner banner--error">{error}</div>}

      <div className="log">
        {messages.length === 0 && (
          <div className="log__empty">Paste or type a customer question to get started.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="log__turn">
            <div className="log__meta">
              <span className="log__time">{formatTime(m.timestamp)}</span>
            </div>
            <div className="log__row log__row--question">
              <span className="log__badge log__badge--q">Q</span>
              <p className="log__text">{m.question}</p>
            </div>
            <div className="log__row log__row--answer">
              <span className="log__badge log__badge--a">A</span>
              <p className="log__text">{m.answer}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="composer">
        <textarea
          className="composer__input"
          placeholder="Type or paste the customer's question…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button className="composer__send" onClick={handleSend} disabled={isSending || !draft.trim()}>
          {isSending ? <span className="respond-btn__spinner" aria-hidden="true" /> : 'Send'}
        </button>
      </div>
    </div>
  );
}