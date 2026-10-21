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
  deleteAccount: (id, reason) => request(`/admin/players/${id}/delete`, { method: 'POST', body: { reason } }),
  consentOff: (id, reason) => request(`/admin/players/${id}/consent`, { method: 'POST', body: { consent: false, reason } }),
  payments: (q) => request(`/admin/payments?q=${encodeURIComponent(q ?? '')}`),
  refund: (id, reason, amountCents) => request(`/admin/payments/${id}/refund`, { method: 'POST', body: { reason, ...(amountCents && { amount_cents: amountCents }) } }),
  audit: () => request('/admin/audit?limit=300'),
  economy: (days) => request(`/admin/economy?days=${days}`),
  consents: () => request('/admin/consents'),
  // The support inbox (the Help Centre's contact form).
  support: ({ q = '', status = '', category = '' } = {}) => request(`/admin/support?${new URLSearchParams({ q, status, category })}`),
  supportMessage: (id) => request(`/admin/support/${id}`),
  supportScreenshot: async (id) => (await request(`/admin/support/${id}/screenshot`, { raw: true })).blob(),
  supportStatus: (id, status, reason) => request(`/admin/support/${id}/status`, { method: 'POST', body: { status, ...(reason && { reason }) } }),
  supportReply: (id, text) => request(`/admin/support/${id}/reply`, { method: 'POST', body: { text } }),
  // Reported player names, and names the filter would block.
  nameReports: () => request('/admin/name-reports'),
  resolveName: (userId, action, reason) => request(`/admin/name-reports/${userId}/resolve`, { method: 'POST', body: { action, reason } }),
  // Gift codes (creators, campaigns, giveaways).
  giftCodes: ({ q = '', tag = '' } = {}) => request(`/admin/gift-codes?${new URLSearchParams({ q, tag })}`),
  giftCode: (id) => request(`/admin/gift-codes/${id}`),
  makeGiftCodes: (body) => request('/admin/gift-codes', { method: 'POST', body }),
  disableGiftCode: (id, reason) => request(`/admin/gift-codes/${id}/disable`, { method: 'POST', body: { reason } }),
  consentsCsv: (reason) => request(`/admin/consents?format=csv&reason=${encodeURIComponent(reason)}`, { raw: true }),
};
