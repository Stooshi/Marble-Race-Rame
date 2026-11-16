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

/** Leaves out empty filters. */
const clean = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v != null && String(v).trim() !== '').map(([k, v]) => [k, String(v).trim()]));

/** Saves a CSV answer (an export) as a file. */
export async function saveCsv(res, filename) {
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const adminApi = {
  // Step 1: the admin's own password (a player login, kept only in memory). Step 2: the code.
  login: (login, password) => request('/auth/login', { method: 'POST', body: { login, password }, token: null }),
  start: (playerToken) => request('/admin/session/start', { method: 'POST', token: playerToken }),
  verify: (playerToken, code) => request('/admin/session/verify', { method: 'POST', body: { code }, token: playerToken }),
  end: () => request('/admin/session/end', { method: 'POST' }),
  session: () => request('/admin/session'),

  dashboard: (period) => request(`/admin/dashboard?period=${encodeURIComponent(period)}`),
  players: (q) => request(`/admin/players?q=${encodeURIComponent(q ?? '')}`),
  staff: (id, staff, reason) => request(`/admin/players/${id}/staff`, { method: 'POST', body: { staff, reason } }),
  player: (id) => request(`/admin/players/${id}`),
  // The Security tab: IP addresses; the server writes each opening to the audit log.
  security: (id) => request(`/admin/players/${id}/security`),
  coins: (id, amount, reason) => request(`/admin/players/${id}/coins`, { method: 'POST', body: { amount, reason } }),
  item: (id, item, action, reason) => request(`/admin/players/${id}/items`, { method: 'POST', body: { item, action, reason } }),
  suspend: (id, on, reason) => request(`/admin/players/${id}/${on ? 'suspend' : 'unsuspend'}`, { method: 'POST', body: { reason } }),
  name: (id, displayName, reason) => request(`/admin/players/${id}/name`, { method: 'POST', body: { display_name: displayName, reason } }),
  deleteAccount: (id, reason) => request(`/admin/players/${id}/delete`, { method: 'POST', body: { reason } }),
  consentOff: (id, reason) => request(`/admin/players/${id}/consent`, { method: 'POST', body: { consent: false, reason } }),
  payments: (q) => request(`/admin/payments?q=${encodeURIComponent(q ?? '')}`),
  readiness: (days) => request(`/admin/readiness?days=${days}`),
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
  // CRM phase 1–2 (16 Nov 2026): the audit log with filters, admins and roles (owners), billing (finance, owners).
  auditLog: (f = {}) => request(`/admin/audit?${new URLSearchParams({ limit: '300', ...clean(f) })}`),
  auditCsv: (f, reason) => request(`/admin/audit?${new URLSearchParams({ ...clean(f), format: 'csv', reason })}`, { raw: true }),
  admins: () => request('/admin/admins'),
  addAdmin: (login, role, reason) => request('/admin/admins', { method: 'POST', body: { login, role, reason } }),
  setAdminRole: (id, role, reason) => request(`/admin/admins/${id}/role`, { method: 'POST', body: { role, reason } }),
  removeAdmin: (id, reason) => request(`/admin/admins/${id}/remove`, { method: 'POST', body: { reason } }),
  // Email templates (CRM phase 5): edit, preview, publish, test-send to your own address.
  emailTemplates: () => request('/admin/emails/templates'),
  emailTemplate: (kind) => request(`/admin/emails/templates/${kind}`),
  previewTemplate: (kind, t) => request(`/admin/emails/templates/${kind}/preview`, { method: 'POST', body: t }),
  saveTemplate: (kind, t) => request(`/admin/emails/templates/${kind}`, { method: 'POST', body: t }),
  publishTemplate: (kind, version, reason) => request(`/admin/emails/templates/${kind}/${version}/publish`, { method: 'POST', body: { reason } }),
  unpublishTemplate: (kind, reason) => request(`/admin/emails/templates/${kind}/unpublish`, { method: 'POST', body: { reason } }),
  testTemplate: (kind, t) => request(`/admin/emails/templates/${kind}/test`, { method: 'POST', body: t }),
  // Support (CRM phase 4): views, stages, assignment, saved replies.
  supportList: (f = {}) => request(`/admin/support?${new URLSearchParams(clean(f))}`),
  supportStage: (id, stage, reason) => request(`/admin/support/${id}/stage`, { method: 'POST', body: { stage, ...(reason && { reason }) } }),
  supportAssign: (id, adminId) => request(`/admin/support/${id}/assign`, { method: 'POST', body: { adminId } }),
  supportAssignees: () => request('/admin/support-assignees'),
  savedReplies: () => request('/admin/support-replies'),
  saveSavedReply: (id, title, body) => request(id ? `/admin/support-replies/${id}` : '/admin/support-replies', { method: 'POST', body: { title, body } }),
  archiveSavedReply: (id) => request(`/admin/support-replies/${id}/archive`, { method: 'POST' }),
  // Marketing (CRM phase 6; sending off unless MARKETING_SENDING=on).
  marketingStatus: () => request('/admin/marketing/status'),
  newsletters: () => request('/admin/marketing/newsletters'),
  newsletter: (id) => request(`/admin/marketing/newsletters/${id}`),
  saveNewsletter: (n) => request('/admin/marketing/newsletters', { method: 'POST', body: n }),
  previewNewsletter: (t) => request('/admin/marketing/preview', { method: 'POST', body: t }),
  newsletterReach: (segment) => request('/admin/marketing/reach', { method: 'POST', body: { segment } }),
  testNewsletter: (t) => request('/admin/marketing/test', { method: 'POST', body: t }),
  sendNewsletter: (id, reason) => request(`/admin/marketing/newsletters/${id}/send`, { method: 'POST', body: { reason } }),
  billingDocuments: (f = {}) => request(`/admin/billing/documents?${new URLSearchParams(clean(f))}`),
  billingDocument: (number) => request(`/admin/billing/documents/${encodeURIComponent(number)}`),
  billingSummary: (month) => request(`/admin/billing/summary?month=${encodeURIComponent(month)}`),
  billingCsv: (month, file, reason) => request(`/admin/billing/export?${new URLSearchParams({ month, file, reason })}`, { raw: true }),
  consentsCsv: (reason) => request(`/admin/consents?format=csv&reason=${encodeURIComponent(reason)}`, { raw: true }),
};
