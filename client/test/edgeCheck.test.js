// The edge check (Moses, 21 Oct 2026): nothing drawn along the rims crosses into the running
// surface. On every track with an ice channel the rim never folds back over the floor, and on every
// coaster track (phone and computer) the rails follow the rim round the bends. Looks only: the race
// never reads either (the physics' walls are the channel's lip angle).
import { createRequire } from 'node:module';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf, channelLipAt, channelRadiusAt } from '../src/three/iceChannel';
import { railCrossings, rimCrossings } from '../src/three/edgeCheck';
import { coasterRails } from '../src/three/scenery/coaster';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');

const channelTracks = PHYSICS_TRACKS.filter((t) => t.physics.channel);
const coasterTracks = channelTracks.filter((t) => t.physics.kit?.coaster);
const where = (t, found) => found.slice(0, 3).map((f) => `${t.slug} at ${Math.round(f.s)} m (${f.depth.toFixed(2)} m over the floor)`);

describe('the edge check', () => {
  it('covers the coaster tracks (the live series, the holiday tracks, the Rivers)', () => {
    expect(coasterTracks.length).toBeGreaterThan(60);
    for (const slug of ['beijing-nest-200', 'medellin-lights', 'danube-night-run', 'pyramid-run']) expect(coasterTracks.map((t) => t.slug)).toContain(slug);
  });

  it('finds rail pieces that cut a bend over the floor (the old 12 m pieces on Beijing Nest 200\'s hairpin)', () => {
    const t = coasterTracks.find((x) => x.slug === 'beijing-nest-200');
    const c = buildCenterline(t);
    const ch = channelOf(t, c);
    const step = ch.arc / c.segments;
    const UP = new Vector3(0, 1, 0);
    const straight = [1, -1].map((sign) => {
      const line = [];
      for (let i = 0; i <= c.segments; i += 6) {
        const s = c.samples[i];
        const side = new Vector3(s.side.x, 0, s.side.z).normalize();
        const R = channelRadiusAt(ch, i * step);
        const lip = channelLipAt(ch, i * step);
        line.push(s.pos.clone().addScaledVector(side, sign * (R * Math.sin(lip) + 0.225)).addScaledVector(UP, R * (1 - Math.cos(lip)) + 0.2));
      }
      return line;
    });
    expect(railCrossings(c, ch, straight).length).toBeGreaterThan(10);
  });

  it('no channel rim folds back over the floor, on any track', () => {
    const bad = channelTracks.flatMap((t) => {
      const c = buildCenterline(t);
      return where(t, rimCrossings(c, channelOf(t, c)));
    });
    expect(bad).toEqual([]);
  }, 120000);

  it('every coaster\'s rails follow the rim, on a phone and on a computer', () => {
    const bad = coasterTracks.flatMap((t) => {
      const c = buildCenterline(t);
      const ch = channelOf(t, c);
      return [true, false].flatMap((lite) => where(t, railCrossings(c, ch, coasterRails(c, ch, { lite }))).map((w) => `${w}${lite ? ' (phone)' : ''}`));
    });
    expect(bad).toEqual([]);
  }, 120000);
});
