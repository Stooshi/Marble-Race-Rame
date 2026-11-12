// The track picker's lock buttons (Moses, 12 Nov 2026): "My tracks" and "Locked" next to the wildness
// filter (and working with it), only while pack tracks lock for the player (the server's TRACK_PACKS, sent
// as packLocking), "My tracks" by default. My tracks: free tracks, packs the player owns, Coming soon packs (they lock
// nothing). A locked track shows the lock and its pack, and a tap opens the pack's page in the shop.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const TRACKS = [
  { id: 1, slug: 'lisbon-cube-hills', name: 'Lisbon Cube Hills', series: 'Blocks', is_active: true, wildness: 'wild', created_at: '2026-10-01', pack: { key: 'blocks-2', name: 'Blocks 2', complete: true }, is_free: true },
  { id: 2, slug: 'venice-cube-canals', name: 'Venice Cube Canals', series: 'Blocks', is_active: true, wildness: 'extreme', created_at: '2026-10-02', pack: { key: 'blocks-2', name: 'Blocks 2', complete: true }, is_free: false, locked: true, lockedBy: 'pack' },
  { id: 3, slug: 'kill-screen', name: 'Kill Screen', series: 'Arcade', is_active: true, wildness: 'extreme', created_at: '2026-10-03', pack: { key: 'arcade', name: 'Arcade', complete: false }, is_free: false },
];
const state = vi.hoisted(() => ({ packLocking: true }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, loading: false, user: { id: 7, username: 'moses' }, playAsGuest: async () => {} }) }));
vi.mock('../src/sound/settings', () => ({ useRaceSoundPreload: () => {} }));
vi.mock('../src/hooks/useAsync', () => ({
  useAsync: (fn) => (String(fn).includes('tracks()') ? { data: { tracks: TRACKS, packLocking: state.packLocking }, error: null } : { data: null, error: null, reload: async () => {} }),
}));
const { TrackStep, LOCK_FILTERS, matchesLock } = await import('../src/site/pages/RaceFlow');
const picker = () => renderToString(<MemoryRouter initialEntries={['/play/track']}><Routes><Route path="*" element={<TrackStep />} /></Routes></MemoryRouter>).replace(/<!-- -->/g, '');

describe('the lock filter', () => {
  it('My tracks and Locked; My tracks keeps free, owned and Coming soon pack tracks', () => {
    expect(LOCK_FILTERS.map(([, l]) => l)).toEqual(['My tracks', 'Locked']);
    expect(TRACKS.filter((t) => matchesLock(t, 'mine')).map((t) => t.slug)).toEqual(['lisbon-cube-hills', 'kill-screen']);
    expect(TRACKS.filter((t) => matchesLock(t, 'locked')).map((t) => t.slug)).toEqual(['venice-cube-canals']);
    expect(TRACKS.filter((t) => matchesLock(t, 'all'))).toHaveLength(3);
  });

  it('while packs lock for the player: shown next to the wildness filter, My tracks by default', () => {
    state.packLocking = true;
    const html = picker();
    expect(html).toContain('aria-label="My tracks or locked"');
    expect(html).toMatch(/aria-pressed="true">My tracks <span[^>]*>2<\/span>/);
    const group = html.split('aria-label="My tracks or locked">')[1].split('</div>')[0];
    expect(group.match(/<button/g)).toHaveLength(2); // (two buttons, no All)
    expect(html).toMatch(/🔒 Locked <span[^>]*>1<\/span>/);
    expect(html).toContain('Lisbon Cube Hills');
    expect(html).toContain('Kill Screen');
    expect(html).not.toContain('Venice Cube Canals'); // (locked: under Locked)
  });

  it('works with the wildness filter: both apply', () => {
    expect(TRACKS.filter((t) => matchesLock(t, 'mine') && t.wildness === 'extreme').map((t) => t.slug)).toEqual(['kill-screen']);
    expect(readFileSync(new URL('../src/site/pages/RaceFlow.jsx', import.meta.url), 'utf8')).toMatch(/\.filter\(\(t\) => matchesWildness\(t, wild\)\)\n\s*\.filter\(\(t\) => matchesLock\(t, lock\)\)/);
  });

  it('with TRACK_PACKS off for the player: no filter, every track shown', () => {
    state.packLocking = false;
    const html = picker();
    expect(html).not.toContain('My tracks or locked');
    expect(html).not.toContain('My tracks');
    for (const t of TRACKS) expect(html).toContain(t.name);
  });
});
