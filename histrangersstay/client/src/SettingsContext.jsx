import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from './api';
import { DEFAULTS } from './config';

const Ctx = createContext({ settings: DEFAULTS, refresh: () => {} });
export const useSettings = () => useContext(Ctx);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  const refresh = useCallback(
    () => api.get('/settings').then((r) => setSettings({ ...DEFAULTS, ...r.data })).catch(() => {}),
    []
  );
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { document.title = `${settings.siteName} | ${settings.tagline}`; }, [settings.siteName, settings.tagline]);

  return <Ctx.Provider value={{ settings, refresh }}>{children}</Ctx.Provider>;
}
