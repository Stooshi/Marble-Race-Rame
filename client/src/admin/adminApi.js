// The back office's calls to the server. The admin session token lives only in
// this tab (sessionStorage): closing the tab logs out. Every call is checked on
// the server (admin account, 2-step login, used in the last 30 minutes).
import { API_URL } from '../api/client';

const KEY = 'marble-admin-session';

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}
export function setSession(s) {
  try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY); } catch { /* (private mode) */ }
}

export class AdminError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let onExpired = () => {};
export const whenExpired = (fn) => { onExpired = fn; };

async function request(path, { method = 'GET', body, token = getSession()?.token, raw = false } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AdminError(0, `Can't reach the server at ${API_URL}`);
  }
  if (raw && res.ok) return res;
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path.startsWith('/admin/') && !path.startsWith('/admin/session/')) { setSession(null); onExpired(); }
    const details = data.details ? Object.entries(data.details).map(([k, v]) => `${k} ${v}`).join(', ') : '';
    throw new AdminError(res.status, details ? `${data.error}: ${details}` : data.error || res.statusText);
  }
  return data;
}

export const adminApi = {
  // Step 1: the admin's own password (a player login, kept only in memory). Step 2: the code.
  login: (login, password) => request('/auth/login', { method: 'POST', body: { login, password }, token: null }),
  start: (playerToken) => request('/admin/session/start', { method: 'POST', token: playerToken }),
  verify: (playerToken, code) => request('/admin/session/verify', { method: 'POST', body: { code }, token: playerToken }),
  end: () => request('/admin/session/end', { method: 'POST' }),
  session: () => request('/admin/session'),

  players: (q) => request(`/admin/players?q=${encodeURIComponent(q ?? '')}`),
  player: (id) => request(`/admin/players/${id}`),
  coins: (id, amount, reason) => request(`/admin/players/${id}/coins`, { method: 'POST', body: { amount, reason } }),
  item: (id, item, action, reason) => request(`/admin/players/${id}/items`, { method: 'POST', body: { item, action, reason } }),
  suspend: (id, on, reason) => request(`/admin/players/${id}/${on ? 'suspend' : 'unsuspend'}`, { method: 'POST', body: { reason } }),
  name: (id, displayName, reason) => request(`/admin/players/${id}/name`, { method: 'POST', body: { display_name: displayName, reason } }),
  consentOff: (id, reason) => request(`/admin/players/${id}/consent`, { method: 'POST', body: { consent: false, reason } }),
  audit: () => request('/admin/audit?limit=300'),
  economy: (days) => request(`/admin/economy?days=${days}`),
  consents: () => request('/admin/consents'),
  consentsCsv: (reason) => request(`/admin/consents?format=csv&reason=${encodeURIComponent(reason)}`, { raw: true }),
};
