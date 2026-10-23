/**
 * FILE: frontend/src/components/history/HistoryPanel.jsx
 * PURPOSE: Phase 7 history UI — list past conversations (all three modes,
 * filterable), click into one to see the full thread.
 */

import { useEffect, useState } from 'react';
import { useConversations } from '../../hooks/useConversations';
import FormattedAnswer from '../../utils/formatAnswer';

function formatDate(ts) {
  return new Date(ts).toLocaleString([], { hour12: false });
}

const MODE_LABEL = { voice: 'Voice', text: 'Chat', screenshot: 'Screenshot' };

export default function HistoryPanel({ getAccessToken }) {
  const { conversations, selected, isLoading, error, fetchList, openConversation, closeConversation } =
    useConversations({ getAccessToken });
  const [modeFilter, setModeFilter] = useState('');

  useEffect(() => {
    fetchList(modeFilter || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeFilter]);

  if (selected) {
    return (
      <div className="panel">
        <button className="link-btn" onClick={closeConversation}>
          ← Back to history
        </button>
        <div className="log">
          {selected.messages.map((m) => (
            <div key={m.id} className="log__turn">
              <div className="log__meta">
                <span className="log__time">{formatDate(m.createdAt)}</span>
              </div>
              <div className="log__row log__row--question">
                <span className="log__badge log__badge--q">Q</span>
                <p className="log__text">{m.question}</p>
              </div>
              <div className="log__row log__row--answer">
                <span className="log__badge log__badge--a">A</span>
                <FormattedAnswer text={m.answer} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      {error && <div className="banner banner--error">{error}</div>}

      <div className="history-filters">
        {['', 'voice', 'text', 'screenshot'].map((m) => (
          <button
            key={m || 'all'}
            className={`filter-chip ${modeFilter === m ? 'filter-chip--active' : ''}`}
            onClick={() => setModeFilter(m)}
          >
            {m ? MODE_LABEL[m] : 'All'}
          </button>
        ))}
      </div>

      <div className="history-list">
        {!isLoading && conversations.length === 0 && (
          <div className="log__empty">No conversations yet.</div>
        )}
        {conversations.map((c) => (
          <button key={c.id} className="history-item" onClick={() => openConversation(c.id)}>
            <span className={`history-item__mode history-item__mode--${c.mode}`}>
              {MODE_LABEL[c.mode] || c.mode}
            </span>
            <span className="history-item__preview">{c.preview || '(no messages)'}</span>
            <span className="history-item__date">{formatDate(c.startedAt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}