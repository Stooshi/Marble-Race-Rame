import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredToken, storeToken } from '../api/client';
import { getSocket } from '../api/socket';
import { forgetPush } from '../app/push';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const applySession = useCallback(({ token: nextToken, user: nextUser }) => {
    storeToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    // (In the apps: this phone stops getting the account's notifications; sent before the token goes.)
    forgetPush();
    storeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) return null;
    try {
      const { user: fresh, token: renewed } = await api.me();
      // A visit renews the login (the server sends a fresh token once a day): stored for the next
      // requests and visits, so a guest is only lost after 90 days away (a saved account's login lasts 180). (Not set as state: the
      // open socket and this session carry on with the old one, still valid.)
      if (renewed) storeToken(renewed);
      setUser(fresh);
      return fresh;
    } catch (err) {
      if (err.status === 401) logout();
      return null;
    }
  }, [logout]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    refreshUser().finally(() => setLoading(false));
    // Only on first load / token change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    socket: getSocket(token),
    login: async (login, password) => applySession(await api.login({ login, password })),
    register: async (fields) => { const r = await api.register(fields); applySession(r); return r; },
    /** "Play free": a guest account, so a race can start straight away. */
    playAsGuest: async () => applySession(await api.guest()),
    /** A guest saves their marble: name, email and password, keeping coins and marbles. */
    claim: async (fields) => { const r = await api.claim(fields); applySession(r); return r; },
    /** A new password from an emailed link (logs in with it). */
    resetPassword: async (resetToken, password) => applySession(await api.resetPassword(resetToken, password)),
    logout,
    refreshUser,
    setCoins: (coins) => setUser((u) => (u ? { ...u, coins } : u)),
  }), [token, user, loading, applySession, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
