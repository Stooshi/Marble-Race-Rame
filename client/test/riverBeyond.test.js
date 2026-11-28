// The Rivers: the river runs on past the start and the finish (Moses, 25 Oct 2026, option B after the
// Nile's review: "unclear how the waterways connect"; it began at the start and stopped at the line).
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { makeRiver } from '../src/three/scenery/river';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');
const rivers = PHYSICS_TRACKS.filter((t) => t.physics.kit?.river && !t.slug.startsWith('variety-'));

describe('the river past the ends of the track', () => {
  it('covers the fifteen Rivers', () => {
    expect(rivers.length).toBeGreaterThanOrEqual(15);
  });
  for (const t of rivers) {
    it(`${t.slug}: water beyond the finish (and beyond the start where the river runs by it)`, () => {
      const c = buildCenterline(t);
      const ch = channelOf(t, c);
      const xs = c.samples.map((s) => s.pos.x);
      const zs = c.samples.map((s) => s.pos.z);
      const bounds = { minX: Math.min(...xs) - 480, maxX: Math.max(...xs) + 480, minZ: Math.min(...zs) - 480, maxZ: Math.max(...zs) + 480 };
      const river = makeRiver(c, ch, t.physics.kit, { flight: null, liftAt: () => 0, bounds });
      const water = river.riverTriangles({ lite: true });
      const beyond = (i, sign) => {
        const s = c.samples[i];
        const l = Math.hypot(s.tangent.x, s.tangent.z);
        let far = 0;
        for (let k = 0; k < water.pos.length; k += 3) {
          const along = ((water.pos[k] - s.pos.x) * s.tangent.x + (water.pos[k + 2] - s.pos.z) * s.tangent.z) / l;
          far = Math.max(far, sign * along);
        }
        return far;
      };
      const ends = [[c.segments, 1], [0, -1]].filter(([i]) => river.halfAt(i) > 2);
      expect(ends.length).toBeGreaterThan(0);
      for (const [i, sign] of ends) expect(beyond(i, sign)).toBeGreaterThan(200);
    });
  }
});
