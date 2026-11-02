// Guests only on a tap (Moses, 2 Nov 2026): a guest account is made when someone taps Play, Quick
// race, Race solo or joins a room, never when a /play/ page or a room link is merely opened (a shared
// link, a search engine, a link preview). /play/ and /r/ are blocked in robots.txt.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

let auth = { isAuthenticated: false, loading: false, playAsGuest: vi.fn(async () => {}) };
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => auth }));
const { RacerGate, openedDirectly, racerSource } = await import('../src/site/pages/RaceFlow');

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const gate = (entry) => renderToString(
  <MemoryRouter initialEntries={[entry]}>
    <Routes><Route path="*" element={<RacerGate><p>THE PAGE</p></RacerGate>} /></Routes>
  </MemoryRouter>,
);

describe('guests only on a tap', () => {
  it('a page opened directly asks for a tap first, and makes no guest', () => {
    auth = { isAuthenticated: false, loading: false, playAsGuest: vi.fn(async () => {}) };
    const room = gate('/r/ABCD');
    expect(room).toContain('JOIN THE ROOM');
    expect(room).not.toContain('THE PAGE');
    expect(gate('/play/quick')).toContain('PLAY NOW, FREE');
    expect(gate('/play/track')).toContain('Race solo');
    expect(gate('/play/friends')).toContain('Race with friends');
    expect(auth.playAsGuest).not.toHaveBeenCalled();
  });
  it('reached by a tap in the game (its own location key), or signed in: the page itself', () => {
    auth = { isAuthenticated: false, loading: false, playAsGuest: vi.fn(async () => {}) };
    expect(gate({ pathname: '/play/quick', key: 'k1' })).toContain('THE PAGE');
    auth = { isAuthenticated: true, loading: false, playAsGuest: vi.fn(async () => {}) };
    expect(gate('/r/ABCD')).toContain('THE PAGE');
  });
  it('what was tapped is sent with the new guest (the Dashboard funnel)', () => {
    expect(racerSource('/r/ABCD')).toBe('room');
    expect(racerSource('/play/quick')).toBe('quick');
    expect(racerSource('/play/start')).toBe('quick');
    expect(racerSource('/play/friends')).toBe('friends');
    expect(racerSource('/play/track')).toBe('solo');
    expect(openedDirectly({ key: 'default' })).toBe(true);
    expect(openedDirectly({ key: 'x7' })).toBe(false);
    expect(src('src/api/client.js')).toContain("guest: (source) => request('/auth/guest', { method: 'POST', token: null, body: source ? { source } : {} })");
    const app = src('src/App.jsx');
    for (const r of ['/play/friends', '/play/track', '/play/shooter', '/play/start', '/play/quick', '/r/:code']) {
      expect(app).toMatch(new RegExp(`path="${r.replace(/[/:]/g, (c) => `\\${c}`)}" element=\\{<RacerGate>`));
    }
  });
  it('robots.txt blocks /play/ and /r/; the race view reports GO once', () => {
    const robots = src('public/robots.txt');
    expect(robots).toMatch(/^Disallow: \/play\/$/m);
    expect(robots).toMatch(/^Disallow: \/r\/$/m);
    expect(src('src/components/LiveRaceViewer3D.jsx')).toContain('sawGo()');
  });
});
