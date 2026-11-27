// The floor check (Moses, 25 Oct 2026: on an iPhone a hole in Wadi Mujib Burst's floor at 36 s, the
// supports showing through): the drawn channel is whole, its floor, its walls and its rims, on every
// track, as a phone and a computer draw it, and nothing cut away while racing touches it. Two causes
// found and fixed: the finish canopy's cutaway was open at the top (a stretch passing high over a
// coaster's station lost its floor on phones), and every splitter had a slit along the middle where
// it opens and closes. Looks only: the race never reads the drawn channel.
import { createRequire } from 'node:module';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { buildIceChannelGeometry, channelDetail, channelOf, channelPieces, channelPieceSize } from '../src/three/iceChannel';
import { stationOf, stationRoof } from '../src/three/scenery/coaster';
import { CUT_ABOVE, finishCutaway } from '../src/three/TrackScene';
import { floorHoles, holeStretches } from '../src/three/floorCheck';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS, physicsTrack } = require('../../src/game/physicsTracks');

const built = (t, lite) => {
  const centerline = buildCenterline(t);
  const channel = channelOf(t, centerline);
  const geometry = buildIceChannelGeometry(centerline, channel, channelDetail(t, channel, lite));
  const kit = t.physics.kit;
  // (A coaster's station canopy, but Track and Field's: it finishes at a finish line instead.)
  const roof = kit?.coaster && !kit.athletics ? stationRoof(stationOf(centerline)) : null;
  return { centerline, channel, geometry, roof, rimWidth: channel.look === 'street' ? 3 : 0.45, pieces: channelPieces(geometry, channelPieceSize(t, lite)) };
};
const holesOf = (b, cut = finishCutaway(b.roof)) => floorHoles(b.centerline, b.channel, b.geometry, { pieces: b.pieces, cut, rimWidth: b.rimWidth });
const describeHoles = (slug, holes) => holeStretches(holes).slice(0, 3).map((x) => `${slug} ${Math.round(x.from)}–${Math.round(x.to)} m: ${x.why} (${x.parts.join(', ')})`);

describe('the floor check', () => {
  it('covers every track (the live series, the holiday tracks, the Rivers, the kit\'s test tracks)', () => {
    expect(PHYSICS_TRACKS.length).toBeGreaterThan(200);
    for (const slug of ['wadi-mujib-burst', 'harbin-ice-city', 'yangtze-lock-run', 'are-run', 'bobsleigh-run']) expect(PHYSICS_TRACKS.map((t) => t.slug)).toContain(slug);
  });

  it('finds the cutaway open at the top (Wadi Mujib Burst at about 625 m, the stretch over the station)', () => {
    const b = built(physicsTrack('wadi-mujib-burst'), true);
    const open = finishCutaway({ ...b.roof, top: Infinity });
    const found = holesOf(b, open).filter((h) => h.why === 'cut');
    expect(found.length).toBeGreaterThan(5);
    expect(found.every((h) => h.at > 600 && h.at < 650)).toBe(true);
    expect(holesOf(b)).toEqual([]);
    // (Bounded: everything over the canopy but the boards on it stays.)
    expect(finishCutaway(b.roof).top).toBe(b.roof.top + CUT_ABOVE);
  });

  it('finds a segment missing from the drawing', () => {
    const b = built(physicsTrack('are-run'), true);
    const pos = b.geometry.getAttribute('position').array;
    const starts = b.geometry.userData.segmentStarts;
    const [from, to] = [starts[300], starts[301]];
    const holed = new Float32Array([...pos.slice(0, from * 3), ...pos.slice(to * 3)]);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(holed, 3));
    g.userData.segmentStarts = starts.map((v, i) => (i <= 300 ? v : v - (to - from)));
    const found = floorHoles(b.centerline, b.channel, g, { rimWidth: b.rimWidth });
    expect(found.length).toBeGreaterThan(5);
    const step = b.channel.arc / b.centerline.segments;
    for (const h of found) expect(Math.abs(h.at - 300.5 * step)).toBeLessThan(step * 1.01);
  });

  for (const [screen, lite] of [['phone', true], ['computer', false]]) {
    it(`${screen}: no hole in any channel's floor, walls or rims, and nothing cut away from it while racing`, () => {
      const bad = [];
      for (const t of PHYSICS_TRACKS) {
        const holes = holesOf(built(t, lite));
        if (holes.length) bad.push(...describeHoles(t.slug, holes));
      }
      expect(bad).toEqual([]);
    }, 300_000);
  }
});
