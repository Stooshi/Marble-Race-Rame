// The solo starting line's track (Moses, 8 Nov 2026, iPhone): a tap on a track in "Other players liked" picks it
// for the race, the same as "Change track", and the screen says which track the race is on right above
// START THE RACE (on a phone the picture at the top is off screen by then). The yellow border means picked:
// no hover border on touch screens, where it stuck after a tap and looked like a pick.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const TRACKS = [
  { id: 1, slug: 'zurich', name: 'Zurich Run', series: 'World Tour', biome: 'snow', is_active: true },
  { id: 2, slug: 'abraham-lake-frost', name: 'Abraham Lake Frost', series: 'World Tour', biome: 'snow', is_active: true },
  { id: 3, slug: 'ha-long-bay-spins', name: 'Ha Long Bay Spins', series: 'Coasters', biome: 'tropical', is_active: true },
  { id: 4, slug: 'sahara-marble-grand-prix', name: 'Sahara Marble Grand Prix', series: 'Grand Prix', biome: 'desert', is_active: true },
];
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, loading: false, user: { id: 7, username: 'moses' }, playAsGuest: async () => {} }) }));
vi.mock('../src/sound/settings', () => ({ useRaceSoundPreload: () => {} }));
vi.mock('../src/hooks/useAsync', () => ({
  useAsync: (fn) => {
    const s = String(fn);
    if (s.includes('popularTracks')) return { data: { tracks: TRACKS.map((t) => ({ slug: t.slug })) }, error: null };
    if (s.includes('tracks()')) return { data: { tracks: TRACKS }, error: null };
    return { data: null, error: null, reload: async () => {} };
  },
}));
const { StartStep, OthersLiked } = await import('../src/site/pages/RaceFlow');

const page = (url) => renderToString(
  <MemoryRouter initialEntries={[{ pathname: '/play/start', search: url, key: 'k1' }]}>
    <Routes><Route path="*" element={<StartStep />} /></Routes>
  </MemoryRouter>,
);
const aside = (html) => html.slice(html.indexOf('The starting line'));
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

describe('the solo starting line: the track the race is on', () => {
  it('shows the picked track by name right above START THE RACE', () => {
    const html = aside(page('?track=abraham-lake-frost'));
    const name = html.indexOf('ms-start-track__name');
    expect(name).toBeGreaterThan(-1);
    expect(html.slice(name, html.indexOf('START THE RACE'))).toContain('Abraham Lake Frost');
    expect(html.indexOf('ms-start-track')).toBeLessThan(html.indexOf('START THE RACE'));
  });
  it('a different track in the address (as a tap in "Other players liked" leaves it) shows that track instead', () => {
    const html = aside(page('?track=ha-long-bay-spins'));
    expect(html.slice(html.indexOf('ms-start-track__name'), html.indexOf('START THE RACE'))).toContain('Ha Long Bay Spins');
    expect(html.slice(html.indexOf('ms-start-track__name'), html.indexOf('START THE RACE'))).not.toContain('Abraham Lake Frost');
  });
  it('no track picked: Random track', () => {
    expect(aside(page('')).slice(0, aside(page('')).indexOf('START THE RACE'))).toContain('Random track');
  });
  it('the thumbnails: the track just raced left out, none pressed until one is picked; a tap picks its slug', () => {
    const html = renderToString(<MemoryRouter><OthersLiked tracks={TRACKS} current="zurich" onPick={() => {}} /></MemoryRouter>);
    expect(html).toContain('Abraham Lake Frost');
    expect(html).not.toContain('Zurich Run');
    expect(html).not.toContain('aria-pressed="true"');
    const rf = src('src/site/pages/RaceFlow.jsx');
    expect(rf).toContain('aria-pressed={t.slug === current} onClick={() => onPick(t.slug)}');
    // (StartStep's pick sets ?track=, which START THE RACE sends as the race's track.)
    expect(rf).toContain("onPick={(slug) => { const n = new URLSearchParams(search); n.set('track', slug); setSearch(n, { replace: true }); }}");
    expect(rf).toContain('...(track ? { track_id: track.id }');
  });
  it('no hover border on touch screens; taps are not delayed', () => {
    const css = src('src/site/site.css');
    expect(css).toMatch(/@media \(hover: hover\) \{ \.ms-liked__card:hover \.ms-liked__pic/);
    expect(css).not.toMatch(/^\.ms-liked__card:hover/m);
    expect(css).toMatch(/\.ms-liked__card \{[^}]*touch-action: manipulation/);
  });
});
