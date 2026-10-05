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
    const details = data.details ? Object.entries(data.details).map(([k, v]) => `${k} ${v}`).join(', ') : '';
    throw new ApiError(res.status, details ? `${data.error}: ${details}` : data.error || res.statusText, data.details);
  }
  return data;
}

/** Endpoint helpers, grouped by resource. */
export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body, token: null }),
  login: (body) => request('/auth/login', { method: 'POST', body, token: null }),
  me: () => request('/auth/me'),

  user: (id) => request(`/users/${id}`),
  myProfile: () => request('/users/me'),
  userRaces: (id, limit = 10) => request(`/users/${id}/races?limit=${limit}`),
  trackRecords: (id) => request(`/users/${id}/track-records`),
  leaderboard: (sort = 'wins', limit = 10) => request(`/users/leaderboard?sort=${sort}&limit=${limit}`),

  marbles: () => request('/marbles'),
  myMarbles: () => request('/users/me/marbles'),
  purchaseMarble: (id) => request(`/marbles/${id}/purchase`, { method: 'POST' }),

  tracks: () => request('/tracks'),
  track: (idOrSlug) => request(`/tracks/${idOrSlug}`),

  races: (status, limit = 20) => request(`/races?${status ? `status=${status}&` : ''}limit=${limit}`),
  race: (id) => request(`/races/${id}`),
  createRace: (body) => request('/races', { method: 'POST', body }),
  joinRace: (id, marbleId) => request(`/races/${id}/join`, { method: 'POST', body: { marble_id: marbleId } }),
  leaveRace: (id) => request(`/races/${id}/join`, { method: 'DELETE' }),
  startRace: (id) => request(`/races/${id}/start`, { method: 'POST' }),
  cancelRace: (id) => request(`/races/${id}/cancel`, { method: 'POST' }),
  results: (id) => request(`/races/${id}/results`),
  replay: (id) => request(`/races/${id}/replay`),
  physicsTracks: () => request('/physics/tracks'),
  physicsPreview: (track, seed, level) => request(`/physics/preview?track=${encodeURIComponent(track)}&seed=${seed}&level=${level}`),
};
