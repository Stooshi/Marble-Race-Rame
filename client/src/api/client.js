import { nameLooks } from '../shared/marbles';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const TOKEN_KEY = 'marble-race-token';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — session-only login */
  }
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Thin fetch wrapper: JSON in/out, bearer token, readable errors. */
export async function request(path, { method = 'GET', body, token = getStoredToken(), signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, `Can't reach the game server at ${API_URL}. Is the backend running?`);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // (a machine-readable `code` is for the page, never shown in the message)
    const details = data.details ? Object.entries(data.details).filter(([k]) => k !== 'code').map(([k, v]) => `${k} ${v}`).join(', ') : '';
    throw new ApiError(res.status, details ? `${data.error}: ${details}` : data.error || res.statusText, data.details);
  }
  return data;
}

/** Endpoint helpers, grouped by resource. */
export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body, token: null }),
  login: (body) => request('/auth/login', { method: 'POST', body, token: null }),
  me: () => request('/auth/me'),
  suggestName: () => request('/auth/suggest-name', { token: null }),
  confirmEmail: (token) => request('/auth/confirm-email', { method: 'POST', body: { token }, token: null }),
  resendConfirmEmail: (lang) => request('/auth/confirm-email/resend', { method: 'POST', body: { lang } }),
  guest: () => request('/auth/guest', { method: 'POST', token: null }),
  claim: (body) => request('/auth/claim', { method: 'POST', body }),

  // The Help Centre's contact form: a form token first, then the message (logged in or not).
  supportForm: () => request('/support/form', { token: null }),
  sendSupport: (body) => request('/support', { method: 'POST', body }),

  user: (id) => request(`/users/${id}`),
  myProfile: () => request('/users/me'),
  cookieConsent: (body) => request('/users/me/cookie-consent', { method: 'POST', body }),
  userRaces: (id, limit = 10) => request(`/users/${id}/races?limit=${limit}`),
  trackRecords: (id) => request(`/users/${id}/track-records`),
  leaderboard: (sort = 'wins', limit = 10) => request(`/users/leaderboard?sort=${sort}&limit=${limit}`),

  marbles: () => request('/marbles'),
  myMarbles: () => request('/users/me/marbles'),
  refundNoteSeen: () => request('/users/me/refund-note/seen', { method: 'POST' }),
  purchaseMarble: (id) => request(`/marbles/${id}/purchase`, { method: 'POST' }),

  // The marble collection (Schoolyard Classics): items, bags, the Marble Bag, buying, the Shooter, certificates.
  collection: () => request('/collection'),
  bag: () => request('/collection/bag'),
  buyItem: (slug) => request(`/collection/${slug}/buy`, { method: 'POST' }),
  bags: (shade = 'classic') => request(`/collection/bags?shade=${shade}`),
  buyBag: (bag, shade = 'classic') => request(`/collection/bags/${bag}/buy`, { method: 'POST', body: { shade } }),
  setShooter: (choice) => request('/collection/shooter', { method: 'PUT', body: choice }),
  certificate: (code) => request(`/collection/certificate/${code}`),

  scoreboard: (board = 'season') => request(`/scoreboard?board=${board}`),
  // The coin economy: its numbers, your day (races, daily goal, streak), one race's coins, your coin history.
  economy: () => request('/economy'),
  economyMe: () => request('/economy/me'),
  raceCoins: (raceId) => request(`/economy/races/${raceId}`),
  coinLedger: () => request('/economy/ledger'),
  // Coin packs for real money: a web checkout, an app store receipt (site/payments picks the provider).
  paymentOptions: () => request('/payments'),
  checkout: (body) => request('/payments/checkout', { method: 'POST', body }),
  redeemReceipt: (body) => request('/payments/receipt', { method: 'POST', body }),
  // Google Play (the Android app): the player's account id to buy with, then the purchase to check.
  googleAccount: () => request('/payments/google/account'),
  googleVerify: (body) => request('/payments/google/verify', { method: 'POST', body }),
  // The App Store (the iPhone app): the player's account token to buy with, then the signed transaction to check.
  appleAccount: () => request('/payments/apple/account'),
  appleVerify: (body) => request('/payments/apple/verify', { method: 'POST', body }),
  myOrders: () => request('/payments/mine'),
  // "Report this name" (src/names on the server): where = 'scoreboard' | 'results' | 'room'.
  reportName: (userId, where, name) => request(`/users/${userId}/report-name`, { method: 'POST', body: { where, ...(name && { name }) } }),
  // Push notifications in the apps (src/push on the server).
  pushSettings: () => request('/push/settings'),
  setPushSettings: (body) => request('/push/settings', { method: 'PUT', body }),
  pushRegister: (body) => request('/push/devices', { method: 'POST', body }),
  pushForget: (token) => request('/push/devices/forget', { method: 'POST', body: { token } }),
  roomInvitable: (code) => request(`/rooms/${encodeURIComponent(code)}/invitable`),
  roomInvite: (code, userId) => request(`/rooms/${encodeURIComponent(code)}/invite`, { method: 'POST', body: { user_id: userId } }),
  // Gift codes (src/giftCodes on the server; off until shared/giftCodes.json is switched on).
  redeemCode: (code) => request('/gift-codes/redeem', { method: 'POST', body: { code } }),
  myGiftCodes: () => request('/gift-codes/mine'),
  withdrawOrder: (orderNo) => request(`/payments/orders/${encodeURIComponent(orderNo)}/withdraw`, { method: 'POST', body: { confirm: true } }),
  // Seasons and the season pass (real money only: Stripe on the web, Google Play in the Android app).
  seasons: () => request('/seasons'),
  season: (key) => request(`/seasons/${encodeURIComponent(key)}`),
  passCheckout: (body) => request('/payments/pass/checkout', { method: 'POST', body }),
  // "Remind me when sales open" (before the pass's sale): a player { email_too }, a visitor { email, consent }.
  passRemind: (key, body) => request(`/seasons/${encodeURIComponent(key)}/remind`, { method: 'POST', body }),
  passRemindCancel: (key) => request(`/seasons/${encodeURIComponent(key)}/remind`, { method: 'DELETE' }),
  // The links in the reminder emails, and closing the in-game "on sale now" notice.
  passReminderConfirm: (token) => request('/seasons/reminders/confirm', { method: 'POST', body: { token }, token: null }),
  passReminderCancel: (token) => request('/seasons/reminders/cancel', { method: 'POST', body: { token }, token: null }),
  passReminderSeen: (key) => request(`/seasons/${encodeURIComponent(key)}/remind/seen`, { method: 'POST', body: {} }),
  // Forgot your password: on only when the server can send email.
  passwordResetEnabled: () => request('/auth/password-reset', { token: null }),
  forgotPassword: (email) => request('/auth/forgot', { method: 'POST', body: { email }, token: null }),
  resetPassword: (token, password) => request('/auth/reset', { method: 'POST', body: { token, password }, token: null }),
  // Account settings: news by email, the data download, deleting the account.
  emailStatus: () => request('/users/me/email'),
  // The country a player races for (src/country on the server).
  myCountry: () => request('/users/me/country'),
  setCountry: (country) => request('/users/me/country', { method: 'PUT', body: { country } }),
  countrySuggestion: () => request('/users/country-suggestion', { token: null }),
  countryRecords: (track) => request(`/scoreboard/countries?track=${encodeURIComponent(track)}`, { token: null }),
  countryRecordsOf: (code) => request(`/scoreboard/countries/${encodeURIComponent(code)}`, { token: null }),
  setNews: (on) => request('/users/me', { method: 'PATCH', body: { marketing_opt_in: on } }),
  unsubscribe: (u, t) => request('/users/unsubscribe', { method: 'POST', body: { u, t }, token: null }),
  deleteAccount: (body) => request('/users/me', { method: 'DELETE', body }),
  async exportData() {
    const res = await fetch(`${API_URL}/api/users/me/export`, { headers: { Authorization: `Bearer ${getStoredToken()}` } });
    if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({}))).error || 'Download failed');
    return res.blob();
  },
  order: (orderNo) => request(`/payments/orders/${encodeURIComponent(orderNo)}`),

  tracks: () => request('/tracks'),
  track: (idOrSlug) => request(`/tracks/${idOrSlug}`),

  showcase: () => request('/races/showcase'),
  races: (status, limit = 20) => request(`/races?${status ? `status=${status}&` : ''}limit=${limit}`),
  race: (id) => request(`/races/${id}`),
  createRace: (body) => request('/races', { method: 'POST', body }),
  joinRace: (id, marbleId) => request(`/races/${id}/join`, { method: 'POST', body: { marble_id: marbleId } }),
  leaveRace: (id) => request(`/races/${id}/join`, { method: 'DELETE' }),
  startRace: (id) => request(`/races/${id}/start`, { method: 'POST' }),
  cancelRace: (id) => request(`/races/${id}/cancel`, { method: 'POST' }),
  nextRace: (id, marbleId) => request(`/races/${id}/next`, { method: 'POST', body: marbleId ? { marble_id: marbleId } : {} }),
  results: (id) => request(`/races/${id}/results`),
  replay: (id) => request(`/races/${id}/replay`).then(nameLooks), // marbles named after the looks they wear
  // Friend rooms: a private race with friends, joined by a short code (marblespins.com/r/CODE).
  createRoom: (trackId) => request('/rooms', { method: 'POST', body: trackId ? { track_id: trackId } : {} }),
  room: (code) => request(`/rooms/${encodeURIComponent(code)}`),
  joinRoom: (code) => request(`/rooms/${encodeURIComponent(code)}/join`, { method: 'POST' }),
  leaveRoom: (code) => request(`/rooms/${encodeURIComponent(code)}/leave`, { method: 'POST' }),
  roomTrack: (code, trackId) => request(`/rooms/${encodeURIComponent(code)}/track`, { method: 'POST', body: trackId ? { track_id: trackId } : { random: true } }),
  roomRemove: (code, userId) => request(`/rooms/${encodeURIComponent(code)}/remove`, { method: 'POST', body: { user_id: userId } }),
  roomStart: (code) => request(`/rooms/${encodeURIComponent(code)}/start`, { method: 'POST' }),
  // The host's start timer: 30, 60 or 120 seconds; the server starts the race then (POST again: a new time).
  roomStartIn: (code, seconds) => request(`/rooms/${encodeURIComponent(code)}/start-in`, { method: 'POST', body: { seconds } }),
  roomStartInCancel: (code) => request(`/rooms/${encodeURIComponent(code)}/start-in/cancel`, { method: 'POST' }),
  roomClose: (code) => request(`/rooms/${encodeURIComponent(code)}/close`, { method: 'POST' }),
  setName: (name) => request('/users/me', { method: 'PATCH', body: { display_name: name } }),
  saveSettings: (settings) => request('/users/me/settings', { method: 'PUT', body: settings }),
  physicsPreview: (track, seed, level) => request(`/physics/preview?track=${encodeURIComponent(track)}&seed=${seed}&level=${level}`),
};
