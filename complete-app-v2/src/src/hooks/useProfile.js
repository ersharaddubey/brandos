/**
 * FILE: frontend/src/hooks/useProfile.js
 * PURPOSE: Wraps GET/PUT /api/profile — tech profile (introduction,
 * experience, stack, projects) that feeds AI prompt context across all
 * modes. Same ownership pattern as usePlan.js — call once at App.jsx
 * level, pass down as props.
 */

import { useCallback, useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3000/api/profile';

const EMPTY_PROFILE = {
  introduction: '',
  experienceLevel: '',
  totalExperience: '',
  languages: [],
  frontend: [],
  databases: [],
  projects: [],
  remarks: '',
};

export function useProfile({ getAccessToken, isAuthenticated }) {
  const [techProfile, setTechProfile] = useState(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      const token = await getAccessToken();
      const res = await fetch(API_BASE, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setTechProfile({ ...EMPTY_PROFILE, ...data.techProfile });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, isAuthenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(
    async (updatedProfile) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/tech`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(updatedProfile),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `Save failed (${res.status})`);
        }

        setTechProfile({ ...EMPTY_PROFILE, ...data.techProfile });
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [getAccessToken]
  );

  return { techProfile, isLoading, isSubmitting, error, saveProfile, refetch: fetchProfile };
}