import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredToken, storeToken } from '../api/client';
import { getSocket } from '../api/socket';

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
    storeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) return null;
    try {
      const { user: fresh } = await api.me();
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
    register: async (fields) => applySession(await api.register(fields)),
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
