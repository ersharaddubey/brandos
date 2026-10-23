/**
 * FILE: frontend/src/hooks/useTextChat.js
 * PURPOSE: Wraps POST /api/ai/text.
 *
 * SINGLE SHARED CONVERSATION: accepts `sharedConversationId` — the one
 * Conversation voice mode created for this app session (see App.jsx /
 * useSystemAudio.js). Once that arrives, every send here uses it, so
 * text turns land in the SAME conversation as voice/screenshot turns.
 * Before it arrives (a brief window right after login, or if voice
 * failed to connect for some reason), falls back to a locally-created
 * conversation so typing still works — matches ai.routes.js's fallback
 * behavior on the server side.
 */

import { useCallback, useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3000/api/ai';

export function useTextChat({ getAccessToken, sharedConversationId = null }) {
  const [localConversationId, setLocalConversationId] = useState(null);
  const [messages, setMessages] = useState([]); // {id, question, answer, provider, model, timestamp}
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  // Adopt the shared id once it's available, as long as this hook hasn't
  // already started its own thread (rare fallback case above).
  useEffect(() => {
    if (sharedConversationId && !localConversationId) {
      setLocalConversationId(sharedConversationId);
    }
  }, [sharedConversationId, localConversationId]);

  const activeConversationId = sharedConversationId || localConversationId;

  const sendMessage = useCallback(
    async (question) => {
      if (!question || !question.trim()) return;

      setIsSending(true);
      setError(null);

      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            question: question.trim(),
            conversationId: activeConversationId || undefined,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !data.success) {
          throw new Error((data && data.error) || `Request failed (${res.status})`);
        }

        if (!activeConversationId) setLocalConversationId(data.conversationId);

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            question: data.question,
            answer: data.answer,
            provider: data.provider,
            model: data.model,
            timestamp: Date.now(),
          },
        ]);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsSending(false);
      }
    },
    [activeConversationId, getAccessToken]
  );

  const reset = useCallback(() => {
    setLocalConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isSending,
    error,
    sendMessage,
    conversationId: activeConversationId,
    reset,
  };
}