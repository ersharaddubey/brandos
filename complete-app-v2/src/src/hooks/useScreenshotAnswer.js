/**
 * FILE: frontend/src/hooks/useScreenshotAnswer.js
 * PURPOSE: Wraps window.electronAPI.captureScreenshot() + POST /api/ai/screenshot
 * as ONE atomic action — click once, capture happens, it's sent
 * immediately, the answer appears. No intermediate "preview + confirm"
 * step (that was the earlier design; removed per explicit feedback —
 * capturing and sending are now a single user action, matching how the
 * voice/text flows work: one click/action = one result).
 *
 * SINGLE SHARED CONVERSATION: accepts `sharedConversationId` from voice
 * mode (see App.jsx / useSystemAudio.js). Once available, every capture
 * writes into that same conversation. Falls back to a locally-created
 * one only if it hasn't arrived yet.
 */

import { useCallback, useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3000/api/ai';

export function useScreenshotAnswer({ getAccessToken, sharedConversationId = null }) {
  const [localConversationId, setLocalConversationId] = useState(null);
  const [entries, setEntries] = useState([]); // {id, image, question, answer, provider, model, timestamp}
  const [isWorking, setIsWorking] = useState(false); // covers capture AND send as one step
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sharedConversationId && !localConversationId) {
      setLocalConversationId(sharedConversationId);
    }
  }, [sharedConversationId, localConversationId]);

  const activeConversationId = sharedConversationId || localConversationId;

  /**
   * Captures the screen AND sends it for analysis in one call. `caption`
   * is optional — whatever's currently typed in the composer at the
   * moment this is triggered, if anything.
   * @returns {Promise<boolean>} true on success, false on failure (error
   *   state is already set either way — caller just needs to know
   *   whether to clear the composer draft).
   */
  const captureAndAnswer = useCallback(
    async (caption) => {
      setError(null);
      setIsWorking(true);

      try {
        if (!window.electronAPI?.captureScreenshot) {
          throw new Error('Screenshot capture is not available in this environment.');
        }

        const captureResult = await window.electronAPI.captureScreenshot();
        if (!captureResult.ok) {
          throw new Error(captureResult.message || 'Screenshot capture failed');
        }
        const image = captureResult.image;

        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            image,
            question: caption && caption.trim() ? caption.trim() : undefined,
            conversationId: activeConversationId || undefined,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data || !data.success) {
          throw new Error((data && data.error) || `Request failed (${res.status})`);
        }

        if (!activeConversationId) setLocalConversationId(data.conversationId);

        setEntries((prev) => [
          ...prev,
          {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            image,
            question: data.question,
            answer: data.answer,
            provider: data.provider,
            model: data.model,
            timestamp: Date.now(),
          },
        ]);

        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setIsWorking(false);
      }
    },
    [activeConversationId, getAccessToken]
  );

  const reset = useCallback(() => {
    setLocalConversationId(null);
    setEntries([]);
    setError(null);
  }, []);

  return {
    entries,
    isWorking,
    error,
    captureAndAnswer,
    conversationId: activeConversationId,
    reset,
  };
}