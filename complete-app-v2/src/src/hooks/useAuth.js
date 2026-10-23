// /**
//  * FILE: frontend/src/hooks/useAuth.js
//  * PURPOSE: Authentication hook with login, register, refresh, auto-login
//  */

// import { useState, useEffect, useCallback } from 'react';

// const API_URL = 'http://localhost:3000/api/auth';

// export function useAuth() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [accessToken, setAccessToken] = useState(null);
//   const [refreshToken, setRefreshToken] = useState(null);

//   // ── Check if already logged in ──────────────────────────────────
//   const checkAuth = useCallback(async () => {
//     try {
//       setIsLoading(true);

//       if (window.electronAPI) {
//         const tokenResult = await window.electronAPI.authGetTokens();

//         if (tokenResult.success && tokenResult.accessToken) {
//           setAccessToken(tokenResult.accessToken);
//           setRefreshToken(tokenResult.refreshToken);

//           const meResponse = await fetch(`${API_URL}/me`, {
//             headers: {
//               'Authorization': `Bearer ${tokenResult.accessToken}`,
//             },
//           });

//           if (meResponse.ok) {
//             const meData = await meResponse.json();
//             setUser(meData.user);
//             setIsAuthenticated(true);
//             setIsLoading(false);
//             return;
//           } else {
//             await refreshAccessToken();
//             return;
//           }
//         }
//       }

//       setIsLoading(false);
//     } catch (err) {
//       console.error('❌ Auth check failed:', err.message);
//       setIsLoading(false);
//     }
//   }, []);

//   // ── Refresh access token ──────────────────────────────────────
//   const refreshAccessToken = useCallback(async () => {
//     try {
//       const storedRefreshToken = refreshToken || (await window.electronAPI.authGetTokens()).refreshToken;

//       if (!storedRefreshToken) {
//         console.warn('⚠️ No refresh token available');
//         return false;
//       }

//       const response = await fetch(`${API_URL}/refresh`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ refreshToken: storedRefreshToken }),
//       });

//       if (response.ok) {
//         const data = await response.json();
//         setAccessToken(data.accessToken);
//         setRefreshToken(data.refreshToken);

//         if (window.electronAPI) {
//           await window.electronAPI.authStoreTokens(data.accessToken, data.refreshToken);
//         }

//         const meResponse = await fetch(`${API_URL}/me`, {
//           headers: {
//             'Authorization': `Bearer ${data.accessToken}`,
//           },
//         });

//         if (meResponse.ok) {
//           const meData = await meResponse.json();
//           setUser(meData.user);
//           setIsAuthenticated(true);
//           return true;
//         }
//       }

//       await logout();
//       return false;

//     } catch (err) {
//       console.error('❌ Refresh failed:', err.message);
//       await logout();
//       return false;
//     }
//   }, [refreshToken]);

//   // ── Login ──────────────────────────────────────────────────────
//   const login = useCallback(async (email, password) => {
//     try {
//       setIsLoading(true);

//       const response = await fetch(`${API_URL}/login`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email, password }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || 'Login failed');
//       }

//       setUser(data.user);
//       setAccessToken(data.accessToken);
//       setRefreshToken(data.refreshToken);
//       setIsAuthenticated(true);

//       if (window.electronAPI) {
//         await window.electronAPI.authStoreTokens(data.accessToken, data.refreshToken);
//       }

//       setIsLoading(false);
//       return { success: true, user: data.user };

//     } catch (err) {
//       setIsLoading(false);
//       return { success: false, error: err.message };
//     }
//   }, []);

//   // ── Register ───────────────────────────────────────────────────
//   const register = useCallback(async (email, password, name) => {
//     try {
//       setIsLoading(true);

//       const response = await fetch(`${API_URL}/register`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email, password, name }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || 'Registration failed');
//       }

//       setUser(data.user);
//       setAccessToken(data.accessToken);
//       setRefreshToken(data.refreshToken);
//       setIsAuthenticated(true);

//       if (window.electronAPI) {
//         await window.electronAPI.authStoreTokens(data.accessToken, data.refreshToken);
//       }

//       setIsLoading(false);
//       return { success: true, user: data.user };

//     } catch (err) {
//       setIsLoading(false);
//       return { success: false, error: err.message };
//     }
//   }, []);

//   // ── Logout ─────────────────────────────────────────────────────
//   const logout = useCallback(async () => {
//     try {
//       if (refreshToken) {
//         await fetch(`${API_URL}/logout`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ refreshToken }),
//         });
//       }

//       setUser(null);
//       setAccessToken(null);
//       setRefreshToken(null);
//       setIsAuthenticated(false);

//       if (window.electronAPI) {
//         await window.electronAPI.authClearTokens();
//       }

//     } catch (err) {
//       console.error('❌ Logout error:', err.message);
//     }
//   }, [refreshToken]);

//   // ── Auto-login on mount ──────────────────────────────────────
//   useEffect(() => {
//     checkAuth();
//   }, [checkAuth]);

//   return {
//     user,
//     isLoading,
//     isAuthenticated,
//     accessToken,
//     login,
//     register,
//     logout,
//     refreshAccessToken,
//     checkAuth,
//   };
// }

// #################################################################
// #################################################################
// #################################################################

/**
 * FILE: frontend/src/hooks/useAuth.js
 * PURPOSE: Authentication hook with login, register, refresh, auto-login,
 * and PROACTIVE token refresh.
 *
 * CHANGE IN THIS REVISION: previously, refreshAccessToken() only ever ran
 * REACTIVELY — when checkAuth() found the current token invalid at app
 * launch. There was no timer refreshing the token BEFORE it expired
 * during an ongoing session. Voice mode happened to be accidentally
 * protected (systemAudioCapture.js re-reads the token fresh on every WS
 * reconnect, which happens periodically anyway), but useTextChat and
 * useScreenshotAnswer had no such mechanism — meaning Chat and Screenshot
 * would silently start failing with 401s roughly every 15-20 minutes on
 * any session that ran longer than the access token's TTL. This is now
 * fixed with a proactive refresh timer, roughly 2 minutes before the
 * token's actual expiry (ACCESS_TOKEN_EXPIRY on the server defaults to
 * 15m — this refreshes around the 13-minute mark).
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = 'http://localhost:3000/api/auth';

// Matches the server's ACCESS_TOKEN_EXPIRY default (15m) minus a safety
// margin. Refresh early so the access token never actually expires while
// the app is open — prevents silent 401s and the "auto logout" feel.
// If you change ACCESS_TOKEN_EXPIRY in server/.env, keep this a few
// minutes ahead of it.
const PROACTIVE_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Refs so the interval callback always sees the latest values without
  // needing to be torn down/recreated every time accessToken/refreshToken
  // change (which would happen on every refresh — defeating the point of
  // a stable interval).
  const refreshTokenRef = useRef(refreshToken);
  refreshTokenRef.current = refreshToken;
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  // ── Refresh access token ──────────────────────────────────────
  // const refreshAccessToken = useCallback(async () => {
  //   try {
  //     const storedRefreshToken = refreshTokenRef.current || (await window.electronAPI.authGetTokens()).refreshToken;

  //     if (!storedRefreshToken) {
  //       console.warn('⚠️ No refresh token available');
  //       return false;
  //     }

  //     const response = await fetch(`${API_URL}/refresh`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ refreshToken: storedRefreshToken }),
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       setAccessToken(data.accessToken);
  //       setRefreshToken(data.refreshToken);

  //       if (window.electronAPI) {
  //         await window.electronAPI.authStoreTokens(data.accessToken, data.refreshToken);
  //       }

  //       const meResponse = await fetch(`${API_URL}/me`, {
  //         headers: {
  //           'Authorization': `Bearer ${data.accessToken}`,
  //         },
  //       });

  //       if (meResponse.ok) {
  //         const meData = await meResponse.json();
  //         setUser(meData.user);
  //         setIsAuthenticated(true);
  //         return true;
  //       }
  //     }

  //     await logout();
  //     return false;

  //   } catch (err) {
  //     console.error('❌ Refresh failed:', err.message);
  //     await logout();
  //     return false;
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      const storedRefreshToken = refreshTokenRef.current || (await window.electronAPI.authGetTokens()).refreshToken;

      if (!storedRefreshToken) {
        console.warn('⚠️ No refresh token available');
        return false;
      }

      const response = await fetch(`${API_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        // Refresh succeeded — keep the session alive even if /me is slow
        // or temporarily fails. Never log the user out after a successful
        // token rotation.
        setIsAuthenticated(true);

        if (window.electronAPI) {
          await window.electronAPI.authStoreTokens(data.accessToken, data.refreshToken);
        }

        try {
          const meResponse = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${data.accessToken}` },
          });

          if (meResponse.ok) {
            const meData = await meResponse.json();
            setUser(meData.user);
          }
          // /me fail → keep tokens + isAuthenticated; next tick will retry
        } catch (meErr) {
          console.warn('⚠️ /me after refresh failed (keeping session):', meErr.message);
        }

        return true;
      }

      // Server ne explicitly refresh token reject kiya (401) — SIRF tab logout
      // Other status codes (5xx, 429, etc.) should NOT force logout.
      if (response.status === 401) {
        console.warn('⚠️ Refresh token rejected (401) — logging out');
        await logout();
      } else {
        console.warn(`⚠️ Refresh failed with status ${response.status} — keeping session`);
      }
      return false;

    } catch (err) {
      // Network error ya fetch hi fail ho gaya — session ke baare mein
      // kuch pata nahi chala, isliye logout MAT karo. Bas fail return karo,
      // agla proactive-timer tick phir try karega.
      console.error('❌ Refresh failed (network?):', err.message);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Check if already logged in ──────────────────────────────────
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      if (window.electronAPI) {
        const tokenResult = await window.electronAPI.authGetTokens();

        if (tokenResult.success && tokenResult.accessToken) {
          setAccessToken(tokenResult.accessToken);
          setRefreshToken(tokenResult.refreshToken);

          try {
            const meResponse = await fetch(`${API_URL}/me`, {
              headers: {
                'Authorization': `Bearer ${tokenResult.accessToken}`,
              },
            });

            if (meResponse.ok) {
              const meData = await meResponse.json();
              setUser(meData.user);
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          } catch (meErr) {
            console.warn('⚠️ /me on startup failed, trying refresh:', meErr.message);
          }

          // Access token expired/invalid — try refresh. Always clear loading
          // afterwards so the UI never gets stuck on the spinner (that looked
          // like an "auto logout").
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            // refreshAccessToken only logs out on explicit 401; otherwise
            // we stay unauthenticated and show the login screen.
            setIsAuthenticated(false);
          }
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('❌ Auth check failed:', err.message);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Login ──────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setIsAuthenticated(true);

      if (window.electronAPI) {
        await window.electronAPI.authStoreTokens(data.accessToken, data.refreshToken);
      }

      setIsLoading(false);
      return { success: true, user: data.user };

    } catch (err) {
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, []);

  // ── Register ───────────────────────────────────────────────────
  const register = useCallback(async (email, password, name) => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setUser(data.user);
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setIsAuthenticated(true);

      if (window.electronAPI) {
        await window.electronAPI.authStoreTokens(data.accessToken, data.refreshToken);
      }

      setIsLoading(false);
      return { success: true, user: data.user };

    } catch (err) {
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      if (refreshTokenRef.current) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenRef.current }),
        });
      }

      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setIsAuthenticated(false);

      if (window.electronAPI) {
        await window.electronAPI.authClearTokens();
      }

    } catch (err) {
      console.error('❌ Logout error:', err.message);
    }
  }, []);

  // ── Auto-login on mount ──────────────────────────────────────
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ── Proactive refresh timer ───────────────────────────────────
  // Runs for the lifetime of the component, checks isAuthenticatedRef
  // (not a stale closure) on each tick so it naturally does nothing while
  // logged out and picks back up after a fresh login — no need to
  // tear down/recreate the interval on every auth state change.
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticatedRef.current) {
        console.log('🔄 Proactive token refresh');
        refreshAccessToken();
      }
    }, PROACTIVE_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refreshAccessToken]);

  return {
    user,
    isLoading,
    isAuthenticated,
    accessToken,
    login,
    register,
    logout,
    refreshAccessToken,
    checkAuth,
  };
}
