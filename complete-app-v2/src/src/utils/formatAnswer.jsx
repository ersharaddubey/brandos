/**
 * FILE: frontend/src/utils/formatAnswer.jsx
 * PURPOSE: Lightweight answer renderer — no markdown library. Splits an
 * AI answer on ``` code fences: normal text renders as plain paragraphs,
 * code renders in a dark, professional code block (header bar with
 * language tag + copy button, monospace body, left-aligned, scrolls only
 * when actually needed).
 */

import { useState } from 'react';

function splitAnswerIntoSegments(answer) {
  if (!answer) return [];

  const parts = answer.split('```');
  return parts
    .map((part, i) => {
      if (i % 2 === 1) {
        const firstNewline = part.indexOf('\n');
        const firstLine = firstNewline === -1 ? part : part.slice(0, firstNewline);
        const isLangTag = firstLine.length > 0 && firstLine.length < 20 && !firstLine.includes(' ');
        const lang = isLangTag ? firstLine.trim() : '';
        const code = isLangTag && firstNewline !== -1 ? part.slice(firstNewline + 1) : part;
        return { type: 'code', content: code.replace(/\n$/, ''), lang };
      }
      return { type: 'text', content: part };
    })
    .filter((seg) => seg.content.trim().length > 0);
}

function CodeBlock({ content, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore, not critical
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        margin: '4px 0',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: '#2b2b30',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span
          style={{
            fontFamily: "'Consolas','Monaco','Courier New',monospace",
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'lowercase',
          }}
        >
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: copied ? '#4ade80' : 'rgba(255,255,255,0.5)',
            padding: '2px 6px',
            fontFamily: 'inherit',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Code body */}
      <pre
        style={{
          margin: 0,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'auto',
          whiteSpace: 'pre',
          textAlign: 'left',
          background: '#1a1a1e',
          padding: '14px 16px',
        }}
      >
        <code
          style={{
            display: 'block',
            textAlign: 'left',
            fontFamily: "'Consolas','Monaco','Courier New',monospace",
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: '#e4e4e7',
          }}
        >
          {content}
        </code>
      </pre>
    </div>
  );
}

export default function FormattedAnswer({ text }) {
  const segments = splitAnswerIntoSegments(text);

  if (segments.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        minWidth: 0,
        flex: '1 1 auto',
      }}
    >
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <CodeBlock key={i} content={seg.content} lang={seg.lang} />
        ) : (
          <p key={i} className="log__text" style={{ margin: 0 }}>
            {seg.content.trim()}
          </p>
        )
      )}
    </div>
  );
}