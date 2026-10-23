// /**
//  * FILE: frontend/src/hooks/usePlan.js
//  * PURPOSE: Wraps GET/POST/PATCH /api/plan — status, L1 activation,
//  * provider reassignment. Owned ONCE at the App.jsx level and passed down
//  * as props to PlanActivation.jsx/PlanSettings.jsx, rather than each
//  * screen calling this independently (which would mean two separate
//  * fetches of the same data and risk of divergent state between them).
//  */

// import { useCallback, useEffect, useState } from 'react';

// const API_BASE = 'http://localhost:3000/api/plan';

// export function usePlan({ getAccessToken, isAuthenticated }) {
//   const [status, setStatus] = useState('loading'); // 'loading' | 'inactive' | 'active'
//   const [tier, setTier] = useState(null);
//   const [providerPreferences, setProviderPreferences] = useState({});
//   const [configuredProviders, setConfiguredProviders] = useState([]);
//   const [providerCapabilities, setProviderCapabilities] = useState({});
//   const [error, setError] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const fetchPlan = useCallback(async () => {
//     if (!isAuthenticated) {
//       setStatus('inactive');
//       return;
//     }
//     try {
//       const token = await getAccessToken();
//       const res = await fetch(API_BASE, { headers: { Authorization: `Bearer ${token}` } });
//       const data = await res.json().catch(() => null);

//       if (!res.ok || !data || !data.success) {
//         setStatus('inactive');
//         return;
//       }

//       setTier(data.plan.tier);
//       setStatus(data.plan.status);
//       setProviderPreferences(data.providerPreferences || {});
//       setConfiguredProviders(data.configuredProviders || []);
//       setProviderCapabilities(data.providerCapabilities || {});
//     } catch (err) {
//       setError(err.message);
//       setStatus('inactive');
//     }
//   }, [getAccessToken, isAuthenticated]);

//   useEffect(() => {
//     fetchPlan();
//   }, [fetchPlan]);

//   const activateL1 = useCallback(
//     async ({ assemblyaiKey, providers, termsAccepted }) => {
//       setIsSubmitting(true);
//       setError(null);
//       try {
//         const token = await getAccessToken();
//         const res = await fetch(`${API_BASE}/activate-l1`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//           body: JSON.stringify({ assemblyaiKey, providers, termsAccepted }),
//         });
//         const data = await res.json().catch(() => null);

//         if (!res.ok || !data || !data.success) {
//           throw new Error((data && data.error) || `Activation failed (${res.status})`);
//         }

//         await fetchPlan();
//         return true;
//       } catch (err) {
//         setError(err.message);
//         return false;
//       } finally {
//         setIsSubmitting(false);
//       }
//     },
//     [getAccessToken, fetchPlan]
//   );

//   const reassignProvider = useCallback(
//     async (mode, provider) => {
//       setError(null);
//       try {
//         const token = await getAccessToken();
//         const res = await fetch(`${API_BASE}/providers`, {
//           method: 'PATCH',
//           headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//           body: JSON.stringify({ mode, provider }),
//         });
//         const data = await res.json().catch(() => null);

//         if (!res.ok || !data || !data.success) {
//           throw new Error((data && data.error) || `Reassignment failed (${res.status})`);
//         }

//         setProviderPreferences(data.providerPreferences || {});
//         return true;
//       } catch (err) {
//         setError(err.message);
//         return false;
//       }
//     },
//     [getAccessToken]
//   );

//   return {
//     status, // 'loading' | 'inactive' | 'active'
//     tier,
//     providerPreferences,
//     configuredProviders,
//     providerCapabilities,
//     error,
//     isSubmitting,
//     isActive: status === 'active',
//     activateL1,
//     reassignProvider,
//     refetch: fetchPlan,
//   };
// }

// ##########################################################################
// ##########################################################################
// ##########################################################################

import { useCallback, useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3000/api/plan';

export function usePlan({ getAccessToken, isAuthenticated }) {
  const [status, setStatus] = useState('loading');
  const [tier, setTier] = useState(null);
  const [providerPreferences, setProviderPreferences] = useState({});
  const [configuredProviders, setConfiguredProviders] = useState([]);
  const [providerCapabilities, setProviderCapabilities] = useState({});
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingKey, setIsUpdatingKey] = useState(false); // NEW — separate loading flag for key updates

  const fetchPlan = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus('inactive');
      return;
    }
    try {
      const token = await getAccessToken();
      const res = await fetch(API_BASE, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => null);

      const defaultCaps = {
        groq: { modes: ['voice', 'text', 'screenshot'], label: 'Groq' },
        gemini: { modes: ['voice', 'text', 'screenshot'], label: 'Gemini' },
        mistral: { modes: ['voice', 'text', 'screenshot'], label: 'Mistral' },
        openai: { modes: ['voice', 'text', 'screenshot'], label: 'OpenAI' },
      };

      if (!res.ok || !data || !data.success) {
        setStatus('inactive');
        setProviderCapabilities(defaultCaps);
        return;
      }

      setTier(data.plan.tier);
      setStatus(data.plan.status);
      setProviderPreferences(data.providerPreferences || {});
      setConfiguredProviders(data.configuredProviders || []);
      setProviderCapabilities(
        data.providerCapabilities && Object.keys(data.providerCapabilities).length
          ? data.providerCapabilities
          : defaultCaps
      );
    } catch (err) {
      setError(err.message);
      setStatus('inactive');
      setProviderCapabilities({
        groq: { modes: ['voice', 'text', 'screenshot'], label: 'Groq' },
        gemini: { modes: ['voice', 'text', 'screenshot'], label: 'Gemini' },
        mistral: { modes: ['voice', 'text', 'screenshot'], label: 'Mistral' },
        openai: { modes: ['voice', 'text', 'screenshot'], label: 'OpenAI' },
      });
    }
  }, [getAccessToken, isAuthenticated]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const activateL1 = useCallback(
    async ({ assemblyaiKey, providers, termsAccepted }) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/activate-l1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ assemblyaiKey, providers, termsAccepted }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !data.success) {
          throw new Error((data && data.error) || `Activation failed (${res.status})`);
        }

        await fetchPlan();
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [getAccessToken, fetchPlan]
  );

  const reassignProvider = useCallback(
    async (mode, provider) => {
      setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/providers`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mode, provider }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !data.success) {
          throw new Error((data && data.error) || `Reassignment failed (${res.status})`);
        }

        setProviderPreferences(data.providerPreferences || {});
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [getAccessToken]
  );

  // NEW — rotate/update the stored key for a provider the user already has.
  // Returns true/false so the calling UI can clear its own input field on success.
  const updateProviderKey = useCallback(
    async (provider, key) => {
      setIsUpdatingKey(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/keys`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ provider, key }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !data.success) {
          throw new Error((data && data.error) || `Key update failed (${res.status})`);
        }

        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setIsUpdatingKey(false);
      }
    },
    [getAccessToken]
  );

  return {
    status,
    tier,
    providerPreferences,
    configuredProviders,
    providerCapabilities,
    error,
    isSubmitting,
    isUpdatingKey,       
    isActive: status === 'active',
    activateL1,
    reassignProvider,
    updateProviderKey,   
    refetch: fetchPlan,
  };
}