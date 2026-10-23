/**
 * FILE: frontend/src/hooks/useConversations.js
 * PURPOSE: Wraps GET /api/conversations (list) and GET /api/conversations/:id
 * (single thread) — Phase 7's history endpoints.
 */

import { useCallback, useState } from 'react';

const API_BASE = 'http://localhost:3000/api/conversations';

export function useConversations({ getAccessToken }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null); // { conversation, messages }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchList = useCallback(
    async (mode) => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const query = mode ? `?mode=${encodeURIComponent(mode)}` : '';
        const res = await fetch(`${API_BASE}${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load history');
        }
        setConversations(data.conversations);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [getAccessToken]
  );

  const openConversation = useCallback(
    async (id) => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load conversation');
        }
        setSelected(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [getAccessToken]
  );

  const closeConversation = useCallback(() => setSelected(null), []);

  return { conversations, selected, isLoading, error, fetchList, openConversation, closeConversation };
}