// Wildness (Moses, 11 Nov 2026): a badge on every track card (Easy teal, Wild orange, Extreme magenta,
// always with the word), the All / Easy / Wild / Extreme filter and "Wildest" order in the track picker,
// the "luck, not skill" note, and difficulty no longer shown anywhere. Track packs: a pack-locked track
// (only with the server's TRACK_PACKS switch on) shows its pack and opens its page in the shop.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import WildnessBadge from '../src/site/WildnessBadge';
import { WILDNESS, WILDNESS_NOTE, matchesWildness, wildnessOf } from '../src/shared/wildness.js';

const TRACKS = [
  { id: 1, slug: 'tilt', name: 'Tilt', series: 'Pinball', is_active: true, wildness: 'easy', wildness_score: 30, created_at: '2026-10-01' },
  { id: 2, slug: 'kill-screen', name: 'Kill Screen', series: 'Arcade', is_active: true, wildness: 'wild', wildness_score: 44, created_at: '2026-10-02' },
  { id: 3, slug: 'san-francisco', name: 'San Francisco', series: 'World Tour', is_active: true, wildness: 'extreme', wildness_score: 66, created_at: '2026-09-01' },
  { id: 4, slug: 'grand-champion', name: 'Grand Champion', series: 'Pinball', is_active: true, wildness: 'extreme', wildness_score: 52, created_at: '2026-10-03', pack: { key: 'pinball', name: 'Pinball' }, is_free: false, locked: true, lockedBy: 'pack' },
];
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, loading: false, user: { id: 7, username: 'moses' }, playAsGuest: async () => {} }) }));
vi.mock('../src/sound/settings', () => ({ useRaceSoundPreload: () => {} }));
vi.mock('../src/hooks/useAsync', () => ({
  useAsync: (fn) => (String(fn).includes('tracks()') ? { data: { tracks: TRACKS }, error: null } : { data: null, error: null, reload: async () => {} }),
}));
const { TrackStep, SORTS } = await import('../src/site/pages/RaceFlow');

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const picker = () => renderToString(<MemoryRouter initialEntries={['/play/track']}><Routes><Route path="*" element={<TrackStep />} /></Routes></MemoryRouter>);

describe('the wildness badge', () => {
  it('shows the word and its waves for each level, in its own colour class', () => {
    for (const [level, w] of Object.entries(WILDNESS)) {
      const html = renderToString(<WildnessBadge track={{ wildness: level }} />);
      expect(html).toContain(`ms-wild--${level}`);
      expect(html).toContain(w.word);
      expect(html.match(/<path/g)).toHaveLength(w.waves);
      expect(html).toContain("luck, not skill");
    }
  });
  it('shows nothing for a track without wildness (or an old difficulty word)', () => {
    expect(renderToString(<WildnessBadge track={{ difficulty: 'extreme' }} />)).toBe('');
    expect(wildnessOf({ wildness: 'hard' })).toBeNull();
  });
  it('the colours: teal, orange, magenta; never red or green', () => {
    const css = src('src/site/site.css');
    expect(css).toMatch(/\.ms-wild--easy \{ color: var\(--ms-wild-easy\)/);
    expect(css).toMatch(/--ms-wild-easy: #3CC7C2/);
    expect(css).toMatch(/--ms-wild-extreme: #F05BC8/);
    expect(css).not.toMatch(/\.ms-wild--\w+ \{ color: var\(--ms-(red|green)\)/);
  });
});

describe('the track picker', () => {
  it('has the All / Easy / Wild / Extreme filter with counts, the note, and a badge on every card', () => {
    const html = picker();
    expect(html).toContain('aria-label="Wildness"');
    for (const w of ['All', 'Easy', 'Wild', 'Extreme']) expect(html).toMatch(new RegExp(`>${w}<!-- --> <span`));
    expect(html).toContain(WILDNESS_NOTE.replace(/'/g, '&#x27;'));
    expect(html.match(/class="ms-wild ms-wild--/g)).toHaveLength(TRACKS.length);
  });
  it('the filter keeps a level only; All keeps everything', () => {
    expect(TRACKS.filter((t) => matchesWildness(t, 'extreme')).map((t) => t.slug)).toEqual(['san-francisco', 'grand-champion']);
    expect(TRACKS.filter((t) => matchesWildness(t, 'all'))).toHaveLength(4);
  });
  it('"Wildest" orders by the score, wildest first', () => {
    expect([...TRACKS].sort(SORTS.wild).map((t) => t.slug)).toEqual(['san-francisco', 'grand-champion', 'kill-screen', 'tilt']);
  });
  it('a pack-locked track shows its pack and opens the pack\'s page in the shop, not a race (12 Nov 2026)', () => {
    const html = picker();
    expect(html).toContain('Locked: in the Pinball pack');
    expect(src('src/site/pages/RaceFlow.jsx')).toContain("onClick={() => (t.lockedBy === 'pack' ? navigate(`/shop/packs/${t.pack.key}`) :");
  });
});

describe('difficulty is no longer shown', () => {
  it('no page or component shows tracks.difficulty', () => {
    for (const f of ['src/components/StartShow.jsx', 'src/components/TrackSelector.jsx', 'src/components/StatsDisplay.jsx', 'src/components/RaceList.jsx',
      'src/pages/TrackPreview3D.jsx', 'src/pages/Race.jsx', 'src/pages/Results.jsx', 'src/site/pages/RaceFlow.jsx', 'src/site/pages/TrackPages.jsx']) {
      expect(src(f), f).not.toMatch(/\.difficulty\b/);
    }
  });
});
