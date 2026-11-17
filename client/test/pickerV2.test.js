// The track picker's new order (Moses, 16 Nov 2026, /preview/picker-v2): racable tracks first, then the locked ones
// mixed across the series, with a pack banner where they start, after 7 rows, after 7 more and at the end, each
// for a different complete pack the player doesn't own; with TRACK_PACKS off nothing changes.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bannerPacks, bannerSlots, mixLocked, orderTracks } from '../src/site/pages/pickerV2';

const byName = (a, b) => a.name.localeCompare(b.name);
const track = (name, pack, extra = {}) => ({ name, slug: name, pack: pack && { key: pack, name: pack, complete: true }, ...extra });

describe('picker v2', () => {

  it('racable first, then the locked ones taking turns by pack (never a block of one series)', () => {
    const tracks = [
      track('p1', 'peaks', { locked: true }), track('p2', 'peaks', { locked: true }), track('p3', 'peaks', { locked: true }),
      track('c1', 'canyons', { locked: true }), track('c2', 'canyons', { locked: true }), track('r1', 'rivers'), track('f1', null),
    ];
    const { free, locked } = orderTracks(tracks, byName);
    expect(free.map((t) => t.name)).toEqual(['f1', 'r1']);
    expect(locked.map((t) => t.name)).toEqual(['c1', 'p1', 'c2', 'p2', 'p3']);
    expect(mixLocked([], byName)).toEqual([]);
  });

  it('banners: where the locked tracks start, after 7 rows, after 7 more, at the end; at most one per pack', () => {
    expect(bannerSlots(100, 3, 6)).toEqual([0, 21, 42, 100]);
    expect(bannerSlots(100, 3, 2)).toEqual([0, 21]);
    expect(bannerSlots(30, 3, 6)).toEqual([0, 21, 30]);
    expect(bannerSlots(22, 3, 6)).toEqual([0, 21]); // (one card after the 7-row banner: no end banner straight after)
    expect(bannerSlots(5, 3, 6)).toEqual([0, 5]);
    expect(bannerSlots(0, 3, 6)).toEqual([]);
  });

  it('banner packs: complete, not owned, each once; the first locked card\'s pack first', () => {
    const packs = [
      { key: 'rivers', complete: true, owned: false }, { key: 'peaks', complete: true, owned: false },
      { key: 'canyons', complete: true, owned: true }, { key: 'arcade', complete: false, owned: false }, { key: 'pinball', complete: true },
    ];
    const locked = [track('x', 'peaks'), track('y', 'rivers')];
    expect(bannerPacks(packs, locked).map((p) => p.key)).toEqual(['peaks', 'rivers', 'pinball']);
  });

  it('live since 17 Nov 2026: /play/track is the v2 picker; the old preview link lands on it', () => {
    const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
    expect(app).toMatch(/path="\/play\/track" element=\{<RacerGate><TrackStep \/><\/RacerGate>\}/);
    expect(app).toMatch(/path="\/preview\/picker-v2" element=\{<Navigate to="\/play\/track" replace \/>\}/);
    expect(app).not.toMatch(/PickerV2Preview/);
    const flow = readFileSync(new URL('../src/site/pages/RaceFlow.jsx', import.meta.url), 'utf8');
    expect(flow).not.toMatch(/TrackStep\(\{|asLocked/);
  });
});
